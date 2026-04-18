import { useEditorStore } from '../../../state/editorStore'
import { useRunStore } from '../../../run/runStore'
import type { ExtensionModule } from '../../types'
import { aetherNativeManifest } from './manifest'
import { launchWindQuick } from '../../../run/runEngine'

export const aetherNativeExtension: ExtensionModule = {
  manifest: aetherNativeManifest,
  async activate(api) {
    api.registerCommand('aether.openMissionControl', () => {
      useEditorStore.getState().setMissionControlOpen(true)
    })

    const windIfPresent = (cmd: Parameters<typeof launchWindQuick>[0]) => {
      if (!useEditorStore.getState().workspaceHasWindToml) return
      void launchWindQuick(cmd).then(() => useRunStore.getState().openBottomPanel())
    }

    api.registerCommand('wind.build', () => {
      windIfPresent('build')
    })
    api.registerCommand('wind.run', () => {
      windIfPresent('run')
    })
    api.registerCommand('wind.check', () => {
      windIfPresent('check')
    })
    api.registerCommand('wind.test', () => {
      windIfPresent('test')
    })
  },
}
