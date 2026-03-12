import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildChunksFromSymbols, graphragQuery } from './graphrag'

describe('buildChunksFromSymbols', () => {
  it('returns chunks from symbols', () => {
    const content = 'function foo() { return 1; }\nconst bar = 2;'
    const symbols = [
      { kind: 'function' as const, name: 'foo', startIndex: 0, endIndex: 25 },
      { kind: 'import' as const, name: 'import', startIndex: 30, endIndex: 40 },
    ]
    const chunks = buildChunksFromSymbols('file.ts', content, symbols)
    expect(chunks).toHaveLength(2)
    expect(chunks[0].fileId).toBe('file.ts')
    expect(chunks[0].text).toContain('function foo')
    expect(chunks[0].symbols).toContain('foo')
    expect(chunks[1].symbols).toContain('import')
  })

  it('returns fallback chunks when no symbols', () => {
    const content = 'line one\nline two\nline three'
    const chunks = buildChunksFromSymbols('empty.ts', content, [])
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].fileId).toBe('empty.ts')
    expect(chunks[0].text).toBeTruthy()
    expect(chunks[0].symbols).toEqual([])
  })

  it('skips invalid symbol ranges', () => {
    const content = 'x'
    const symbols = [{ kind: 'function' as const, name: 'f', startIndex: 10, endIndex: 5 }]
    const chunks = buildChunksFromSymbols('f.ts', content, symbols)
    expect(chunks).toHaveLength(1) // fallback chunk
  })
})

describe('graphragQuery', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined)
  })

  it('returns empty array when indexedDB is undefined', async () => {
    const result = await graphragQuery('test query')
    expect(result).toEqual([])
  })
})
