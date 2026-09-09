import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateReceipt } from './receipt_validator.mjs';

// Deliberately fabricated metadata for validator unit tests, not execution receipts.
function receipt(overrides = {}) {
  return {
    schema: 'genomeatlas.probe.v1',
    id: 'unit-fixture',
    timestamp: '2026-09-09T12:30:45.123Z',
    tool: 'node',
    action: 'validate a unit fixture',
    scope: 'software',
    status: 'PASS',
    exit_code: 0,
    artifacts: [{ path: 'evidence/check.log', sha256: 'a'.repeat(64), size_bytes: 0 }],
    ...overrides,
  };
}

function accept(value) {
  assert.deepEqual(validateReceipt(value), {
    valid: true, errors: [], biological_validity: 'NOT_ASSESSED',
  });
}

function reject(value, code) {
  const result = validateReceipt(value);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.equal(result.biological_validity, 'NOT_ASSESSED');
  if (code) assert.ok(result.errors.some((error) => error.code === code), `Expected ${code}`);
}

test('accepts a minimal PASS with zero-byte artifact', () => accept(receipt()));
test('accepts every declared scope', () => {
  for (const scope of ['connectivity', 'software', 'synthetic', 'real-data', 'deployment']) {
    accept(receipt({ scope }));
  }
});
test('accepts UTC offset, leap day, and submillisecond precision', () => {
  for (const timestamp of ['2024-02-29T23:59:59+00:00', '2026-09-09T12:30:45.123456789Z', '2026-09-09T00:00:00Z']) {
    accept(receipt({ timestamp }));
  }
});
test('accepts FAIL with a nonzero exit and optional diagnostic artifacts', () => {
  accept(receipt({ status: 'FAIL', exit_code: 2, scientific_verified: false }));
  accept(receipt({ status: 'FAIL', exit_code: null, artifacts: [] }));
});
test('accepts BLOCKED with no result and a failed discovery exit', () => {
  accept(receipt({ status: 'BLOCKED', exit_code: null, artifacts: [] }));
  accept(receipt({ status: 'BLOCKED', exit_code: 1, scientific_verified: false }));
});
test('accepts NOT_RUN with null exit and no artifacts', () => {
  accept(receipt({ status: 'NOT_RUN', exit_code: null, artifacts: [], scientific_verified: false }));
});
test('PASS and supplied scientific claim never certify biological validity', () => {
  for (const scientific_verified of [true, false]) accept(receipt({ scientific_verified }));
  assert.equal(Object.hasOwn(validateReceipt(receipt()), 'scientific_verified'), false);
});
test('does not mutate frozen inputs and accepts null-prototype records', () => {
  const value = receipt();
  const before = JSON.stringify(value);
  Object.freeze(value.artifacts[0]);
  Object.freeze(value.artifacts);
  Object.freeze(value);
  accept(value);
  assert.equal(JSON.stringify(value), before);
  accept(Object.assign(Object.create(null), receipt()));
});
test('accepts distinct relative paths and treats strings as inert data', () => {
  const value = receipt({ tool: '<script>throw new Error()</script>', action: '' });
  value.artifacts.push({ path: 'other/check.log', sha256: '0123456789abcdef'.repeat(4), size_bytes: 123 });
  accept(value);
});
test('rejects primitives, JSON text, arrays, dates, and inherited records', () => {
  for (const value of [null, undefined, true, 1, '', JSON.stringify(receipt()), [], new Date(), Object.create(receipt())]) {
    reject(value, 'TYPE');
  }
});
test('requires each declared field', () => {
  for (const key of ['schema', 'id', 'timestamp', 'tool', 'action', 'scope', 'status', 'exit_code', 'artifacts']) {
    const value = receipt();
    delete value[key];
    reject(value, 'REQUIRED');
  }
});
test('rejects wrong schema, empty IDs, wrong string types and enums', () => {
  for (const overrides of [
    { schema: 'genomeatlas.probe.v2' }, { schema: null }, { id: '' }, { id: ' \t\n' },
    { id: 12 }, { tool: null }, { tool: {} }, { action: [] }, { scope: 'biology' },
    { scope: {} }, { status: 'pass' }, { status: ['PASS', 'FAIL'] },
  ]) reject(receipt(overrides));
});
test('rejects ambiguous, non-UTC, and impossible timestamps', () => {
  for (const timestamp of [
    null, 123, 'yesterday', '2026-09-09', '2026-09-09T12:00:00',
    '2026-09-09T12:00:00+03:00', '2026-09-09T12:00:00-00:00',
    '2026-02-29T12:00:00Z', '2024-02-30T12:00:00Z', '2026-04-31T12:00:00Z',
    '2026-13-01T00:00:00Z', '2026-09-09T24:00:00Z', '2026-09-09T12:00:60Z',
    ' 2026-09-09T12:00:00Z', '2026-09-09T12:00:00Z\n',
  ]) reject(receipt({ timestamp }), 'UTC');
});
test('PASS requires numeric zero exit and at least one artifact', () => {
  for (const exit_code of [null, 1, -1, '0', false]) reject(receipt({ exit_code }), 'STATUS_CONFLICT');
  reject(receipt({ artifacts: [] }), 'STATUS_CONFLICT');
});
test('rejects invalid exit code values', () => {
  for (const exit_code of [1.1, Number.NaN, Infinity, '1', {}, Number.MAX_SAFE_INTEGER + 1]) {
    reject(receipt({ status: 'FAIL', exit_code }), 'TYPE');
  }
});
test('rejects contradictory failed, blocked, and not-run statuses', () => {
  for (const status of ['FAIL', 'BLOCKED']) {
    reject(receipt({ status }), 'STATUS_CONFLICT');
    reject(receipt({ status, exit_code: 1, scientific_verified: true }), 'STATUS_CONFLICT');
  }
  reject(receipt({ status: 'NOT_RUN', artifacts: [] }), 'STATUS_CONFLICT');
  reject(receipt({ status: 'NOT_RUN', exit_code: null }), 'STATUS_CONFLICT');
  reject(receipt({ status: 'NOT_RUN', exit_code: null, artifacts: [], scientific_verified: true }), 'STATUS_CONFLICT');
});
test('rejects nonboolean scientific claims', () => {
  for (const scientific_verified of ['true', 'false', 0, 1, null, undefined, {}]) {
    reject(receipt({ scientific_verified }), 'TYPE');
  }
});
test('rejects absent or malformed artifact arrays and records', () => {
  for (const artifacts of [null, {}, 'artifact', [null], [1], [[]], [{}]]) reject(receipt({ artifacts }));
  for (const key of ['path', 'sha256', 'size_bytes']) {
    const value = receipt();
    delete value.artifacts[0][key];
    reject(value, 'REQUIRED');
  }
});
test('rejects absolute, traversal, encoded, and noncanonical paths', () => {
  for (const path of [
    '', null, 4, '/tmp/a', '//host/share/a', 'C:/tmp/a', 'C:relative', '\\tmp\\a',
    '\\\\host\\share\\a', '../secret', 'evidence/../secret', '.', './a', 'a/.', 'a/..',
    'a//b', 'a/', 'a\\b', 'a\\..\\b', '%2e%2e/secret', '%252e%252e/secret',
    'file:///tmp/a', 'a:stream', 'a\u0000b', 'a\nb', 'a\u007fb', 'a?', 'a*',
    'a<', 'a>', 'a"', 'a|', ' a', 'a ', 'a.', 'a.../b', 'CON', 'nul.txt',
    'a/LPT1.log', 'a/COM1', 'a/com\u00b9.txt', 'x'.repeat(4097),
  ]) {
    const value = receipt();
    value.artifacts[0].path = path;
    reject(value, 'PATH');
  }
});
test('rejects malformed hashes without coercion', () => {
  for (const sha256 of ['', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), 'g'.repeat(64), 'a'.repeat(64) + '\n', null, 123]) {
    const value = receipt();
    value.artifacts[0].sha256 = sha256;
    reject(value, 'HASH');
  }
});
test('rejects invalid or imprecise artifact sizes', () => {
  for (const size_bytes of [-1, 0.1, '0', null, true, Infinity, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    const value = receipt();
    value.artifacts[0].size_bytes = size_bytes;
    reject(value, 'SIZE');
  }
});
test('rejects duplicate artifact paths including Windows case aliases', () => {
  for (const path of ['evidence/check.log', 'EVIDENCE/CHECK.LOG']) {
    const value = receipt();
    value.artifacts.push({ ...value.artifacts[0], path });
    reject(value, 'DUPLICATE');
  }
});
test('rejects unexpected keys and parsed prototype pollution payloads', () => {
  for (const key of ['__proto__', 'constructor', 'prototype', 'passed', 'status_alias']) {
    const value = JSON.parse(JSON.stringify(receipt()));
    Object.defineProperty(value, key, { enumerable: true, value: { polluted: true } });
    reject(value, 'UNKNOWN_FIELD');
    const nested = receipt();
    nested.artifacts[0] = JSON.parse(`{"path":"a","sha256":"${'a'.repeat(64)}","size_bytes":0,"${key}":true}`);
    reject(nested, 'UNKNOWN_FIELD');
  }
  assert.equal(Object.prototype.polluted, undefined);
});
test('rejects getters, symbols, and nonenumerable properties without executing code', () => {
  let calls = 0;
  const value = receipt();
  Object.defineProperty(value, 'id', { enumerable: true, get() { calls += 1; return 'bad'; } });
  reject(value, 'TYPE');
  const nested = receipt();
  Object.defineProperty(nested.artifacts[0], 'path', { enumerable: true, get() { calls += 1; return 'bad'; } });
  reject(nested, 'TYPE');
  const array = receipt();
  Object.defineProperty(array.artifacts, '0', { enumerable: true, get() { calls += 1; return {}; } });
  reject(array, 'TYPE');
  assert.equal(calls, 0);
  const symbol = receipt();
  symbol[Symbol('status')] = 'FAIL';
  reject(symbol, 'UNKNOWN_FIELD');
  const hidden = receipt();
  Object.defineProperty(hidden, 'id', { enumerable: false });
  reject(hidden, 'TYPE');
});
test('rejects proxies, including revoked proxies, without invoking traps', () => {
  let calls = 0;
  const proxy = new Proxy(receipt(), { get() { calls += 1; throw new Error('Must not run'); } });
  reject(proxy, 'TYPE');
  const revocable = Proxy.revocable({}, {});
  revocable.revoke();
  reject(revocable.proxy, 'TYPE');
  reject(receipt({ artifacts: new Proxy([], {}) }), 'TYPE');
  reject(receipt({ artifacts: [proxy] }), 'TYPE');
  assert.equal(calls, 0);
});
test('rejects sparse, extended, and excessive artifact arrays', () => {
  reject(receipt({ artifacts: new Array(1) }), 'TYPE');
  const extended = receipt();
  extended.artifacts.extra = true;
  reject(extended, 'TYPE');
  reject(receipt({ artifacts: new Array(10001) }), 'LIMIT');
});
