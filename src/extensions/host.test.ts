import { describe, expect, it } from 'vitest'
import { ExtensionHost } from './host'
import type { ExtensionModule } from './types'

const createExtension = (id: string, permissions: Array<'workspace.read' | 'workspace.search' | 'network'>): ExtensionModule => ({
  manifest: {
    id,
    name: id,
    version: '0.1.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup'],
    permissions,
  },
  activate: (api) => {
    api.registerCommand(`${id}.ping`, () => {})
  },
})

describe('ExtensionHost', () => {
  it('activates on startup and exposes permissions', async () => {
    const host = new ExtensionHost()
    host.register(createExtension('aether.native.test', ['workspace.read']))
    await host.activateByEvent('onStartup')

    const entries = host.list()
    expect(entries[0]?.state).toBe('active')
    expect(host.hasPermission('workspace.read')).toBe(true)
  })

  it('activates extension on language event', async () => {
    const host = new ExtensionHost()
    host.register({
      ...createExtension('yaml.native.test', ['workspace.search']),
      manifest: {
        ...createExtension('yaml.native.test', ['workspace.search']).manifest,
        activationEvents: ['onLanguage:yaml'],
      },
    })

    await host.activateByEvent('onLanguage:yaml')
    const yamlEntry = host.list().find((entry) => entry.module.manifest.id === 'yaml.native.test')
    expect(yamlEntry?.state).toBe('active')
    expect(host.hasPermission('workspace.search')).toBe(true)
  })
})
