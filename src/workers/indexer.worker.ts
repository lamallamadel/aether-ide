import { buildTfIdfIndex, type TfIdfIndex } from '../services/indexing/tfidfIndex'
import type { WorkerMessage, WorkerResponse } from '../services/workers/worker.types'

console.log('Indexer Worker: Script Loaded')

let index: TfIdfIndex | null = null

const MAX_FILES = 500
const MAX_FILE_CONTENT = 2 * 1024 * 1024 // 2MB per file
const MAX_QUERY_LENGTH = 5000

const post = (id: string, payload: any, error?: string) => {
  const response: WorkerResponse = { id, payload, error }
  self.postMessage(response)
}

function validateIndexBuildPayload(payload: unknown): payload is { files: Array<{ fileId: string; content: string }> } {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  if (!Array.isArray(p.files)) return false
  if (p.files.length > MAX_FILES) return false
  for (const f of p.files) {
    if (!f || typeof f !== 'object') return false
    const item = f as Record<string, unknown>
    if (typeof item.fileId !== 'string' || typeof item.content !== 'string') return false
    if (item.content.length > MAX_FILE_CONTENT) return false
  }
  return true
}

function validateIndexSearchPayload(payload: unknown): payload is { query: string; topK?: number; options?: Record<string, unknown> } {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  if (typeof p.query !== 'string') return false
  if (p.query.length > MAX_QUERY_LENGTH) return false
  return true
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data
  console.log('Indexer Worker Received:', { id, type, payloadSummary: payload?.files?.length || payload?.query })
  try {
    if (type === 'INDEX_BUILD') {
      if (!validateIndexBuildPayload(payload)) {
        post(id, null, 'Invalid INDEX_BUILD payload: expected { files: Array<{ fileId, content }> }')
        return
      }
      index = buildTfIdfIndex(payload.files)
      post(id, { docCount: index.docs.length })
      return
    }

    if (type === 'INDEX_SEARCH') {
      if (!validateIndexSearchPayload(payload)) {
        post(id, null, 'Invalid INDEX_SEARCH payload: expected { query: string }')
        return
      }
      if (!index) {
        post(id, null, 'Index not built')
        return
      }
      const results = index.search(payload.query, payload.topK, payload.options).map((r) => ({
        fileId: r.doc.fileId,
        startLine: r.doc.startLine,
        endLine: r.doc.endLine,
        score: r.score,
        snippet: r.doc.text,
      }))
      post(id, { results })
      return
    }
  } catch (e) {
    post(id, null, String(e))
  }
}
