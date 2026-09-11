import { describe, expect, it } from 'vitest'
import schema from '../data/genomeatlas/task-request.schema.json'
import provenance from '../data/genomeatlas/provenance.json'
import registryRaw from '../data/genomeatlas/registry.json?raw'
import chainsRaw from '../data/genomeatlas/chains.json?raw'
import panelRaw from '../data/genomeatlas/selected_accessions.txt?raw'
import schemaRaw from '../data/genomeatlas/task-request.schema.json?raw'
import templateRaw from '../data/genomeatlas/task-request.template.json?raw'
import pilotRaw from '../../analyses/lab-rm-phylogenomics/config/stage3_pilot_accessions.txt?raw'
import { availableWorkflows, dispatcherDemoAccessions, workflowContracts, workflowPayload, workflowPrompt } from './workflowDispatcher'

// Check against the vendored authoritative schema, including every keyword it
// uses. This is a test assertion, not a replacement application schema.
interface Schema {
  type?: string
  const?: unknown
  enum?: unknown[]
  properties?: Record<string, Schema>
  required?: string[]
  additionalProperties?: boolean
  pattern?: string
  format?: string
  maxLength?: number
  items?: Schema
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
}

function assertSchema(value: unknown, contract: Schema) {
  if ('const' in contract) expect(value).toEqual(contract.const)
  if (contract.enum) expect(contract.enum).toContainEqual(value)
  if (contract.type === 'object') {
    expect(value).not.toBeNull()
    expect(typeof value).toBe('object')
    expect(Array.isArray(value)).toBe(false)
    const object = value as Record<string, unknown>
    for (const key of contract.required ?? []) expect(Object.hasOwn(object, key)).toBe(true)
    for (const key of Object.keys(object)) {
      if (contract.additionalProperties === false) expect(contract.properties).toHaveProperty(key)
      if (contract.properties?.[key]) assertSchema(object[key], contract.properties[key])
    }
  } else if (contract.type === 'array') {
    expect(Array.isArray(value)).toBe(true)
    const array = value as unknown[]
    if (contract.minItems !== undefined) expect(array.length).toBeGreaterThanOrEqual(contract.minItems)
    if (contract.maxItems !== undefined) expect(array.length).toBeLessThanOrEqual(contract.maxItems)
    if (contract.uniqueItems) expect(new Set(array.map((item) => JSON.stringify(item))).size).toBe(array.length)
    if (contract.items) array.forEach((item) => assertSchema(item, contract.items!))
  } else if (contract.type) {
    expect(typeof value).toBe(contract.type)
  }
  if (typeof value === 'string') {
    if (contract.pattern) expect(value).toMatch(new RegExp(contract.pattern))
    if (contract.maxLength !== undefined) expect(value.length).toBeLessThanOrEqual(contract.maxLength)
    if (contract.format === 'date-time') expect(new Date(value).toISOString().slice(0, 19)).toBe(value.slice(0, 19))
  }
}

describe('frozen workflow contracts', () => {
  it('preserves all five parent source hashes', async () => {
    const snapshots = {
      'registry.json': registryRaw,
      'chains.json': chainsRaw,
      'selected_accessions.txt': panelRaw,
      'task-request.schema.json': schemaRaw,
      'task-request.template.json': templateRaw,
    }
    for (const name of Object.keys(snapshots) as Array<keyof typeof snapshots>) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshots[name]))
      const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
      expect(hex).toBe(provenance.files[name].sha256)
    }
  })

  it('uses exactly the scientific demo subset without leaving the frozen parent panel', () => {
    const frozenIds = new Set(panelRaw.trim().split(/\s+/))
    expect(dispatcherDemoAccessions).toEqual(pilotRaw.trim().split(/\s+/))
    expect(dispatcherDemoAccessions.length).toBeGreaterThan(0)
    expect(dispatcherDemoAccessions.length).toBeLessThanOrEqual(3)
    expect(dispatcherDemoAccessions.every((id) => frozenIds.has(id))).toBe(true)
  })

  it.each(availableWorkflows)('generates a schema-valid, parameter-bound $title request', (workflow) => {
    const request = workflowPayload(workflow, new Date('2026-09-12T12:00:00Z'), 'request-test')
    assertSchema(request, schema)
    expect(Object.keys(request).sort()).toEqual([...schema.required].sort())
    expect(request.state).toBe('TASK_REQUEST_ONLY')
    expect(request.chain_id).toBe(workflow.chainId)
    expect(request.endpoint_alias).toBe('review-queue')
    for (const criterion of ['exact-input-set', 'versions-and-hashes', 'independent-review']) {
      expect(request.acceptance_criteria).toContain(criterion)
    }
    if (workflow.chainId === 'rm') expect(request.acceptance_criteria).toContain('raw-components-reviewed')
    if (workflow.chainId === 'evidence') expect(request.acceptance_criteria).toContain('exact-strain-evidence')
    const prompt = workflowPrompt(workflow, request)
    expect(prompt).toContain(JSON.stringify(request, null, 2))
    expect(prompt).toContain('Never expand beyond three genomes')
    expect(prompt).toContain('model agreement is not validation')
    expect(prompt).toContain('NOT_TESTED')
    const { steps, tools } = workflowContracts(workflow)
    for (const step of steps) {
      expect(prompt).toContain(step.input)
      expect(prompt).toContain(step.output)
      expect(prompt).toContain(step.gate)
    }
    for (const tool of tools) expect(prompt).toContain(`${tool.id}: ${tool.status}`)
  })

  it('rejects the old payload shape and invalid nested contracts', () => {
    const request = workflowPayload(availableWorkflows[0])
    expect(() => assertSchema({ ...request, workflow_id: 'phylogenomic-tree' }, schema)).toThrow()
    expect(() => assertSchema({ ...request, state: 'EXECUTED' }, schema)).toThrow()
    expect(() => assertSchema({ ...request, chain_id: 'phylogenomic-tree' }, schema)).toThrow()
    expect(() => assertSchema({ ...request, config: { ...request.config, use_gpu: true } }, schema)).toThrow()
    expect(() => assertSchema({ ...request, genome_accessions: ['GCF_000468955'] }, schema)).toThrow()
  })

  it('creates distinct request identifiers and does not share mutable template arrays', () => {
    const first = workflowPayload(availableWorkflows[0])
    const second = workflowPayload(availableWorkflows[0])
    expect(first.request_id).not.toBe(second.request_id)
    first.genome_accessions.length = 0
    expect(second.genome_accessions).toEqual(dispatcherDemoAccessions)
  })
})
