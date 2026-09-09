import { posix, win32 } from 'node:path';
import { types } from 'node:util';

const REQUIRED = [
  'schema', 'id', 'timestamp', 'tool', 'action', 'scope', 'status',
  'exit_code', 'artifacts',
];
const FIELDS = new Set([...REQUIRED, 'scientific_verified']);
const ARTIFACT_FIELDS = new Set(['path', 'sha256', 'size_bytes']);
const SCOPES = new Set(['connectivity', 'software', 'synthetic', 'real-data', 'deployment']);
const STATUSES = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN']);
const UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|\+00:00)$/;

function isUtcTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = UTC.exec(value);
  if (!match || match[0] !== value) return false;
  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(value);
  // Date.parse alone normalizes impossible dates such as February 30.
  return Number.isFinite(parsed.getTime())
    && parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() + 1 === Number(month)
    && parsed.getUTCDate() === Number(day)
    && parsed.getUTCHours() === Number(hour)
    && parsed.getUTCMinutes() === Number(minute)
    && parsed.getUTCSeconds() === Number(second);
}

function isArtifactPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) return false;
  if (posix.isAbsolute(value) || win32.isAbsolute(value)) return false;
  // One portable representation: forward slashes, no URI encoding, drive/ADS
  // syntax, Windows separators, control characters, or filesystem aliases.
  if (/[\\:%<>"|?*\u0000-\u001f\u007f]/u.test(value)) return false;
  return value.split('/').every((part) =>
    part.length > 0 && part !== '.' && part !== '..'
    && part.trim() === part && !part.endsWith('.')
    && !/^(?:con|prn|aux|nul|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3])(?:\.|$)/i.test(part));
}

/**
 * Validate receipt structure and status consistency; never read artifacts,
 * execute commands, render HTML, or certify scientific/biological validity.
 * Returns { valid, errors: [{ path, code, message }], biological_validity }.
 * Accepts parsed JSON objects. No coercion, mutation, or getter evaluation.
 */
export function validateReceipt(obj) {
  const errors = [];
  const add = (path, code, message) => errors.push({ path, code, message });
  const result = () => ({
    valid: errors.length === 0,
    errors,
    biological_validity: 'NOT_ASSESSED',
  });

  // Reject executable/non-JSON objects before reading any user properties.
  function record(value, path, allowed, required) {
    if (value === null || typeof value !== 'object' || types.isProxy(value)
      || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      add(path, 'TYPE', 'Expected a plain JSON object.');
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string' || !allowed.has(key))) {
      add(path, 'UNKNOWN_FIELD', 'Unexpected fields are not permitted.');
      return null;
    }
    const data = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
        add(path, 'TYPE', 'Expected enumerable JSON data properties.');
        return null;
      }
      data[key] = descriptor.value;
    }
    for (const key of required) {
      if (!Object.hasOwn(data, key)) add(`${path}.${key}`, 'REQUIRED', 'Required field is missing.');
    }
    return data;
  }

  const receipt = record(obj, '$', FIELDS, REQUIRED);
  if (!receipt) return result();
  if (receipt.schema !== 'genomeatlas.probe.v1') add('$.schema', 'SCHEMA', 'Unsupported schema.');
  if (typeof receipt.id !== 'string' || receipt.id.trim().length === 0) {
    add('$.id', 'TYPE', 'Expected a nonempty string.');
  }
  if (!isUtcTimestamp(receipt.timestamp)) add('$.timestamp', 'UTC', 'Expected a valid UTC ISO timestamp.');
  for (const key of ['tool', 'action']) {
    if (typeof receipt[key] !== 'string') add(`$.${key}`, 'TYPE', 'Expected a string.');
  }
  if (!SCOPES.has(receipt.scope)) add('$.scope', 'ENUM', 'Unsupported scope.');
  if (!STATUSES.has(receipt.status)) add('$.status', 'ENUM', 'Unsupported status.');
  if (receipt.exit_code !== null && !Number.isSafeInteger(receipt.exit_code)) {
    add('$.exit_code', 'TYPE', 'Expected a safe integer or null.');
  }
  if (Object.hasOwn(receipt, 'scientific_verified') && typeof receipt.scientific_verified !== 'boolean') {
    add('$.scientific_verified', 'TYPE', 'Expected a boolean when supplied.');
  }
  if (receipt.status === 'PASS' && receipt.exit_code !== 0) {
    add('$.exit_code', 'STATUS_CONFLICT', 'PASS requires exit_code 0.');
  }
  if (['FAIL', 'BLOCKED'].includes(receipt.status) && receipt.exit_code === 0) {
    add('$.exit_code', 'STATUS_CONFLICT', 'FAIL and BLOCKED require a nonzero exit code or null.');
  }
  if (receipt.status === 'NOT_RUN' && receipt.exit_code !== null) {
    add('$.exit_code', 'STATUS_CONFLICT', 'NOT_RUN requires a null exit code.');
  }
  if (receipt.status !== 'PASS' && receipt.scientific_verified === true) {
    add('$.scientific_verified', 'STATUS_CONFLICT', 'Only PASS can carry a scientific verification claim.');
  }

  const artifacts = receipt.artifacts;
  if (types.isProxy(artifacts) || !Array.isArray(artifacts)) {
    add('$.artifacts', 'TYPE', 'Expected a JSON array.');
    return result();
  }
  // Bound work and reject sparse arrays or accessors without evaluating them.
  if (artifacts.length > 10000) {
    add('$.artifacts', 'LIMIT', 'At most 10000 artifacts are permitted.');
    return result();
  }
  const entries = Object.getOwnPropertyDescriptors(artifacts);
  const arrayKeys = Reflect.ownKeys(entries);
  if (arrayKeys.length !== artifacts.length + 1 || arrayKeys.some((key) =>
    key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key)
      || Number(key) >= artifacts.length))) {
    add('$.artifacts', 'TYPE', 'Expected a dense JSON array without extra properties.');
    return result();
  }
  if (receipt.status === 'PASS' && artifacts.length === 0) {
    add('$.artifacts', 'STATUS_CONFLICT', 'PASS requires at least one artifact.');
  }
  if (receipt.status === 'NOT_RUN' && artifacts.length !== 0) {
    add('$.artifacts', 'STATUS_CONFLICT', 'NOT_RUN cannot claim produced artifacts.');
  }
  const seen = new Set();
  for (let index = 0; index < artifacts.length; index += 1) {
    const location = `$.artifacts[${index}]`;
    const descriptor = entries[index];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      add(location, 'TYPE', 'Expected an enumerable JSON array element.');
      continue;
    }
    const artifact = record(descriptor.value, location, ARTIFACT_FIELDS, [...ARTIFACT_FIELDS]);
    if (!artifact) continue;
    if (!isArtifactPath(artifact.path)) {
      add(`${location}.path`, 'PATH', 'Expected a canonical portable relative artifact path.');
    } else {
      // WD is Windows: also reject case aliases of the same artifact path.
      const identity = artifact.path.toLowerCase();
      if (seen.has(identity)) add(`${location}.path`, 'DUPLICATE', 'Duplicate artifact path.');
      seen.add(identity);
    }
    if (typeof artifact.sha256 !== 'string' || artifact.sha256.length !== 64
      || !/^[0-9a-f]{64}$/.test(artifact.sha256)) {
      add(`${location}.sha256`, 'HASH', 'Expected exactly 64 lowercase hexadecimal characters.');
    }
    if (!Number.isSafeInteger(artifact.size_bytes) || artifact.size_bytes < 0) {
      add(`${location}.size_bytes`, 'SIZE', 'Expected a nonnegative safe integer.');
    }
  }
  return result();
}
