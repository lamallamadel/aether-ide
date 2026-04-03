import { describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '../../../state/editorStore'
import { yamlNativeExtension } from './index'

describe('yamlNativeExtension', () => {
  it('activate enregistre yaml.validate.active et dispatch un événement', () => {
    useEditorStore.setState({ activeFileId: 'x.yaml' })
    const registerCommand = vi.fn()
    yamlNativeExtension.activate({ registerCommand } as never)

    expect(registerCommand).toHaveBeenCalledWith('yaml.validate.active', expect.any(Function))

    const handler = registerCommand.mock.calls[0][1] as () => void
    const spy = vi.fn()
    window.addEventListener('aether-ai-click', spy as never)
    handler()
    expect(spy).toHaveBeenCalled()
    window.removeEventListener('aether-ai-click', spy as never)
  })

  it('yaml.validate.active ne dispatch pas sans fichier actif', () => {
    useEditorStore.setState({ activeFileId: null })
    const registerCommand = vi.fn()
    yamlNativeExtension.activate({ registerCommand } as never)
    const handler = registerCommand.mock.calls[0][1] as () => void
    const spy = vi.fn()
    window.addEventListener('aether-ai-click', spy as never)
    handler()
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('aether-ai-click', spy as never)
  })
})
