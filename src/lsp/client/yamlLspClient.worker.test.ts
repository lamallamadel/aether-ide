import { afterEach, describe, expect, it, vi } from 'vitest'

describe('YamlLspClient (Worker mock)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('didChange via worker embarqué', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage = vi.fn((data: { id: string }) => {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              id: data.id,
              result: { tree: null, symbols: [], diagnostics: [] },
            },
          } as MessageEvent)
        })
      })
      terminate = vi.fn()
      constructor(..._args: unknown[]) {}
    }
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker)
    const { YamlLspClient } = await import('./yamlLspClient')
    const client = new YamlLspClient('embedded')
    await expect(client.didChange('file:///a.yaml', 'k: v')).resolves.toMatchObject({ diagnostics: [] })
  })
})
