import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock WorkerBridge for tests (Worker is not defined in Node/vitest)
vi.mock('../services/workers/WorkerBridge', () => ({
  workerBridge: {
    postRequest: vi.fn((type: string) => {
      if (type === 'INDEX_BUILD') return Promise.resolve({ docCount: 0 })
      if (type === 'INDEX_SEARCH') return Promise.resolve({ results: [] })
      if (type === 'PARSE') return Promise.resolve({ tree: null, symbols: [] })
      return Promise.reject(new Error(`Unknown type: ${type}`))
    }),
  },
}))

// Partial mock VectorStore: keep VectorStore class for VectorStore.test, mock vectorStore instance for App
vi.mock('../services/db/VectorStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/db/VectorStore')>()
  return {
    ...actual,
    vectorStore: {
      onHealthChange: vi.fn(() => () => {}),
      search: vi.fn().mockResolvedValue([]),
      persistVectors: vi.fn().mockResolvedValue(undefined),
    },
  }
})

// Mock perfMonitor to avoid requestAnimationFrame-driven store updates
vi.mock('../services/perf/perfMonitor', () => ({
  startPerfMonitor: vi.fn(() => () => {}),
}))

// Mock AetherDB for tests (no IndexedDB in Node/jsdom)
vi.mock('../services/db/AetherDB', () => ({
  db: {
    getVectorsForFile: vi.fn().mockResolvedValue([]),
    upsertVectors: vi.fn().mockResolvedValue(undefined),
    getAllVectors: vi.fn().mockResolvedValue([]),
  },
}))

afterEach(() => {
  cleanup()
})

if (typeof Range !== 'undefined') {
  const proto = Range.prototype as any
  if (!proto.getClientRects) proto.getClientRects = () => []
  if (!proto.getBoundingClientRect)
    proto.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => '',
    })
}
