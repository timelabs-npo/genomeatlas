// Original GenomeAtlas code. MIT; see LICENSE. No third-party implementation.
export const MAX_IMPORT_BYTES = 262144;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

// Implements only the JSON Schema keywords used by this project's two schemas.
export function validate(value, schema, path = '$', depth = 0) {
  const errors = [];
  if (depth > 12) return [`${path}: nesting limit exceeded`];
  const fail = message => errors.push(`${path}: ${message}`);
  if ('const' in schema && !equal(value, schema.const)) fail('unexpected constant');
  if (schema.enum && !schema.enum.some(item => equal(value, item))) fail('value outside allowed set');
  if (schema.type) {
    const matches = {object: plain(value), array: Array.isArray(value), string: typeof value === 'string',
      integer: Number.isSafeInteger(value), number: typeof value === 'number' && Number.isFinite(value),
      boolean: typeof value === 'boolean', null: value === null};
    if (!matches[schema.type]) return [...errors, `${path}: expected ${schema.type}`];
  }
  if (typeof value === 'string') {
    if (schema.maxLength !== undefined && value.length > schema.maxLength) fail('text too long');
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) fail('invalid format');
    if (schema.format === 'date-time') {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== value.slice(0,19)) fail('invalid UTC timestamp');
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) fail('below minimum');
    if (schema.maximum !== undefined && value > schema.maximum) fail('above maximum');
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail('too few items');
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail('too many items');
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) fail('duplicate items');
    if (schema.items) value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`, depth + 1)));
  }
  if (plain(value)) {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) fail('too few properties');
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) fail('too many properties');
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) fail(`missing ${key}`);
    for (const key of keys) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) { fail('reserved property'); continue; }
      if (schema.propertyNames) errors.push(...validate(key, schema.propertyNames, `${path} property name`, depth + 1));
      if (Object.hasOwn(schema.properties || {}, key)) errors.push(...validate(value[key], schema.properties[key], `${path}.${key}`, depth + 1));
      else if (schema.additionalProperties === false) fail('unexpected property');
      else if (plain(schema.additionalProperties)) errors.push(...validate(value[key], schema.additionalProperties, `${path} entry`, depth + 1));
    }
  }
  return errors;
}

function guardTree(value, depth = 0, budget = {nodes: 0}) {
  if (++budget.nodes > 10000 || depth > 12) throw new Error('Import structure exceeds preview limits.');
  if (typeof value === 'string' && value.length > 10000) throw new Error('Import text exceeds preview limits.');
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Reserved JSON property rejected.');
      guardTree(item, depth + 1, budget);
    }
  }
}

export function taskErrors(value, snapshot) {
  const errors = validate(value, snapshot.schemas.task);
  if (!errors.length) {
    const ids = new Set(snapshot.panel.map(row => row.accession));
    if (value.genome_accessions.some(id => !ids.has(id))) errors.push('Request contains accessions outside the frozen panel.');
    for (const criterion of ['exact-input-set', 'versions-and-hashes', 'independent-review']) {
      if (!value.acceptance_criteria.includes(criterion)) errors.push(`Missing acceptance criterion: ${criterion}`);
    }
  }
  return errors;
}

export function probeErrors(value, snapshot) {
  const errors = validate(value, snapshot.schemas.probe);
  if (!errors.length && value.claimed_result === 'PASS' && value.exit_code !== 0) errors.push('PASS claim contradicts nonzero exit code.');
  return errors;
}

export function previewImport(raw, snapshot) {
  if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) throw new Error('Maximum import size is 256 KiB.');
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Invalid JSON. No data was imported.'); }
  guardTree(value);
  let kind, errors = [];
  if (value?.schema === 'genomeatlas.task-request/1') {
    kind = 'Task request'; errors = taskErrors(value, snapshot);
  } else if (value?.schema === 'genomeatlas.probe-result/1') {
    kind = 'Probe result'; errors = probeErrors(value, snapshot);
  } else {
    // Real source round-trips are supported, but a changed snapshot has no update path.
    const source = Object.entries({registry:snapshot.registry, panel:snapshot.panel, chains:snapshot.chains, probes:snapshot.probes})
      .find(([, original]) => equal(value, original));
    if (!source) throw new Error('Unsupported or modified source snapshot. Use a task-request/probe-result schema, or an unchanged exported dataset.');
    kind = `Source snapshot: ${source[0]}`;
  }
  if (errors.length) throw new Error(errors.slice(0,8).join('\n'));
  return {kind, verification:'UNVERIFIED', effect:'PREVIEW_ONLY', value};
}

export function filterRegistry(entries, {query = '', layer = '', status = '', probed = ''} = {}) {
  const search = query.trim().toLowerCase();
  return entries.filter(row => (!search || `${row.id} ${row.layer} ${row.status} ${row.scope}`.toLowerCase().includes(search)) &&
    (!layer || row.layer === layer) && (!status || row.status === status) && (probed === '' || String(row.probed) === probed));
}

export function createRequest({chain, role, endpoint, accessions}, snapshot, now = new Date()) {
  const criteria = ['exact-input-set', 'versions-and-hashes', 'independent-review'];
  if (chain === 'rm') criteria.push('raw-components-reviewed');
  if (chain === 'evidence') criteria.push('exact-strain-evidence');
  if (chain === 'release') criteria.push('real-deployment-receipt');
  const result = {schema:'genomeatlas.task-request/1', request_id:`request-${crypto.randomUUID()}`, created_at_utc:now.toISOString(),
    state:'TASK_REQUEST_ONLY', chain_id:chain, role, endpoint_alias:endpoint, compute:'cpu', genome_accessions:accessions,
    acceptance_criteria:criteria, config:{use_gpu:false, host_tree:'conserved-single-copy-markers', rm_independent:true}};
  const errors = taskErrors(result, snapshot);
  if (errors.length) throw new Error(errors.join('\n'));
  return deepFreeze(result);
}

export function normalizeInterval(start, end, length, convention) {
  if (![start, end, length].every(Number.isSafeInteger)) throw new Error('Coordinates and replicon length must be safe integers.');
  if (!['zero', 'one'].includes(convention)) throw new Error('Choose a coordinate convention.');
  const normalizedStart = convention === 'one' ? start - 1 : start;
  if (length < 1 || normalizedStart < 0 || end <= normalizedStart || end > length) throw new Error('Require 0 ≤ start < end ≤ replicon length after conversion. Split origin-crossing intervals before validation.');
  return {start:normalizedStart, end, length:end - normalizedStart, coordinate_system:'0-based-half-open'};
}

export function safeFilename(kind) {
  const names = {request:'genomeatlas-task-request.json', preview:'genomeatlas-unverified-preview.json', config:'genomeatlas-coordinate-preview.json'};
  if (!Object.hasOwn(names, kind)) throw new Error('Unknown export type.');
  return names[kind];
}
