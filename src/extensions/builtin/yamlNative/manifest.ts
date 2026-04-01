import type { ExtensionManifest } from '../../types'

export const yamlNativeManifest: ExtensionManifest = {
  id: 'yaml.native',
  name: 'YAML Native',
  version: '0.1.0',
  runtime: 'in-process',
  trusted: true,
  activationEvents: ['onStartup', 'onLanguage:yaml'],
  permissions: ['workspace.read', 'workspace.search'],
  contributes: {
    commands: [{ id: 'yaml.validate.active', title: 'YAML: Validate Active File' }],
    languages: [{ id: 'yaml', extensions: ['.yaml', '.yml'] }],
  },
}
