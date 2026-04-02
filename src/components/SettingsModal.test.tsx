import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '../state/editorStore'
import { SettingsModal } from './SettingsModal'

beforeEach(() => {
  useEditorStore.setState({
    settingsOpen: false,
    settingsCategory: 'editor',
    editorFontSizePx: 14,
    editorMinimap: true,
    editorWordWrap: false,
    editorTheme: 'Aether',
    editorFontFamily: 'JetBrains Mono',
    ideThemeColor: 'purple',
    aiMode: 'cloud',
    lspMode: 'embedded',
    externalLspEndpoint: '',
    runtimeEnvironment: { mode: 'development', aiMode: 'cloud', lspMode: 'embedded', externalLspEndpoint: '' },
    workspaceEnvironmentStatus: 'not_loaded',
    activeWorkspaceId: null,
    resolvedEnvironment: {
      mode: 'development',
      aiMode: 'cloud',
      lspMode: 'embedded',
      externalLspEndpoint: '',
      sourceByField: { aiMode: 'runtime', lspMode: 'runtime', externalLspEndpoint: 'fallback' },
    },
  })
})

describe('SettingsModal', () => {
  it('renders null when settingsOpen is false', () => {
    const { container } = render(<SettingsModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog and categories when opened', () => {
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extensions' })).toBeInTheDocument()
  })

  it('changes active category from navigation', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)
    await user.click(screen.getByRole('button', { name: 'Servers' }))
    expect(screen.getByText('LSP Mode')).toBeInTheDocument()
    expect(useEditorStore.getState().settingsCategory).toBe('servers')
  })

  it('filters categories with search', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)
    await user.type(screen.getByRole('textbox', { name: 'Search settings' }), 'key')
    const nav = screen.getByRole('navigation', { name: 'Settings categories' })
    expect(within(nav).getByRole('button', { name: 'Keybindings' })).toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: 'Theme' })).not.toBeInTheDocument()
  })

  it('font size +/- buttons update editorFontSizePx in editor panel', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true, settingsCategory: 'editor' })
    render(<SettingsModal />)
    await user.click(screen.getByRole('button', { name: '+' }))
    expect(useEditorStore.getState().editorFontSizePx).toBe(15)
    await user.click(screen.getByRole('button', { name: '-' }))
    expect(useEditorStore.getState().editorFontSizePx).toBe(14)
  })

  it('escape clears search before closing modal', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)
    const input = screen.getByRole('textbox', { name: 'Search settings' })
    await user.type(input, 'env')
    await user.keyboard('{Escape}')
    expect(useEditorStore.getState().settingsOpen).toBe(true)
    expect((input as HTMLInputElement).value).toBe('')
    await user.keyboard('{Escape}')
    expect(useEditorStore.getState().settingsOpen).toBe(false)
  })

  it('focus trap handles Tab on last element', () => {
    useEditorStore.setState({ settingsOpen: true })
    render(<SettingsModal />)
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const focusSpy = vi.spyOn(first, 'focus')
    last.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(focusSpy).toHaveBeenCalled()
  })
})
