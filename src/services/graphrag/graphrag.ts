import type { ExtractedSymbol } from '../syntax/syntaxTypes'
import { getAllChunks, type RagChunkRecord, upsertChunks } from './graphragDb'
import { vectorStore } from '../db/VectorStore'
import { useEditorStore } from '../../state/editorStore'


const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(' ')
    .filter(Boolean)

const scoreText = (qTokens: string[], text: string) => {
  const hay = tokenize(text)
  if (hay.length === 0) return 0
  const freq = new Map<string, number>()
  for (const t of hay) freq.set(t, (freq.get(t) ?? 0) + 1)
  let score = 0
  for (const t of qTokens) score += (freq.get(t) ?? 0) / hay.length
  return score
}

/** Convert a character offset to a 1-based line number within content. */
const charOffsetToLine = (content: string, offset: number): number => {
  const clamped = Math.min(offset, content.length)
  let line = 1
  for (let i = 0; i < clamped; i++) {
    if (content[i] === '\n') line++
  }
  return line
}

export const buildChunksFromSymbols = (fileId: string, content: string, symbols: ExtractedSymbol[]) => {
  const out: RagChunkRecord[] = []
  const now = Date.now()
  const sorted = [...symbols].sort((a, b) => a.startIndex - b.startIndex)
  const maxChars = 2200
  for (const s of sorted) {
    const start = Math.max(0, s.startIndex)
    const end = Math.min(content.length, s.endIndex)
    if (end <= start) continue
    const text = content.slice(start, Math.min(end, start + maxChars))
    const id = `${fileId}:${start}:${end}`
    out.push({ id, fileId, startIndex: start, endIndex: end, text, symbols: [s.name], updatedAt: now })
  }

  if (out.length === 0) {
    const step = 1600
    for (let start = 0; start < content.length; start += step) {
      const end = Math.min(content.length, start + maxChars)
      const text = content.slice(start, end)
      const id = `${fileId}:${start}:${end}`
      out.push({ id, fileId, startIndex: start, endIndex: end, text, symbols: [], updatedAt: now })
    }
  }

  return out
}

function isQuotaExceeded(err: unknown): boolean {
  return !!(err && typeof err === 'object' && (err as { name?: string }).name === 'QuotaExceededError')
}

export const ingestFile = async (fileId: string, content: string, symbols: ExtractedSymbol[]) => {
  if (typeof indexedDB === 'undefined') return
  const chunks = buildChunksFromSymbols(fileId, content, symbols)
  const vectorChunks = chunks.map(c => ({
    content: c.text,
    startLine: charOffsetToLine(content, c.startIndex),
    endLine: charOffsetToLine(content, c.endIndex)
  }))

  try {
    await upsertChunks(chunks)
  } catch (err: unknown) {
    if (isQuotaExceeded(err)) useEditorStore.getState().setStorageQuotaExceeded(true)
    console.error('GraphRAG: chunk persistence failed', err)
    return
  }
  try {
    await vectorStore.persistVectors(fileId, vectorChunks)
  } catch (err: unknown) {
    if (isQuotaExceeded(err)) useEditorStore.getState().setStorageQuotaExceeded(true)
    console.error('GraphRAG: vector ingestion failed, keyword search still available', err)
  }
}

export const graphragQuery = async (query: string, topK = 20) => {
  if (typeof indexedDB === 'undefined') return []

  // Parallel Search: Vector + Keyword with Timeout
  // Attaches a .catch to the original promise to prevent unhandled rejection
  // after the timeout winner resolves. Without this, if the real promise
  // rejects AFTER the timeout fires, it produces an UnhandledPromiseRejection.
  const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    // Attach a no-op catch to prevent unhandled rejection on the loser
    const safePromise = promise.catch(() => fallback)
    return Promise.race([
      safePromise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]).catch(() => fallback)
  }

  const [vectorResults, allChunks] = await Promise.all([
    withTimeout(vectorStore.search(query, topK), 15000, []),
    withTimeout(getAllChunks(), 5000, [])
  ])

  const qTokens = tokenize(query)

  // Combine Scores via Map to merge results by ID
  const merged = new Map<string, { chunk: RagChunkRecord; score: number }>()

  // 1. Process Keyword Matches
  for (const chunk of allChunks) {
    const score = scoreText(qTokens, chunk.text)
    if (score > 0) {
      merged.set(chunk.id, { chunk, score })
    }
  }

  const results: { chunk: RagChunkRecord; score: number }[] = []

  // 2. Convert Vector Results to RagChunkRecord shape
  for (const v of vectorResults) {
    results.push({
      chunk: {
        id: v.id,
        fileId: v.fileId,
        startIndex: v.startLine,
        endIndex: v.endLine,
        text: v.content,
        symbols: [],
        updatedAt: Date.now()
      } as RagChunkRecord,
      score: v.score * 2
    })
  }

  // 3. Fill from keyword results, dedup by chunk id
  const seenIds = new Set(results.map(r => r.chunk.id))
  if (results.length < topK) {
    const keywordSorted = [...merged.values()].sort((a, b) => b.score - a.score)
    for (const k of keywordSorted) {
      if (!seenIds.has(k.chunk.id)) {
        results.push(k)
        seenIds.add(k.chunk.id)
      }
      if (results.length >= topK) break
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK)
}
