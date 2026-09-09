import {readFile} from 'node:fs/promises';
import {makePlan, receiptTemplate, sha256} from '../site/assets/core.js';
export const registry = JSON.parse(await readFile(new URL('../site/data/registry.json',import.meta.url),'utf8'));
export const planSchema = JSON.parse(await readFile(new URL('../site/schemas/plan.schema.json',import.meta.url),'utf8'));
export const receiptSchema = JSON.parse(await readFile(new URL('../site/schemas/receipt.schema.json',import.meta.url),'utf8'));
export const context = {registry,planSchema,receiptSchema};
export async function fixture() {
  const plan = await makePlan({stageId:'panel',toolId:'ncbi',inputs:[{label:'SYNTHETIC-manifest.txt',bytes:25,sha256:await sha256('SYNTHETIC TEST INPUT ONLY\n')}],purpose:'SYNTHETIC software test only; no biology.',parameters:'SYNTHETIC no-op; never execute.'},registry);
  return {...receiptTemplate(plan),receiptId:'SYNTHETIC-test-receipt',notes:'SYNTHETIC TEST DATA. No tool or biological analysis ran.'};
}
