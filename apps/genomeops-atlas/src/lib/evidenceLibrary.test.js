import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkEvidenceFile, publishedEvidence } from './evidenceLibrary'

describe('published scientific evidence', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('preserves every published file byte and the recorded GitHub artifact digest', () => {
    for (const file of publishedEvidence.files) {
      const bytes = readFileSync(`${process.cwd()}/public${file.url}`)
      expect(bytes.length, file.name).toBe(file.bytes)
      expect(createHash('sha256').update(bytes).digest('hex'), file.name).toBe(file.sha256)
    }
    expect(publishedEvidence.files.find((f) => f.name === 'stage3-live-artifact.zip')?.sha256)
      .toBe('c9e4a292c00aa644b3516c7705f02d2bbfb0e8f14f3071361044ffe4dfc0128d')
  })
  it('reports missing files as unavailable rather than verified', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    expect((await checkEvidenceFile(publishedEvidence.files[0])).state).toBe('unavailable')
  })
  it('detects corrupt bytes even when their size is unchanged', async () => {
    const file = publishedEvidence.files.find((f) => f.name === 'gtotree.tre')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array(file.bytes).buffer }))
    vi.stubGlobal('crypto', { subtle: { digest: async (_algorithm, data) => createHash('sha256').update(new Uint8Array(data)).digest() } })
    expect((await checkEvidenceFile(file)).state).toBe('mismatch')
  })
  it('accepts the preserved bytes after calculating their digest', async () => {
    const file = publishedEvidence.files.find((f) => f.name === 'gtotree.tre')
    const bytes = Uint8Array.from(readFileSync(`${process.cwd()}/public${file.url}`)).buffer
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes }))
    vi.stubGlobal('crypto', { subtle: { digest: async (_algorithm, data) => createHash('sha256').update(new Uint8Array(data)).digest() } })
    expect((await checkEvidenceFile(file)).state).toBe('match')
  })
})
