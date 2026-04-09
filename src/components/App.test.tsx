import { render, screen } from '@testing-library/react'
import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { vectorStore } from '../services/db/VectorStore'
import { workerBridge } from '../services/workers/WorkerBridge'
import { useEditorStore } from '../state/editorStore'
import * as networkGuard from '../services/security/networkGuard'
import App from '../App'

vi.mock('../services/security/networkGuard', () => ({
  enableZeroEgress: vi.fn(() => () => {}),
}))

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
    goToSymbolOpen: false,
    goToSymbolFilter: 'all',
    missionControlOpen: false,
    sidebarView: 'explorer',
    terminalPanelOpen: false,
    terminalDock: 'workspace',
    editorSplit: 'none',
    activeEditorPane: 'primary',
    aiQuickFixContext: null,
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
    expect(screen.getAllByText('readme.md').length).toBeGreaterThanOrEqual(1)
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
    await waitFor(() => {
      expect(useEditorStore.getState().activeFileId).toBe('__settings__')
    })
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
    await waitFor(() => {
      expect(useEditorStore.getState().activeFileId).toBe('__settings__')
    })
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

  it('enregistre indexingError si INDEX_BUILD échoue', async () => {
    vi.mocked(workerBridge.postRequest).mockRejectedValueOnce(new Error('index boom'))
    render(<App />)
    await waitFor(() => {
      expect(useEditorStore.getState().indexingError).toBe('index boom')
    })
  }, 15000)

  it('aether-ai-click définit aiQuickFixContext', () => {
    render(<App />)
    useEditorStore.setState({ activeFileId: 'main.tsx' })
    window.dispatchEvent(
      new CustomEvent('aether-ai-click', {
        detail: { kind: 'suggestion', line: 7, fileId: 'App.tsx' },
      })
    )
    expect(useEditorStore.getState().aiQuickFixContext).toEqual({
      fileId: 'App.tsx',
      line: 7,
      kind: 'suggestion',
    })
    window.dispatchEvent(
      new CustomEvent('aether-ai-click', {
        detail: { kind: 'warning', line: 2 },
      })
    )
    expect(useEditorStore.getState().aiQuickFixContext).toMatchObject({
      fileId: 'main.tsx',
      line: 2,
      kind: 'warning',
    })
  }, 15000)

  it('demande activation YAML quand le fichier actif est .yaml', async () => {
    const { extensionHost } = await import('../extensions/host')
    const spy = vi.spyOn(extensionHost, 'activateByEvent').mockResolvedValue(undefined)
    useEditorStore.setState({ activeFileId: 'config.yaml' })
    render(<App />)
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('onLanguage:yaml')
    })
    spy.mockRestore()
  }, 15000)

  it('active enableZeroEgress lorsque aiMode est local', async () => {
    useEditorStore.setState({ aiMode: 'local' })
    render(<App />)
    await waitFor(() => {
      expect(vi.mocked(networkGuard.enableZeroEgress)).toHaveBeenCalled()
    })
  }, 15000)

  it('mappe vectorStore.onHealthChange vers aiHealth', () => {
    render(<App />)
    const cb = vi.mocked(vectorStore.onHealthChange).mock.calls[0]?.[0] as (
      s: 'ready' | 'degraded' | 'error' | 'loading'
    ) => void
    expect(cb).toBeDefined()
    cb('ready')
    expect(useEditorStore.getState().aiHealth).toBe('full')
    cb('degraded')
    expect(useEditorStore.getState().aiHealth).toBe('degraded')
    cb('error')
    expect(useEditorStore.getState().aiHealth).toBe('offline')
    cb('loading')
    expect(useEditorStore.getState().aiHealth).toBe('loading')
  }, 15000)

  it('Ctrl+S ne sauvegarde pas sans fichier actif ni handle', () => {
    useEditorStore.setState({ activeFileId: null, hasFileHandle: () => false })
    render(<App />)
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    window.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    useEditorStore.setState({ activeFileId: 'App.tsx', hasFileHandle: () => false })
    const ev2 = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    window.dispatchEvent(ev2)
    expect(ev2.defaultPrevented).toBe(true)
  }, 15000)

  it('raccourcis Ctrl+B, Ctrl+L, Ctrl+` et Ctrl+Shift+O', () => {
    render(<App />)
    expect(useEditorStore.getState().sidebarVisible).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    expect(useEditorStore.getState().sidebarVisible).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }))
    expect(useEditorStore.getState().aiPanelVisible).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', ctrlKey: true }))
    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'O', ctrlKey: true, shiftKey: true })
    )
    expect(useEditorStore.getState().goToSymbolOpen).toBe(true)
  }, 15000)

  it('envoie un message chat', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByPlaceholderText('Ask AI about your code (Ctrl+L)')
    await user.type(input, 'hello{enter}')
    expect(screen.getByText('hello')).toBeInTheDocument()
  }, 15000)
})
