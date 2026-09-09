// Original GenomeAtlas code. MIT; see LICENSE.
export const MAX_BYTES = 1024 * 1024;
export const MAX_RECEIPTS = 100;
export const CHECKLIST = ['scope', 'inputs', 'method', 'resources', 'privacy', 'reviewer'];
export const HASH_PATTERN = '^sha256:[a-f0-9]{64}$';

export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('')}`;
}

export function planPayload(plan) {
  const { planHash, ...payload } = plan;
  return payload;
}

// The schema subset below is deliberately small and fails closed on unsupported keywords.
export function validateSchema(value, schema, path = '$') {
  const supported = new Set(['$schema', '$id', 'title', 'description', 'type', 'const', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'maxItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum']);
  const errors = [];
  for (const key of Object.keys(schema)) if (!supported.has(key)) errors.push(`${path}: unsupported schema keyword ${key}`);
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const typeOK = schema.type === 'integer' ? Number.isSafeInteger(value) : actual === schema.type;
  if (schema.type && !typeOK) return [...errors, `${path}: expected ${schema.type}`];
  if ('const' in schema && value !== schema.const) errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: unsupported value`);
  if (actual === 'object') {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) errors.push(...validateSchema(child, schema.properties[key], `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unknown property ${key}`);
    }
  }
  if (actual === 'array') {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) errors.push(`${path}: item count outside bounds`);
    value.forEach((item, index) => { if (schema.items) errors.push(...validateSchema(item, schema.items, `${path}[${index}]`)); });
  }
  if (actual === 'string') {
    if (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity)) errors.push(`${path}: length outside bounds`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: invalid format`);
  }
  if (actual === 'number' && (!Number.isFinite(value) || value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) errors.push(`${path}: number outside bounds`);
  return errors;
}

export async function validatePlan(plan, registry, schema) {
  const errors = validateSchema(plan, schema);
  if (errors.length) return errors;
  const stage = registry.stages.find(s => s.id === plan.stageId);
  if (!stage) errors.push('Unknown stage. Choose a registry stage.');
  if (!registry.tools.some(t => t.id === plan.toolId)) errors.push('Unknown tool. Choose a registry tool.');
  if (stage && !stage.toolIds.includes(plan.toolId)) errors.push('Tool is not assigned to this stage.');
  if (plan.registryVersion !== registry.version) errors.push('Registry version mismatch. Rebuild the plan.');
  if (plan.registryHash !== await sha256(canonicalize(registry))) errors.push('Registry content hash mismatch. Rebuild the plan against this registry.');
  if (new Set(plan.inputs.map(i => i.label)).size !== plan.inputs.length) errors.push('Input labels must be unique.');
  if (await sha256(canonicalize(planPayload(plan))) !== plan.planHash) errors.push('Plan hash mismatch. Inputs or method changed; rebuild the plan.');
  return errors;
}

export async function makePlan({stageId, toolId, inputs, parameters, purpose}, registry) {
  const payload = {schemaVersion: '1.0', kind: 'plan', registryVersion: registry.version, registryHash: await sha256(canonicalize(registry)), stageId, toolId, inputs, parameters, purpose, authority: 'local-review-only'};
  return {...payload, planHash: await sha256(canonicalize(payload))};
}

export async function importReceipt(text, {registry, receiptSchema, planSchema, activePlan = null}) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('Receipt exceeds the 1 MiB limit.');
  let receipt;
  try { receipt = JSON.parse(text); } catch { throw new Error('Malformed JSON. Choose one JSON receipt file.'); }
  const errors = validateSchema(receipt, receiptSchema);
  if (errors.length) throw new Error(errors.slice(0, 6).join('\n'));
  errors.push(...await validatePlan(receipt.plan, registry, planSchema));
  if (receipt.planHash !== receipt.plan.planHash) errors.push('Receipt and embedded plan hashes differ.');
  if (receipt.stageId !== receipt.plan.stageId || receipt.toolId !== receipt.plan.toolId) errors.push('Receipt stage/tool does not match the plan.');
  if (receipt.inputHashes.join('|') !== receipt.plan.inputs.map(i => i.sha256).join('|')) errors.push('Receipt input hashes differ from the plan (including order).');
  if (activePlan && activePlan.planHash !== receipt.planHash) errors.push('Changed-input reuse blocked: receipt does not match the active plan. Clear the plan to inspect an unrelated claim.');
  if (errors.length) throw new Error(errors.slice(0, 6).join('\n'));
  return {receipt, receiptHash: await sha256(canonicalize(receipt)), provenance: 'local-import', evidenceStatus: 'unverified', scientificAcceptance: 'not-assessed'};
}

export function receiptTemplate(plan) {
  return {schemaVersion: '1.0', kind: 'receipt', receiptId: 'replace-with-local-receipt-id', stageId: plan.stageId, toolId: plan.toolId, planHash: plan.planHash, plan, inputHashes: plan.inputs.map(i => i.sha256), outputs: [], claimedOutcome: 'not-run', evidenceStatus: 'unverified', scientificAcceptance: 'not-assessed', notes: 'TEMPLATE ONLY. No execution occurred. Add output file hashes and a factual outcome after independently authorized work.'};
}

export function reviewMatches(review, plan) {
  return Boolean(plan && review?.planHash === plan.planHash && CHECKLIST.every(key => review.checks[key] === true));
}

export function csv(rows, columns) {
  const escape = value => {
    let text = typeof value === 'object' && value !== null ? canonicalize(value) : String(value ?? '');
    // Neutralize spreadsheet formulas, including formulas after leading whitespace/control characters.
    if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [columns.map(escape).join(','), ...rows.map(row => columns.map(key => escape(row[key])).join(','))].join('\r\n');
}
