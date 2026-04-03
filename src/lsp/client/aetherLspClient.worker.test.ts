import { afterEach, describe, expect, it, vi } from 'vitest'

describe('AetherLspClient (Worker mock)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('initialize et didOpen via worker embarqué', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage = vi.fn((data: { id: string; method?: string }) => {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              id: data.id,
              result:
                data.method === 'textDocument/didOpen'
                  ? { tree: null, symbols: [], diagnostics: [] }
                  : { capabilities: {} },
            },
          } as MessageEvent)
        })
      })
      terminate = vi.fn()
      constructor(..._args: unknown[]) {}
    }
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker)
    const { AetherLspClient } = await import('./aetherLspClient')
    const client = new AetherLspClient('embedded')
    await expect(client.initialize()).resolves.toEqual({ capabilities: {} })
    await expect(client.didOpen('file:///x.ts', 'const x = 1')).resolves.toMatchObject({ diagnostics: [] })
  })
})
