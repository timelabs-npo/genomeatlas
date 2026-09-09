const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../docs/app.js');

const root = path.resolve(__dirname, '..');
const fixturesDir = path.join(__dirname, 'fixtures');

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, fileName), 'utf8'));
}

test('valid receipts validate and import as unverified', function () {
  const receipt = readJson('valid-receipt.json');
  const verdict = app.validateReceipt(receipt);
  assert.equal(verdict.valid, true);
  assert.deepEqual(verdict.errors, []);

  const imported = app.importReceiptText(JSON.stringify(receipt));
  assert.equal(imported.length, 1);
  assert.equal(imported[0].review.verified, false);
  assert.equal(imported[0].importStatus, 'UNVERIFIED_IMPORTED');
});

test('malicious HTML, unknown state, missing exit code, and missing hash are rejected', function () {
  ['malicious-html-receipt.json', 'unknown-state-receipt.json', 'missing-exitcode-receipt.json', 'missing-hash-receipt.json'].forEach(function (name) {
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
    ...readJson('valid-receipt.json'),
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
  const stateMatch = app.filterRegistry(entries, { search: '', state: 'BLOCKED', stage: 'ALL' });
  assert.ok(stateMatch.some(function (entry) { return entry.id === 'native-chatgpt-sites'; }));

  const queryMatch = app.filterRegistry(entries, { search: '87 tools', state: 'ALL', stage: 'ALL' });
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'smarts-bio');

  const stageMatch = app.filterRegistry(entries, { search: '', state: 'ALL', stage: 'rm-detection' });
  assert.deepEqual(stageMatch.map(function (entry) { return entry.id; }).sort(), ['defensefinder', 'rebase']);
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

test('local probe creation reuses registry contracts and stays unverified', function () {
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
    hashSha256: 'sha256:synthetic-probe-receipt'
  }, registryMap);

  assert.equal(receipt.review.verified, false);
  assert.equal(receipt.inputContract, registryMap['smarts-bio'].inputContract);
  assert.equal(receipt.outputContract, registryMap['smarts-bio'].outputContract);
});

test('required static assets exist and HTML references resolve locally', function () {
  const htmlPath = path.join(root, 'docs', 'index.html');
  const cssPath = path.join(root, 'docs', 'style.css');
  const jsPath = path.join(root, 'docs', 'app.js');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const assets = [cssPath, jsPath, path.join(root, 'docs', 'data', 'registry.json'), path.join(root, 'docs', 'data', 'chains.json'), path.join(root, 'docs', 'evidence', 'parent-observations.json'), path.join(root, 'schemas', 'probe.schema.json')];

  assets.forEach(function (assetPath) {
    assert.equal(fs.existsSync(assetPath), true, assetPath + ' should exist');
  });

  assert.match(html, /<link rel="stylesheet" href="\.\/style\.css">/);
  assert.match(html, /<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(fs.readFileSync(jsPath, 'utf8'), /^\s*import\s/m);
});
