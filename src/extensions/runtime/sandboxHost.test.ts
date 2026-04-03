import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExtensionModule } from '../types'

const minimalModule = (id: string): ExtensionModule => ({
  manifest: {
    id,
    version: '1',
    name: 't',
    runtime: 'sandbox',
    trusted: true,
    activationEvents: ['onStartup'],
    permissions: [],
  },
  activate: () => {},
})

describe('SandboxExtensionHost', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('sans Worker global, activate résout true', async () => {
    vi.stubGlobal('Worker', undefined)
    const { SandboxExtensionHost } = await import('./sandboxHost')
    const host = new SandboxExtensionHost()
    await expect(host.activate(minimalModule('ext.test'))).resolves.toBe(true)
    host.dispose()
  })

  it('avec Worker mock, postMessage et réponse ok', async () => {
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null
      constructor(..._args: unknown[]) {}
      postMessage = vi.fn((msg: { id: string }) => {
        queueMicrotask(() => {
          this.onmessage?.({ data: { id: msg.id, ok: true } } as MessageEvent)
        })
      })
      terminate = vi.fn()
    }
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker)
    const { SandboxExtensionHost } = await import('./sandboxHost')
    const host = new SandboxExtensionHost()
    await expect(host.activate(minimalModule('ext.ok'))).resolves.toBe(true)
    host.dispose()
  })
})
