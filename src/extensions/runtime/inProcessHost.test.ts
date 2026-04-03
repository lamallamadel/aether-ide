import { describe, expect, it, vi } from 'vitest'
import { InProcessExtensionHost } from './inProcessHost'
import type { ExtensionModule } from '../types'

const minimal = (id: string, activate: ExtensionModule['activate']): ExtensionModule => ({
  manifest: {
    id,
    version: '1',
    name: id,
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup'],
    permissions: [],
  },
  activate,
})

describe('InProcessExtensionHost', () => {
  it('enregistre et exécute une commande', async () => {
    const host = new InProcessExtensionHost()
    const handler = vi.fn()
    const mod = minimal('ext.ip', (api) => {
      api.registerCommand('cmd.test', handler)
    })
    await host.activate(mod)
    const ok = await host.executeCommand('cmd.test', { activeFileId: 'x.ts' })
    expect(ok).toBe(true)
    expect(handler).toHaveBeenCalledWith({ activeFileId: 'x.ts' })
  })

  it('executeCommand retourne false si commande inconnue', async () => {
    const host = new InProcessExtensionHost()
    await host.activate(minimal('ext2', () => {}))
    expect(await host.executeCommand('missing', { activeFileId: null })).toBe(false)
  })

  it('deactivate appelle deactivate du module', async () => {
    const deactivate = vi.fn()
    const host = new InProcessExtensionHost()
    await host.activate({
      ...minimal('ext3', () => {}),
      deactivate,
    })
    await host.deactivate({ ...minimal('ext3', () => {}), deactivate })
    expect(deactivate).toHaveBeenCalled()
  })
})
