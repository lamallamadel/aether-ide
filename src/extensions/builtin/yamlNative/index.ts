import { useEditorStore } from '../../../state/editorStore'
import type { ExtensionModule } from '../../types'
import { yamlNativeManifest } from './manifest'

export const yamlNativeExtension: ExtensionModule = {
  manifest: yamlNativeManifest,
  activate(api) {
    api.registerCommand('yaml.validate.active', () => {
      const activeFile = useEditorStore.getState().activeFileId
      if (!activeFile) return
      window.dispatchEvent(new CustomEvent('aether-ai-click', { detail: { type: 'suggestion', source: 'yaml.validate.active' } }))
    })
  },
}
