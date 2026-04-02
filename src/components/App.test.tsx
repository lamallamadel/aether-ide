import { render, screen } from '@testing-library/react'
import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import App from '../App'

vi.mock('./CodeEditor', () => ({
  CodeEditor: ({ value }: { value?: string }) => <div data-testid="code-editor">{value ?? ''}</div>,
}))

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'App.tsx',
    openFiles: ['App.tsx', 'main.tsx'],
    sidebarVisible: true,
    aiPanelVisible: true,
    commandPaletteOpen: false,
    globalSearchOpen: false,
    settingsOpen: false,
    missionControlOpen: false,
    terminalPanelOpen: false,
    aiMode: 'cloud',
      perf: { longTaskCount: 0, longTaskMaxMs: 0, slowFrameCount: 0, slowFrameMaxMs: 0 },
      worktreeChanges: {},
      editorFontSizePx: 14,
      editorWordWrap: false,
      editorMinimap: true,
      _untitledCounter: 1,
      syntaxTrees: {},
      symbolsByFile: {},
    }
  )
})

describe('App', () => {
  it('ouvre un fichier depuis la sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('README.md'))
    expect(screen.getByText('readme.md')).toBeInTheDocument()
    expect(screen.getByTestId('code-editor').textContent).toMatch(/# Aether Code/i)
  }, 15000)

  it('ouvre la palette avec Ctrl+K', async () => {
    render(<App />)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(await screen.findByPlaceholderText('Type a command or file name...')).toBeInTheDocument()
  }, 15000)

  it('ouvre les settings avec Ctrl+,', async () => {
    render(<App />)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ',', ctrlKey: true }))
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  }, 15000)

  it('intercepte Ctrl+S pour sauvegarder le fichier actif', async () => {
    const saveSpy = vi.fn().mockResolvedValue(true)
    useEditorStore.setState({
      activeFileId: 'App.tsx',
      hasFileHandle: () => true,
      saveFileToDisk: saveSpy,
    })
    render(<App />)
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith('App.tsx')
    })
  }, 15000)

  it('ouvre les settings depuis le menu View', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('button', { name: 'View' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('menuitem', { name: 'Open Settings' }).getAttribute('tabindex')).toBe('0')
    await user.click(screen.getByRole('menuitem', { name: 'Open Settings' }))
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  }, 15000)

  it('ferme le dropdown View au clic extérieur', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Open Settings' })).toBeInTheDocument()

    await user.click(document.body)
    expect(screen.queryByRole('menuitem', { name: 'Open Settings' })).not.toBeInTheDocument()
  }, 15000)

  it('ferme le dropdown View quand la palette s’ouvre', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Open Settings' })).toBeInTheDocument()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(await screen.findByPlaceholderText('Type a command or file name...')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Open Settings' })).not.toBeInTheDocument())
  }, 15000)

  it('expose tous les boutons du menu latéral au clavier', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Toggle Sidebar' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('button', { name: 'Explorer' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('button', { name: 'Open Command Palette' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('button', { name: 'Toggle AI Panel' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('button', { name: 'Toggle Terminal' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('button', { name: 'Open Settings' }).getAttribute('tabindex')).toBe('0')
  })

  it('envoie un message chat', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByPlaceholderText('Ask AI about your code (Ctrl+L)')
    await user.type(input, 'hello{enter}')
    expect(screen.getByText('hello')).toBeInTheDocument()
  }, 15000)
})
