import { describe, expect, it } from 'vitest'
import { chunkByTokenLimit, chunkByLines } from './chunking'

describe('chunkByTokenLimit', () => {
  it('returns single chunk when content is small', () => {
    const content = 'line one\nline two\nline three'
    const docs = chunkByTokenLimit('file.ts', content, 500)
    expect(docs).toHaveLength(1)
    expect(docs[0].fileId).toBe('file.ts')
    expect(docs[0].text).toBe(content)
    expect(docs[0].startLine).toBe(1)
    expect(docs[0].endLine).toBe(3)
    expect(docs[0].id).toContain('file.ts')
  })

  it('splits into multiple chunks when exceeding maxTokens', () => {
    const lines = Array.from({ length: 200 }, (_, i) => `Line ${i} with some content`)
    const content = lines.join('\n')
    const docs = chunkByTokenLimit('big.ts', content, 50)
    expect(docs.length).toBeGreaterThan(1)
    expect(docs.every((d) => d.fileId === 'big.ts')).toBe(true)
    const totalText = docs.map((d) => d.text).join('\n')
    expect(totalText).toBe(content)
  })

  it('uses custom maxTokensPerChunk', () => {
    const content = 'a\nb\nc\nd\ne'
    const docs = chunkByTokenLimit('f.ts', content, 2)
    expect(docs.length).toBeGreaterThanOrEqual(1)
  })
})

describe('chunkByLines', () => {
  it('returns chunks by line count', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`)
    const content = lines.join('\n')
    const docs = chunkByLines('file.ts', content, 25)
    expect(docs).toHaveLength(4)
    expect(docs[0].startLine).toBe(1)
    expect(docs[0].endLine).toBe(25)
    expect(docs[1].startLine).toBe(26)
    expect(docs[1].endLine).toBe(50)
  })

  it('handles content shorter than maxLinesPerChunk', () => {
    const content = 'one\ntwo\nthree'
    const docs = chunkByLines('short.ts', content, 50)
    expect(docs).toHaveLength(1)
    expect(docs[0].text).toBe(content)
    expect(docs[0].startLine).toBe(1)
    expect(docs[0].endLine).toBe(3)
  })

  it('uses custom maxLinesPerChunk', () => {
    const content = 'a\nb\nc\nd\ne'
    const docs = chunkByLines('f.ts', content, 2)
    expect(docs).toHaveLength(3)
    expect(docs[0].endLine - docs[0].startLine + 1).toBe(2)
  })
})
