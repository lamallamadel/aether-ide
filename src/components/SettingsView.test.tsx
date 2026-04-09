import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../state/editorStore'
import { SettingsView } from './SettingsView'

beforeEach(() => {
  useEditorStore.setState({
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
    sidebarView: 'explorer',
  })
})

describe('SettingsView', () => {
  it('renders categories and search', () => {
    render(<SettingsView />)
    expect(screen.getByRole('textbox', { name: 'Search settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extensions' })).toBeInTheDocument()
  })

  it('changes active category from navigation', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    await user.click(screen.getByRole('button', { name: 'Servers' }))
    expect(screen.getByText('LSP Mode')).toBeInTheDocument()
    expect(useEditorStore.getState().settingsCategory).toBe('servers')
  })

  it('filters categories with search', () => {
    render(<SettingsView />)
    const search = screen.getByRole('textbox', { name: 'Search settings' })
    fireEvent.change(search, { target: { value: 'key' } })
    const nav = screen.getByRole('navigation', { name: 'Settings categories' })
    expect(within(nav).getByRole('button', { name: 'Keybindings' })).toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: 'Theme' })).not.toBeInTheDocument()
  })

  it('font size +/- buttons update editorFontSizePx in editor panel', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ settingsCategory: 'editor' })
    render(<SettingsView />)
    await user.click(screen.getByRole('button', { name: '+' }))
    expect(useEditorStore.getState().editorFontSizePx).toBe(15)
    await user.click(screen.getByRole('button', { name: '-' }))
    expect(useEditorStore.getState().editorFontSizePx).toBe(14)
  })
})
