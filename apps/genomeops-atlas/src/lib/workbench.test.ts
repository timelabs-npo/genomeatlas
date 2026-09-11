import { afterEach, describe, expect, it, vi } from 'vitest'
import registry from '../data/genomeatlas/registry.json'
import chains from '../data/genomeatlas/chains.json'
import schema from '../data/genomeatlas/task-request.schema.json'
import template from '../data/genomeatlas/task-request.template.json'
import frozenPanel from '../data/genomeatlas/selected_accessions.txt?raw'
import {
  composeHandoff, copyHandoff, defaultHandoffOptions, destinations, personaOptions,
  parseGenomeAccessions, roleOptions, scientificToolIds, searchTools, starterTasks, toneOptions, toolCatalog,
  validateGenomeAccessions,
} from './workbench'

describe('workbench task and catalog contracts', () => {
  it('covers exactly the eight frozen chains with existing relevant tools', () => {
    expect(starterTasks).toHaveLength(8)
    expect(new Set(starterTasks.map((task) => task.id)).size).toBe(8)
    expect(starterTasks.map((task) => task.chainId).sort()).toEqual(chains.map((chain) => chain.id).sort())
    for (const task of starterTasks) {
      const chain = chains.find((entry) => entry.id === task.chainId)!
      expect(task.inputs).toContain(chain.input)
      expect(task.outputs).toContain(chain.output)
      expect(task.gates).toContain(chain.gate)
      expect(task.toolIds.length).toBeGreaterThan(0)
      for (const id of task.toolIds) expect(registry.entries.some((tool) => tool.id === id)).toBe(true)
    }
    expect(starterTasks.flatMap((task) => task.toolIds)).not.toContain('Spotify')
  })

  it('keeps every frozen entry and its evidence state, including blocked and cache entries', () => {
    expect(toolCatalog).toHaveLength(134)
    expect(toolCatalog.map((tool) => tool.id)).toEqual(registry.entries.map((tool) => tool.id))
    for (const original of registry.entries) {
      expect(toolCatalog.find((tool) => tool.id === original.id)).toMatchObject({ ...original, historical: true })
    }
    expect(toolCatalog.find((tool) => tool.id === 'smarts.bio:_AI_for_biology')?.status).toBe('AUTH_REQUIRED')
    expect(toolCatalog.find((tool) => tool.id === 'cache:github:48')?.status).toBe('CACHE_FILES_OBSERVED')
    expect(scientificToolIds.every((id) => toolCatalog.some((tool) => tool.id === id && tool.relevant))).toBe(true)
    expect(toolCatalog.find((tool) => tool.id === 'Spotify')?.relevant).toBe(false)
  })

  it('searches the full registry by all terms and combines facets without changing entries', () => {
    expect(searchTools('')).toHaveLength(134)
    expect(searchTools('ncbi metadata').map((tool) => tool.id)).toContain('NCBI_Datasets')
    expect(searchTools('github', 'plugin-cache').map((tool) => tool.id)).toEqual(['cache:github:48'])
    expect(searchTools('smarts', 'all', 'AUTH_REQUIRED').map((tool) => tool.id)).toEqual(['smarts.bio:_AI_for_biology'])
    expect(searchTools('nothing-matches-this-query')).toEqual([])
  })

  it.each(starterTasks)('keeps $title bound to the authoritative request schema', (task) => {
    const { payload, prompt } = composeHandoff({ taskId: task.id }, new Date('2026-09-12T10:00:00Z'), 'request-review')
    expect(Object.keys(payload).sort()).toEqual([...schema.required].sort())
    expect(payload.schema).toBe(schema.properties.schema.const)
    expect(payload.request_id).toMatch(new RegExp(schema.properties.request_id.pattern))
    expect(payload.created_at_utc).toMatch(new RegExp(schema.properties.created_at_utc.pattern))
    expect(payload.state).toBe('TASK_REQUEST_ONLY')
    expect(payload.compute).toBe('cpu')
    expect(payload.endpoint_alias).toBe(template.endpoint_alias)
    expect(schema.properties.chain_id.enum).toContain(payload.chain_id)
    expect(schema.properties.role.enum).toContain(payload.role)
    expect(payload.config).toEqual(template.config)
    expect(payload.genome_accessions).toHaveLength(3)
    for (const accession of payload.genome_accessions) expect(frozenPanel.split(/\s+/)).toContain(accession)
    expect(new Set(payload.acceptance_criteria).size).toBe(payload.acceptance_criteria.length)
    for (const criterion of payload.acceptance_criteria) expect(schema.properties.acceptance_criteria.items.enum).toContain(criterion)
    expect(prompt).toContain(JSON.stringify(payload, null, 2))
    expect(prompt).toContain('at most three genomes')
    expect(prompt).toContain('Failed or unrun screening is not biological absence')
    expect(prompt).toContain('not a current runtime probe')
    expect(prompt).toContain('State scientific acceptance separately from software checks')
    for (const gate of task.gates) expect(prompt).toContain(gate)
  })

  it('puts role, tone, character and context into the brief without changing scientific scope', () => {
    const options = { ...defaultHandoffOptions, roleId: 'reviewer' as const, toneId: 'technical' as const, personaId: 'skeptical-peer' as const, context: 'Inspect the attached evidence ledger.', toolIds: ['HMMER', 'HMMER'] }
    const result = composeHandoff(options)
    expect(result.prompt).toContain(roleOptions.find((option) => option.id === 'reviewer')!.instruction)
    expect(result.prompt).toContain(toneOptions.find((option) => option.id === 'technical')!.instruction)
    expect(result.prompt).toContain(personaOptions.find((option) => option.id === 'skeptical-peer')!.instruction)
    expect(result.prompt).toContain(options.context)
    expect(result.prompt.match(/^- HMMER \[/gm)).toHaveLength(1)
    expect(result.prompt).not.toContain('- NCBI_Datasets [')
    expect(result.prompt).toContain('They do not grant access, establish expertise or add independent reviewers')
    expect(result.payload.role).toBe('VERIFY')
    expect(result.payload.state).toBe('TASK_REQUEST_ONLY')
  })

  it('rejects unknown catalog/task identifiers instead of inventing a contract', () => {
    expect(() => composeHandoff({ taskId: 'invented-task' })).toThrow('Unknown task')
    expect(() => composeHandoff({ taskId: starterTasks[0].id, toolIds: ['invented-tool'] })).toThrow('Unknown tool')
    const empty = composeHandoff({ taskId: starterTasks[0].id, toolIds: [] })
    expect(empty.prompt).toContain('No tools selected')
  })

  it('creates isolated payloads and distinct request identities', () => {
    const first = composeHandoff(defaultHandoffOptions)
    const second = composeHandoff(defaultHandoffOptions)
    expect(first.payload.request_id).not.toBe(second.payload.request_id)
    first.payload.genome_accessions.length = 0
    first.payload.acceptance_criteria.length = 0
    expect(second.payload.genome_accessions).toHaveLength(3)
    expect(second.payload.acceptance_criteria).toContain('exact-input-set')
  })

  it('uses the explicit selected genome subset in both the payload and copied brief', () => {
    const accessions = [defaultHandoffOptions.accessions[1]]
    const { payload, prompt } = composeHandoff({ taskId: starterTasks[0].id, accessions })
    expect(payload.genome_accessions).toEqual(accessions)
    expect(payload.genome_accessions).not.toBe(accessions)
    expect(prompt).toContain(JSON.stringify(payload, null, 2))
    expect(prompt).not.toContain(defaultHandoffOptions.accessions[0])
    expect(parseGenomeAccessions(`${defaultHandoffOptions.accessions[0]},\r\n ${defaultHandoffOptions.accessions[1]}`)).toEqual(defaultHandoffOptions.accessions.slice(0, 2))
  })

  it('rejects empty, oversized, duplicate, unversioned and non-panel genome selections', () => {
    expect(() => parseGenomeAccessions(' \n')).toThrow('one to three')
    expect(() => validateGenomeAccessions([...defaultHandoffOptions.accessions, 'GCF_023499275.1'])).toThrow('one to three')
    expect(() => validateGenomeAccessions([defaultHandoffOptions.accessions[0], defaultHandoffOptions.accessions[0]])).toThrow('unique')
    expect(() => validateGenomeAccessions(['GCF_000468955'])).toThrow('versioned')
    expect(() => validateGenomeAccessions(['GCF_999999999.999'])).toThrow('outside the frozen')
    expect(() => composeHandoff({ taskId: starterTasks[0].id, accessions: [] })).toThrow('one to three')
  })

  it('refuses request IDs that cannot pass the frozen schema', () => {
    for (const id of ['Invalid', 'request\n', '', `r${'x'.repeat(64)}`]) {
      expect(() => composeHandoff(defaultHandoffOptions, new Date(), id)).toThrow('request identifier')
    }
  })

  it('opens only verified product entry points without hidden prompt/mode/model parameters', () => {
    expect(destinations.map((destination) => destination.id)).toEqual(['chatgpt', 'work', 'codex'])
    for (const destination of destinations) {
      const { url, instruction, limitations } = composeHandoff({ taskId: starterTasks[0].id, destinationId: destination.id, context: 'Private context must not go into a URL.' })
      const parsed = new URL(url)
      expect(parsed.origin).toBe('https://chatgpt.com')
      expect(['/', '/codex']).toContain(parsed.pathname)
      expect(parsed.search).toBe('')
      expect(parsed.hash).toBe('')
      expect(destination.appliesSettings).toBe(false)
      expect(instruction).toMatch(/Copy the brief/)
      expect(limitations.join(' ')).toContain('does not start a task')
      expect(url).not.toContain('Private')
    }
  })
})

describe('workbench clipboard boundary', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  afterEach(() => {
    vi.restoreAllMocks()
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
    else Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('copies the exact brief without opening or dispatching a task', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const open = vi.spyOn(window, 'open')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { prompt } = composeHandoff(defaultHandoffOptions)
    await copyHandoff(prompt)
    expect(writeText).toHaveBeenCalledExactlyOnceWith(prompt)
    expect(open).not.toHaveBeenCalled()
  })

  it('propagates clipboard denial so the UI cannot show a false success', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } })
    await expect(copyHandoff('brief')).rejects.toThrow('Denied')
  })
})
