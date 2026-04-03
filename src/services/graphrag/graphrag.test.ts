import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { vectorStore } from '../db/VectorStore'
import { useEditorStore } from '../../state/editorStore'
import { getAllChunks, upsertChunks } from './graphragDb'
import { buildChunksFromSymbols, graphragQuery, ingestFile } from './graphrag'

const mockChunks = [
  {
    id: 'f1:0:50',
    fileId: 'f1.ts',
    startIndex: 0,
    endIndex: 50,
    text: 'function hello world example',
    symbols: ['hello'],
    updatedAt: Date.now(),
  },
  {
    id: 'f2:0:30',
    fileId: 'f2.ts',
    startIndex: 0,
    endIndex: 30,
    text: 'export const foo bar',
    symbols: ['foo'],
    updatedAt: Date.now(),
  },
]

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

  it('caps chunk text at maxChars', () => {
    const longContent = 'x'.repeat(3000)
    const symbols = [{ kind: 'function' as const, name: 'f', startIndex: 0, endIndex: 3000 }]
    const chunks = buildChunksFromSymbols('f.ts', longContent, symbols)
    expect(chunks[0].text.length).toBeLessThanOrEqual(2200)
  })

  it('sorts symbols by startIndex', () => {
    const content = 'a b c d e'
    const symbols = [
      { kind: 'function' as const, name: 'z', startIndex: 8, endIndex: 9 },
      { kind: 'function' as const, name: 'a', startIndex: 0, endIndex: 1 },
    ]
    const chunks = buildChunksFromSymbols('f.ts', content, symbols)
    expect(chunks[0].symbols).toContain('a')
    expect(chunks[1].symbols).toContain('z')
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

describe('graphragQuery with indexedDB', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', {})
    vi.mocked(getAllChunks).mockResolvedValue(mockChunks)
  })

  it('returns keyword results when indexedDB and chunks exist', async () => {
    const result = await graphragQuery('hello')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].chunk.text).toContain('hello')
    expect(result[0].score).toBeGreaterThan(0)
  })

  it('respects topK limit', async () => {
    const result = await graphragQuery('function', 1)
    expect(result).toHaveLength(1)
  })

  it('returns empty when no matches', async () => {
    const result = await graphragQuery('xyznonexistenttoken123')
    expect(result).toEqual([])
  })

  it('fusionne résultats vectoriels et mots-clés', async () => {
    vi.mocked(vectorStore.search).mockResolvedValueOnce([
      {
        id: 'vec1',
        fileId: 'vec.ts',
        content: 'vector only',
        startLine: 0,
        endLine: 3,
        score: 0.9,
      } as never,
    ])
    const result = await graphragQuery('hello', 5)
    expect(result.some((r) => r.chunk.fileId === 'vec.ts')).toBe(true)
    expect(result.some((r) => r.chunk.text.includes('hello'))).toBe(true)
  })
})

describe('ingestFile', () => {
  afterEach(() => {
    useEditorStore.setState({ storageQuotaExceeded: false })
  })

  it('no-op sans indexedDB', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await ingestFile('a.ts', 'x', [])
    expect(vi.mocked(upsertChunks)).not.toHaveBeenCalled()
  })

  it('marque quota dépassé si upsertChunks lève QuotaExceededError', async () => {
    vi.stubGlobal('indexedDB', {})
    vi.mocked(upsertChunks).mockRejectedValueOnce(Object.assign(new Error('quota'), { name: 'QuotaExceededError' }))
    await ingestFile('q.ts', 'c', [])
    expect(useEditorStore.getState().storageQuotaExceeded).toBe(true)
  })

  it('marque quota si persistVectors lève QuotaExceededError', async () => {
    vi.stubGlobal('indexedDB', {})
    vi.mocked(upsertChunks).mockResolvedValueOnce(undefined)
    vi.mocked(vectorStore.persistVectors).mockRejectedValueOnce(
      Object.assign(new Error('quota'), { name: 'QuotaExceededError' })
    )
    await ingestFile('p.ts', 'content', [])
    expect(useEditorStore.getState().storageQuotaExceeded).toBe(true)
  })
})
