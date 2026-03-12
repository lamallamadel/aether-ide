import { describe, expect, it, vi } from 'vitest'
import { VectorStore, type EmbeddingProvider } from './VectorStore'

// AetherDB is mocked in src/test/setup.ts (no IndexedDB in Node)

const createMockEmbedding = (seed: number) => {
  const arr = new Float32Array(4)
  for (let i = 0; i < 4; i++) arr[i] = Math.sin(seed + i)
  return arr
}

describe('VectorStore — network cutoff resilience', () => {
  it('stores chunks without embedding when provider fails', async () => {
    const failingProvider: EmbeddingProvider = {
      embed: vi.fn().mockRejectedValue(new Error('Network error: model download failed')),
    }
    const store = new VectorStore(failingProvider)
    const healthChanges: string[] = []
    store.onHealthChange((s) => healthChanges.push(s))

    await store.persistVectors('test.ts', [
      { content: 'const x = 1', startLine: 1, endLine: 1 },
      { content: 'const y = 2', startLine: 2, endLine: 2 },
    ])

    // Should NOT throw — graceful degradation
    expect(failingProvider.embed).toHaveBeenCalledTimes(2)
    // Health should end up degraded (may or may not include 'loading' if already loading)
    expect(healthChanges).toContain('degraded')
    expect(store.health).toBe('degraded')
  })

  it('reports ready health when embedding succeeds', async () => {
    const workingProvider: EmbeddingProvider = {
      embed: vi.fn().mockResolvedValue(createMockEmbedding(42)),
    }
    const store = new VectorStore(workingProvider)
    const healthChanges: string[] = []
    store.onHealthChange((s) => healthChanges.push(s))

    await store.persistVectors('test.ts', [
      { content: 'const x = 1', startLine: 1, endLine: 1 },
    ])

    expect(healthChanges).toContain('ready')
    expect(store.health).toBe('ready')
  })

  it('sets degraded health when search embedding fails', async () => {
    let callCount = 0
    const intermittentProvider: EmbeddingProvider = {
      embed: vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount > 1) throw new Error('Network lost')
        return createMockEmbedding(1)
      }),
    }
    const store = new VectorStore(intermittentProvider)

    // First call succeeds (persist)
    await store.persistVectors('test.ts', [
      { content: 'const x = 1', startLine: 1, endLine: 1 },
    ])
    expect(store.health).toBe('ready')

    // Search fails — should return empty results, not throw
    const results = await store.search('const x')
    expect(results).toEqual([])
    expect(store.health).toBe('degraded')
  })

  it('cleans up health listener on unsubscribe', () => {
    const provider: EmbeddingProvider = {
      embed: vi.fn().mockResolvedValue(createMockEmbedding(1)),
    }
    const store = new VectorStore(provider)
    const calls: string[] = []
    const unsub = store.onHealthChange((s) => calls.push(s))

    unsub()

    // After unsubscribe, health changes should not be recorded
    // Trigger a health change internally via a type assertion
    ;(store as any).setHealth('degraded')
    expect(calls).toHaveLength(0)
  })

  it('recovers health after provider comes back online', async () => {
    let shouldFail = true
    const toggleProvider: EmbeddingProvider = {
      embed: vi.fn().mockImplementation(async () => {
        if (shouldFail) throw new Error('Offline')
        return createMockEmbedding(1)
      }),
    }
    const store = new VectorStore(toggleProvider)

    // First persist — fails
    await store.persistVectors('test.ts', [
      { content: 'const x = 1', startLine: 1, endLine: 1 },
    ])
    expect(store.health).toBe('degraded')

    // "Network recovery"
    shouldFail = false
    await store.persistVectors('test.ts', [
      { content: 'const y = 2', startLine: 2, endLine: 2 },
    ])
    expect(store.health).toBe('ready')
  })
})
