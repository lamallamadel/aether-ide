import type { ExtensionManifest } from '../../types'

export const aetherNativeManifest: ExtensionManifest = {
  id: 'aether.native',
  name: 'Aether Native',
  version: '0.1.0',
  runtime: 'in-process',
  trusted: true,
  activationEvents: ['onStartup', 'onLanguage:aether'],
  permissions: ['workspace.read', 'workspace.search'],
  contributes: {
    commands: [{ id: 'aether.openMissionControl', title: 'Aether: Open Mission Control' }],
    languages: [{ id: 'aether', extensions: ['.aether'] }],
  },
}
