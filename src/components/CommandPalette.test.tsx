import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { CommandPalette } from './CommandPalette'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    commandPaletteOpen: true,
    sidebarVisible: true,
    aiPanelVisible: true,
  })
})

describe('CommandPalette', () => {
  it('rend null quand fermée', () => {
    useEditorStore.setState({ commandPaletteOpen: false })
    const { container } = render(<CommandPalette />)
    expect(container.firstChild).toBeNull()
  })

  it('ferme avec Escape', async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText(/Type a command/), '{Escape}')
    expect(useEditorStore.getState().commandPaletteOpen).toBe(false)
  })

  it('ouvre Global Search depuis une commande', async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText(/Type a command/), 'Global Search')
    await user.keyboard('{Enter}')
    expect(useEditorStore.getState().globalSearchOpen).toBe(true)
    expect(useEditorStore.getState().commandPaletteOpen).toBe(false)
  })

  it('affiche aucun résultat pour une requête sans match', async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText(/Type a command/), 'zzzznonexistentquery')
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('ouvre un fichier filtré avec Enter', async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)
    const input = screen.getByPlaceholderText(/Type a command/)
    await user.type(input, 'readme')
    await user.keyboard('{Enter}')
    expect(useEditorStore.getState().activeFileId).toBe('readme.md')
  })
})
