const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const app = require('../docs/app.js');

const root = path.resolve(__dirname, '..');
const fixturesDir = path.join(__dirname, 'fixtures');

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, fileName), 'utf8'));
}

test('workspace data includes honest states and validates receipt links', function () {
  const verdict = app.validateWorkspaceData(app.FALLBACK_DATA);
  assert.equal(verdict.valid, true, verdict.errors.join('\n'));

  const entries = Object.fromEntries(app.FALLBACK_DATA.registry.entries.map(function (entry) {
    return [entry.id, entry.state];
  }));

  assert.equal(entries['codex-cli'], 'BLOCKED_EXECUTION');
  assert.equal(entries['smarts-bio'], 'AUTH_REQUIRED');
  assert.equal(entries['native-chatgpt-sites'], 'NOT_DEPLOYED');
});

test('exact four ring labels are preserved', function () {
  const rings = app.FALLBACK_DATA.chains.rings;
  assert.deepEqual(rings, ['Type I', 'Type II (including IIG)', 'Type III', 'Type IV']);
});

test('flow lineage keeps host tree and R-M detection as independent branches', function () {
  const lineage = app.buildStageLineage(app.FALLBACK_DATA.chains);
  assert.deepEqual(lineage['host-tree'].incoming, ['concatenation']);
  assert.deepEqual(lineage['rm-detection'].incoming, ['replicons']);
  assert.deepEqual(lineage.review.incoming.sort(), ['host-tree', 'rm-detection']);
  assert.equal(lineage['host-tree'].outgoing.includes('rm-detection'), false);
  assert.equal(lineage['rm-detection'].outgoing.includes('host-tree'), false);
});

test('valid measured and not_measured receipts validate and import as unverified', function () {
  const registryMap = Object.fromEntries(app.FALLBACK_DATA.registry.entries.map(function (entry) {
    return [entry.id, entry];
  }));

  ['valid-receipt.json', 'valid-not-measured-receipt.json'].forEach(function (fixtureName) {
    const receipt = readJson(fixtureName);
    const verdict = app.validateReceipt(receipt, registryMap);
    assert.equal(verdict.valid, true, fixtureName + ' should be valid');
    assert.deepEqual(verdict.errors, []);

    receipt.review.verified = true;
    receipt.summary = 'PASS claimed by the importer but not independently reviewed yet.';
    const imported = app.importReceiptText(JSON.stringify(receipt), registryMap);
    assert.equal(imported.length, 1);
    assert.equal(imported[0].review.verified, false);
    assert.equal(imported[0].importStatus, 'UNVERIFIED_IMPORT');
  });
});

test('malformed import, missing fields, unknown state, and script injection are rejected', function () {
  const registryMap = Object.fromEntries(app.FALLBACK_DATA.registry.entries.map(function (entry) {
    return [entry.id, entry];
  }));

  assert.throws(function () {
    app.importReceiptText('{bad json', registryMap);
  }, SyntaxError);

  [
    'malicious-html-receipt.json',
    'unknown-state-receipt.json',
    'missing-exitcode-receipt.json',
    'missing-hash-receipt.json',
    'invalid-sha-format-receipt.json',
    'not-measured-with-hash-receipt.json',
    'missing-hash-status-receipt.json'
  ].forEach(function (name) {
    const verdict = app.validateReceipt(readJson(name), registryMap);
    assert.equal(verdict.valid, false, name + ' should be invalid');
  });
});

test('missing receipt-to-tool links are rejected', function () {
  const broken = structuredClone(app.FALLBACK_DATA);
  broken.receipts.receipts[0].toolId = 'missing-tool';
  const verdict = app.validateWorkspaceData(broken);
  assert.equal(verdict.valid, false);
  assert.match(verdict.errors.join(' '), /known registry entry/i);
});

test('FAILED and UNKNOWN classifications are never remapped to NOT_DETECTED', function () {
  const registryMap = Object.fromEntries(app.FALLBACK_DATA.registry.entries.map(function (entry) {
    return [entry.id, entry];
  }));
  const failed = app.createProbeReceipt({
    toolId: 'github-cli',
    state: 'EXECUTED',
    classification: 'FAILED',
    summary: 'Synthetic failed probe.',
    evidenceLocation: 'tests/fixtures/software-only-note.txt',
    exitCode: 1,
    hashStatus: 'not_measured',
    hashSha256: ''
  }, registryMap);
  const unknown = app.createProbeReceipt({
    toolId: 'smarts-bio',
    state: 'AUTH_REQUIRED',
    classification: 'UNKNOWN',
    summary: 'Synthetic blocked probe.',
    evidenceLocation: 'tests/fixtures/software-only-note.txt',
    exitCode: 401,
    hashStatus: 'not_measured',
    hashSha256: ''
  }, registryMap);

  assert.equal(failed.result.classification, 'FAILED');
  assert.equal(unknown.result.classification, 'UNKNOWN');
  assert.notEqual(failed.result.classification, 'NOT_DETECTED');
  assert.notEqual(unknown.result.classification, 'NOT_DETECTED');
});

test('request confirmation creates REQUESTED artifacts without inferred approvals or execution', function () {
  assert.throws(function () {
    app.createRequestArtifact({ toolId: 'github-cli', stageId: 'review', summary: 'x', justification: 'y', confirmed: false });
  }, /Confirmation is required/);

  const artifact = app.createRequestArtifact({
    toolId: 'github-cli',
    stageId: 'review',
    summary: 'Review the sanitized GitHub receipt packet.',
    justification: 'A reviewer should inspect the receipt out of band.',
    confirmed: true,
    approved: true,
    executed: true
  });

  assert.equal(artifact.status, 'REQUESTED');
  assert.equal(artifact.approved, false);
  assert.equal(artifact.executed, false);
});

test('registry filtering supports search, state, and stage', function () {
  const entries = app.FALLBACK_DATA.registry.entries;
  const stateMatch = app.filterRegistry(entries, { search: '', state: 'AUTH_REQUIRED', stage: 'ALL' });
  assert.deepEqual(stateMatch.map(function (entry) { return entry.id; }), ['smarts-bio']);

  const queryMatch = app.filterRegistry(entries, { search: '0.153.4', state: 'ALL', stage: 'ALL' });
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'codex-cli');

  const stageMatch = app.filterRegistry(entries, { search: '', state: 'ALL', stage: 'rm-detection' });
  assert.deepEqual(stageMatch.map(function (entry) { return entry.id; }).sort(), ['defensefinder']);
});

test('CSV export escapes spreadsheet formulas safely', function () {
  const csv = app.recordsToCsv([
    { summary: '=2+3', toolId: 'github-cli' },
    { summary: '+SUM(A1:A2)', toolId: 'rdc' },
    { summary: '@malicious', toolId: 'smarts-bio' }
  ], [
    { key: 'toolId', label: 'toolId' },
    { key: 'summary', label: 'summary' }
  ]);

  assert.match(csv, /'=2\+3/);
  assert.match(csv, /'\+SUM\(A1:A2\)/);
  assert.match(csv, /'@malicious/);
});

test('local probe creation reuses registry contracts and supports explicit not_measured hashes', function () {
  const registryMap = Object.fromEntries(app.FALLBACK_DATA.registry.entries.map(function (entry) {
    return [entry.id, entry];
  }));
  const receipt = app.createProbeReceipt({
    toolId: 'smarts-bio',
    state: 'AUTH_REQUIRED',
    classification: 'UNKNOWN',
    summary: 'Synthetic software-only receipt describing an auth gate.',
    evidenceLocation: 'tests/fixtures/software-only-note.txt',
    exitCode: 401,
    hashStatus: 'not_measured',
    hashSha256: ''
  }, registryMap);

  assert.equal(receipt.review.verified, false);
  assert.equal(receipt.inputContract, registryMap['smarts-bio'].inputContract);
  assert.equal(receipt.outputContract, registryMap['smarts-bio'].outputContract);
  assert.equal(receipt.evidence.hashStatus, 'not_measured');
  assert.equal(receipt.evidence.sha256, null);
});

test('historical receipts preserve null timestamps and measured-vs-unmeasured hashes honestly', function () {
  const records = app.collectProbeRecords(app.FALLBACK_DATA, []);
  const roundtrip = records.find(function (record) {
    return record.toolId === 'windows-wsl';
  });
  const nativeSites = records.find(function (record) {
    return record.toolId === 'native-chatgpt-sites';
  });

  assert.ok(roundtrip);
  assert.equal(roundtrip.probeTimestamp, null);
  assert.equal(roundtrip.evidence.hashStatus, 'measured');
  assert.equal(roundtrip.evidence.sha256, 'fe5608db0f8722d22f41f897936171871d7a737a3111346bff2ea40ee0ae7288');
  assert.ok(nativeSites);
  assert.equal(nativeSites.state, 'NOT_DEPLOYED');
  assert.equal(nativeSites.evidence.sha256, null);
});

test('required static assets exist and HTML references resolve locally without innerHTML usage', function () {
  const htmlPath = path.join(root, 'docs', 'index.html');
  const cssPath = path.join(root, 'docs', 'style.css');
  const jsPath = path.join(root, 'docs', 'app.js');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const assets = [
    cssPath,
    jsPath,
    path.join(root, 'docs', 'data', 'registry.json'),
    path.join(root, 'docs', 'data', 'chains.json'),
    path.join(root, 'docs', 'data', 'receipts.json'),
    path.join(root, 'docs', 'data', 'gates.json'),
    path.join(root, 'docs', 'CHEATBOOK.md'),
    path.join(root, 'docs', 'NATIVE_SITES_HANDOFF.md'),
    path.join(root, 'schemas', 'probe.schema.json')
  ];

  assets.forEach(function (assetPath) {
    assert.equal(fs.existsSync(assetPath), true, assetPath + ' should exist');
  });

  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /<link rel="stylesheet" href="\.\/style\.css">/);
  assert.match(html, /<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(fs.readFileSync(jsPath, 'utf8'), /innerHTML/);
});

test('synthetic log manifest uses relative paths with checksums', function () {
  const manifestPath = path.join(root, 'tests', 'logs', 'node-test.synthetic-software-only.manifest.json');
  assert.equal(fs.existsSync(manifestPath), true);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.command, 'node --test tests/*.test.js');
  manifest.checksums.forEach(function (entry) {
    assert.equal(path.isAbsolute(entry.path), false);
    const fileBuffer = fs.readFileSync(path.join(root, entry.path));
    const digest = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    assert.equal(entry.sha256, digest);
  });
});
