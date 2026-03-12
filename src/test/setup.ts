import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock AetherDB for tests (no IndexedDB in Node/jsdom) — VectorStore and graphrag depend on it
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
