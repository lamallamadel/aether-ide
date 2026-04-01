import { useEditorStore } from '../../../state/editorStore'
import type { ExtensionModule } from '../../types'
import { aetherNativeManifest } from './manifest'

export const aetherNativeExtension: ExtensionModule = {
  manifest: aetherNativeManifest,
  async activate(api) {
    api.registerCommand('aether.openMissionControl', () => {
      useEditorStore.getState().setMissionControlOpen(true)
    })
  },
}
