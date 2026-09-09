const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../docs/app.js');

const root = path.resolve(__dirname, '..');
const fixturesDir = path.join(__dirname, 'fixtures');

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, fileName), 'utf8'));
}

function sha256Fixture(fileName) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(fixturesDir, fileName))).digest('hex');
}

test('exact four ring labels are preserved', function () {
  const rings = app.FALLBACK_DATA.chains.rings;
  assert.deepEqual(rings, ['Type I', 'Type II (including IIG)', 'Type III', 'Type IV']);
});

test('flow lineage keeps host tree and R-M detection on the corrected scientific graph', function () {
  const lineage = app.buildStageLineage(app.FALLBACK_DATA.chains);
  assert.deepEqual(lineage['host-tree'].incoming, ['alignments']);
  assert.deepEqual(lineage['rm-detection'].incoming, ['proteomes']);
  assert.deepEqual(lineage.review.incoming, ['rm-detection']);
  assert.deepEqual(lineage.rings.incoming.sort(), ['host-tree', 'review']);
  assert.equal(lineage['host-tree'].outgoing.includes('rm-detection'), false);
  assert.equal(lineage['rm-detection'].outgoing.includes('host-tree'), false);
  assert.equal(lineage.review.incoming.includes('host-tree'), false);
});

test('fallback data matches seeded JSON files exactly', function () {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'data', 'registry.json'), 'utf8'));
  const chains = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'data', 'chains.json'), 'utf8'));
  const observations = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'evidence', 'parent-observations.json'), 'utf8'));

  assert.deepEqual(app.FALLBACK_DATA.registry, registry);
  assert.deepEqual(app.FALLBACK_DATA.chains, chains);
  assert.deepEqual(app.FALLBACK_DATA.evidence, observations);
});

test('observation records stay distinct from probe receipts', function () {
  const observation = app.FALLBACK_DATA.evidence.observations[0];
  assert.equal(observation.kind, 'observation-record');
  assert.ok(Object.hasOwn(observation, 'probeTimestamp'));
  assert.ok(Object.hasOwn(observation, 'recordedAt'));
  assert.equal(Object.hasOwn(observation, 'review'), false);
});

test('valid measured receipts accept bare and sha256-prefixed 64-hex digests and import as unverified', function () {
  ['valid-receipt.json', 'valid-prefixed-hash-receipt.json', 'valid-not-measured-receipt.json'].forEach(function (fixtureName) {
    const receipt = readJson(fixtureName);
    const verdict = app.validateReceipt(receipt);
    assert.equal(verdict.valid, true, fixtureName + ' should be valid');

    const imported = app.importReceiptText(JSON.stringify(receipt));
    assert.equal(imported.length, 1);
    assert.equal(imported[0].review.verified, false);
    assert.equal(imported[0].importStatus, 'UNVERIFIED_IMPORTED');
  });
});

test('synthetic measured receipt fixtures use hashes computed from explicit synthetic payloads', function () {
  const expectedGithubHash = sha256Fixture('synthetic-github-cli-payload.txt');
  const bare = readJson('valid-receipt.json');
  const prefixed = readJson('valid-prefixed-hash-receipt.json');

  assert.equal(bare.evidence.sha256, expectedGithubHash);
  assert.equal(prefixed.evidence.sha256, 'sha256:' + expectedGithubHash);
  assert.equal(bare.evidence.location, 'tests/fixtures/synthetic-github-cli-payload.txt');
  assert.equal(prefixed.evidence.location, 'tests/fixtures/synthetic-github-cli-payload.txt');
});

test('malicious HTML, unknown state, missing exit code, invalid hashes, and status/exit inconsistencies are rejected', function () {
  [
    'malicious-html-receipt.json',
    'unknown-state-receipt.json',
    'missing-exitcode-receipt.json',
    'missing-hash-receipt.json',
    'invalid-sha-format-receipt.json',
    'not-measured-with-hash-receipt.json',
    'missing-hash-status-receipt.json',
    'bogus-short-hash-receipt.json',
    'status-exit-inconsistency-receipt.json',
    'failed-zero-exit-receipt.json',
    'invalid-date-receipt.json',
    'impossible-date-receipt.json',
    'not-detected-nonzero-exit-receipt.json'
  ].forEach(function (name) {
    const verdict = app.validateReceipt(readJson(name));
    assert.equal(verdict.valid, false, name + ' should be invalid');
  });
});

test('FAILED and UNKNOWN classifications are never remapped to NOT_DETECTED', function () {
  const failed = app.normalizeImportedReceipt({
    ...readJson('valid-receipt.json'),
    result: { classification: 'FAILED', exitCode: 1 }
  });
  const unknown = app.normalizeImportedReceipt({
    ...readJson('valid-not-measured-receipt.json'),
    result: { classification: 'UNKNOWN', exitCode: 404 }
  });

  assert.equal(failed.result.classification, 'FAILED');
  assert.equal(unknown.result.classification, 'UNKNOWN');
  assert.notEqual(failed.result.classification, 'NOT_DETECTED');
  assert.notEqual(unknown.result.classification, 'NOT_DETECTED');
});

test('request confirmation creates REQUESTED artifacts without execution or verification', function () {
  assert.throws(function () {
    app.createRequestArtifact({ toolId: 'github-cli', stageId: 'review', summary: 'x', justification: 'y', confirmed: false });
  }, /Confirmation is required/);

  const artifact = app.createRequestArtifact({
    toolId: 'github-cli',
    stageId: 'review',
    summary: 'Review the historical GitHub CLI read evidence',
    justification: 'A reviewer should inspect the receipt out of band.',
    confirmed: true
  });

  assert.equal(artifact.status, 'REQUESTED');
  assert.equal(artifact.verified, false);
  assert.equal(artifact.execution, null);
});

test('registry filtering supports search, state, and stage', function () {
  const entries = app.FALLBACK_DATA.registry.entries;
  const stateMatch = app.filterRegistry(entries, { search: '', state: 'PROBED', stage: 'ALL' });
  assert.ok(stateMatch.some(function (entry) { return entry.id === 'bionemo-nim'; }));

  const queryMatch = app.filterRegistry(entries, { search: 'Tool not found', state: 'ALL', stage: 'ALL' });
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'smarts-bio');

  const stageMatch = app.filterRegistry(entries, { search: '', state: 'ALL', stage: 'rm-detection' });
  assert.deepEqual(stageMatch.map(function (entry) { return entry.id; }).sort(), ['defensefinder', 'rebase']);
});

test('CSV export escapes spreadsheet formulas safely including leading whitespace controls', function () {
  const csv = app.recordsToCsv([
    { summary: '=2+3', toolId: 'github-cli' },
    { summary: ' +SUM(A1:A2)', toolId: 'rdc' },
    { summary: '\t@malicious', toolId: 'smarts-bio' },
    { summary: '\n-2+4', toolId: 'wsl-ubuntu' },
    { summary: '\r=cmd()', toolId: 'codex-cli-session' }
  ], [
    { key: 'toolId', label: 'toolId' },
    { key: 'summary', label: 'summary' }
  ]);

  assert.match(csv, /'=2\+3/);
  assert.match(csv, /' \+SUM\(A1:A2\)/);
  assert.match(csv, /'\t@malicious/);
  assert.match(csv, /"'\n-2\+4"/);
  assert.match(csv, /"'\r=cmd\(\)"/);
});

test('local probe creation reuses registry contracts and supports explicit not_measured hashes', function () {
  const registryMap = Object.fromEntries(app.FALLBACK_DATA.registry.entries.map(function (entry) {
    return [entry.id, entry];
  }));
  const receipt = app.createProbeReceipt({
    toolId: 'smarts-bio',
    state: 'PROBED',
    classification: 'UNKNOWN',
    summary: 'Synthetic software-only receipt describing a catalogue mismatch.',
    evidenceLocation: 'tests/fixtures/software-only-note.txt',
    exitCode: 404,
    hashStatus: 'not_measured',
    hashSha256: ''
  }, registryMap);

  assert.equal(receipt.review.verified, false);
  assert.equal(receipt.inputContract, registryMap['smarts-bio'].inputContract);
  assert.equal(receipt.outputContract, registryMap['smarts-bio'].outputContract);
  assert.equal(receipt.evidence.hashStatus, 'not_measured');
  assert.equal(receipt.evidence.sha256, null);
});

test('historical assertions keep null probe timestamps unless exact timing is known and never claim verification', function () {
  const observations = app.FALLBACK_DATA.evidence.observations;
  const narrativeOnly = observations.filter(function (observation) {
    return observation.recordType === 'historical-assertion';
  });
  assert.ok(narrativeOnly.length > 0);
  narrativeOnly.forEach(function (observation) {
    assert.equal(observation.probeTimestamp, null);
    assert.ok(Object.hasOwn(observation, 'recordedAt'));
    assert.equal(observation.historicalStatus, 'UNVERIFIED');
  });

  const github = observations.find(function (observation) {
    return observation.id === 'obs-gh-auth';
  });
  const codex = observations.find(function (observation) {
    return observation.id === 'obs-codex-review-complete';
  });
  const nativeSites = app.FALLBACK_DATA.registry.entries.find(function (entry) {
    return entry.id === 'native-chatgpt-sites';
  });
  assert.equal(github.probeTimestamp, '2026-09-09T14:21:19.3399192Z');
  assert.ok(codex);
  assert.equal(codex.probeTimestamp, null);
  assert.match(codex.summary, /zero tests run by codex/i);
  assert.equal(nativeSites.state, 'BLOCKED');
  assert.equal(nativeSites.deploymentStatus, 'BLOCKED');
});

test('strict ISO timestamp validation rejects Date.parse-style loose values', function () {
  assert.equal(app.isIsoTimestamp('1'), false);
  assert.equal(app.isIsoTimestamp('2026-09-09T15:01:28Z'), true);
  assert.equal(app.isIsoTimestamp('2026-09-09 15:01:28Z'), false);
  assert.equal(app.isIsoTimestamp('2026-02-30T15:01:28Z'), false);
});

test('receipt imports reject oversized JSON payloads', function () {
  const receipt = readJson('valid-receipt.json');
  const oversized = JSON.stringify([receipt]).padEnd(app.MAX_RECEIPT_IMPORT_TEXT_LENGTH + 1, 'x');
  assert.throws(function () {
    app.importReceiptText(oversized);
  }, /maximum import size/i);
});

test('stored receipts are revalidated and forced back to unverified on reload', function () {
  const sanitized = app.sanitizeStoredReceipts([
    {
      ...readJson('valid-receipt.json'),
      review: { verified: true, reviewer: 'someone' },
      importStatus: 'VERIFIED',
      source: 'imported'
    },
    {
      ...readJson('invalid-date-receipt.json'),
      review: { verified: true, reviewer: 'bad' }
    }
  ]);

  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].review.verified, false);
  assert.equal(sanitized[0].review.reviewer, null);
  assert.equal(sanitized[0].importStatus, 'UNVERIFIED_IMPORTED');
});

test('smarts.bio discovery remains separate from blocked execution and native publication stays blocked', function () {
  const observations = app.FALLBACK_DATA.evidence.observations;
  const smarts = app.FALLBACK_DATA.registry.entries.find(function (entry) {
    return entry.id === 'smarts-bio';
  });
  const nativeSites = app.FALLBACK_DATA.registry.entries.find(function (entry) {
    return entry.id === 'native-chatgpt-sites';
  });
  const smartsList = observations.find(function (observation) {
    return observation.id === 'obs-smarts-bio-workspace-list';
  });
  const smartsBlocked = observations.find(function (observation) {
    return observation.id === 'obs-smarts-query-blocked';
  });
  const nativeList = observations.find(function (observation) {
    return observation.id === 'obs-native-sites-list';
  });
  const nativeBlocked = observations.find(function (observation) {
    return observation.id === 'obs-native-sites-write-blocked';
  });

  assert.equal(smarts.state, 'BLOCKED');
  assert.ok(/workspace listing succeeded/i.test(smartsList.summary));
  assert.ok(/Tool not found/i.test(smarts.notes));
  assert.equal(smartsBlocked.state, 'BLOCKED');
  assert.equal(nativeSites.state, 'BLOCKED');
  assert.equal(nativeList.state, 'PROBED');
  assert.equal(nativeBlocked.state, 'BLOCKED');
});

test('BioNeMo catalog observations preserve third-party provenance and keep inference not run', function () {
  const bionemo = app.FALLBACK_DATA.registry.entries.find(function (entry) {
    return entry.id === 'bionemo-nim';
  });
  const observation = app.FALLBACK_DATA.evidence.observations.find(function (item) {
    return item.id === 'obs-bionemo-source';
  });

  assert.match(bionemo.notes, /62 SKILL\.md/i);
  assert.match(bionemo.notes, /CPU path remains preserved|preserve the CPU path/i);
  assert.match(observation.summary, /0e67a612e4045f007e38fa77adc8f3ebfc5616b6/i);
  assert.match(observation.notes, /NIM\/GPU inference did not run/i);
});

test('required static assets exist and HTML references resolve locally', function () {
  const htmlPath = path.join(root, 'docs', 'index.html');
  const cssPath = path.join(root, 'docs', 'style.css');
  const jsPath = path.join(root, 'docs', 'app.js');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const assets = [
    cssPath,
    jsPath,
    path.join(root, 'docs', 'data', 'registry.json'),
    path.join(root, 'docs', 'data', 'chains.json'),
    path.join(root, 'docs', 'data', 'probe-receipt-template.json'),
    path.join(root, 'docs', 'data', 'request-artifact-template.json'),
    path.join(root, 'docs', 'evidence', 'parent-observations.json'),
    path.join(root, 'schemas', 'probe.schema.json'),
    path.join(root, 'THIRD_PARTY_NOTICES.md')
  ];

  assets.forEach(function (assetPath) {
    assert.equal(fs.existsSync(assetPath), true, assetPath + ' should exist');
  });

  assert.match(html, /<link rel="stylesheet" href="\.\/style\.css">/);
  assert.match(html, /<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(fs.readFileSync(jsPath, 'utf8'), /^\s*import\s/m);
});
