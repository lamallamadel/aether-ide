import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { MenuBar } from './MenuBar'
import * as fsAccess from '../services/fileSystem/fileSystemAccess'

const getWorkspaceShellKind = vi.fn(() => 'browser')
const pickNativeWorkspaceRootPath = vi.fn(() => Promise.resolve(null))

vi.mock('../services/fileSystem/workspaceBackend', () => ({
  getWorkspaceShellKind: () => getWorkspaceShellKind(),
  pickNativeWorkspaceRootPath: () => pickNativeWorkspaceRootPath(),
}))

vi.mock('../services/fileSystem/fileSystemAccess', () => ({
  isSupported: vi.fn(() => false),
  pickDirectory: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('./CodeEditor', () => ({
  CodeEditor: () => null,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  getWorkspaceShellKind.mockReturnValue('browser')
  pickNativeWorkspaceRootPath.mockResolvedValue(null)
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'App.tsx',
    openFiles: ['App.tsx'],
    terminalPanelOpen: false,
    commandPaletteOpen: false,
    globalSearchOpen: false,
    goToSymbolOpen: false,
    missionControlOpen: false,
    sidebarView: 'explorer',
    sidebarVisible: true,
    aiPanelVisible: false,
    editorSplit: 'none',
    terminalDock: 'workspace',
    workspaceRootPath: null,
  })
})

describe('MenuBar', () => {
  it('renders Terminal menu button', () => {
    render(<MenuBar />)
    expect(screen.getByRole('button', { name: 'Terminal' })).toBeInTheDocument()
  })

  it('Terminal menu contains New Terminal action', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    expect(screen.getByRole('menuitem', { name: 'New Terminal' })).toBeInTheDocument()
  })

  it('New Terminal opens terminal and increments session', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)
    const initialSession = useEditorStore.getState().terminalSessionId

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    await user.click(screen.getByRole('menuitem', { name: 'New Terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)
    expect(useEditorStore.getState().terminalSessionId).toBe(initialSession + 1)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    await user.click(screen.getByRole('menuitem', { name: 'New Terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)
    expect(useEditorStore.getState().terminalSessionId).toBe(initialSession + 2)
  })

  it('View menu contains Open Settings', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Open Settings' })).toBeInTheDocument()
  })

  it('Preferences menu opens settings on selected category', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'Preferences' }))
    await user.click(screen.getByRole('menuitem', { name: 'Environment' }))
    expect(useEditorStore.getState().activeFileId).toBe('__settings__')
    expect(useEditorStore.getState().settingsCategory).toBe('environment')
  })

  it('View menu contains Global Search', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Global Search' })).toBeInTheDocument()
  })

  it('File > New File calls createUntitledFile', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'New File' }))

    expect(useEditorStore.getState().activeFileId).toMatch(/^Untitled-\d+\.aether$/)
  })

  it('File > Open File opens command palette', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Open File...' }))

    expect(useEditorStore.getState().commandPaletteOpen).toBe(true)
  })

  it('File > Open Folder shows announcement when isSupported is false', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Open Folder...' }))

    await vi.waitFor(() => {
      expect(screen.getByText('File System Access non supporté. Utilisez Chrome ou Edge.')).toBeInTheDocument()
    })
  })

  it('File > Close Editor closes active file', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ activeFileId: 'App.tsx', openFiles: ['App.tsx', 'main.tsx'] })
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Close Editor' }))

    expect(useEditorStore.getState().openFiles).toEqual(['main.tsx'])
    expect(useEditorStore.getState().activeFileId).toBe('main.tsx')
  })

  it('View > Command Palette opens palette', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: 'Command Palette' }))

    expect(useEditorStore.getState().commandPaletteOpen).toBe(true)
  })

  it('View > Toggle Sidebar toggles sidebar', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    expect(useEditorStore.getState().sidebarVisible).toBe(true)
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: 'Toggle Sidebar' }))

    expect(useEditorStore.getState().sidebarVisible).toBe(false)
  })

  it('View > Toggle Word Wrap toggles word wrap', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    expect(useEditorStore.getState().editorWordWrap).toBe(false)
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: /Toggle Word Wrap/ }))

    expect(useEditorStore.getState().editorWordWrap).toBe(true)
  })

  it('View > Toggle Minimap toggles minimap', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    expect(useEditorStore.getState().editorMinimap).toBe(true)
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: /Toggle Minimap/ }))

    expect(useEditorStore.getState().editorMinimap).toBe(false)
  })

  it('Go > Go to File opens command palette', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'Go' }))
    await user.click(screen.getByRole('menuitem', { name: 'Go to File...' }))

    expect(useEditorStore.getState().commandPaletteOpen).toBe(true)
  })

  it('Go > Go to Symbol opens symbol palette', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'Go' }))
    await user.click(screen.getByRole('menuitem', { name: 'Go to Symbol...' }))

    expect(useEditorStore.getState().goToSymbolOpen).toBe(true)
  })

  it('File > Save shows workspace message when no file handle', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Save' }))

    expect(screen.getByText(/No workspace handle/)).toBeInTheDocument()
  })

  it('File > Save uses store file handle path when available', async () => {
    const user = userEvent.setup()
    const saveSpy = vi.fn().mockResolvedValue(true)
    useEditorStore.setState({
      hasFileHandle: () => true,
      saveFileToDisk: saveSpy,
    })
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Save' }))

    expect(saveSpy).toHaveBeenCalledWith('App.tsx')
    expect(screen.getByText(/Saved App\.tsx/)).toBeInTheDocument()
  })

  it('File > Save As uses saveFileAsInWorkspace', async () => {
    const user = userEvent.setup()
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('src/new-name.ts')
    const saveAsSpy = vi.fn().mockResolvedValue({ ok: true, fileId: 'src/new-name.ts' })
    useEditorStore.setState({ saveFileAsInWorkspace: saveAsSpy })
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Save As...' }))

    expect(promptSpy).toHaveBeenCalled()
    expect(saveAsSpy).toHaveBeenCalledWith('App.tsx', 'src/new-name.ts')
    await vi.waitFor(() => {
      expect(screen.getByText(/Saved as src\/new-name\.ts/)).toBeInTheDocument()
    })
  })

  it('View > Split Editor Down passe en lignes', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: 'Split Editor Down' }))
    expect(useEditorStore.getState().editorSplit).toBe('rows')
  })

  it('Run > npm annonce si runNpmScript absent', async () => {
    const user = userEvent.setup()
    getWorkspaceShellKind.mockReturnValue('electron')
    useEditorStore.setState({ workspaceRootPath: '/proj' })
    const prev = window.aetherDesktop
    window.aetherDesktop = {
      ...(prev ?? {}),
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: vi.fn(),
      writeFileRelative: vi.fn(),
      readTextRelative: vi.fn(),
    } as unknown as typeof window.aetherDesktop
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'Run' }))
    await user.click(screen.getByRole('menuitem', { name: /npm run dev/ }))
    expect(screen.getByText(/Run bridge unavailable/)).toBeInTheDocument()
    window.aetherDesktop = prev
  })

  it('Help > Welcome affiche une annonce', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'Help' }))
    await user.click(screen.getByRole('menuitem', { name: 'Welcome' }))
    const live = screen.getByRole('navigation', { name: 'Top menu' }).parentElement?.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toBe('Welcome')
  })

  it('View > Split Editor Right passe en colonnes', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: 'Split Editor Right' }))
    expect(useEditorStore.getState().editorSplit).toBe('columns')
  })

  it('View > Join Editor remet split à none', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ editorSplit: 'columns' })
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: /Join Editor/ }))
    expect(useEditorStore.getState().editorSplit).toBe('none')
  })

  it('View > Terminal dock bascule editor/workspace', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: /Terminal: dock under editor/ }))
    expect(useEditorStore.getState().terminalDock).toBe('editor')
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('menuitem', { name: /Terminal: dock to workspace bar/ }))
    expect(useEditorStore.getState().terminalDock).toBe('workspace')
  })

  it('Run > npm annonce hors Electron', async () => {
    const user = userEvent.setup()
    getWorkspaceShellKind.mockReturnValue('browser')
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'Run' }))
    await user.click(screen.getByRole('menuitem', { name: /npm run dev/ }))
    expect(screen.getByText(/Packaged npm run requires Electron/)).toBeInTheDocument()
  })

  it('Run > npm sans workspace annonce', async () => {
    const user = userEvent.setup()
    getWorkspaceShellKind.mockReturnValue('electron')
    useEditorStore.setState({ workspaceRootPath: null })
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'Run' }))
    await user.click(screen.getByRole('menuitem', { name: /npm run dev/ }))
    expect(screen.getByText(/Open a workspace folder first/)).toBeInTheDocument()
  })

  it('Run > npm appelle runNpmScript en Electron avec racine', async () => {
    const user = userEvent.setup()
    getWorkspaceShellKind.mockReturnValue('electron')
    useEditorStore.setState({ workspaceRootPath: '/proj' })
    const runNpmScript = vi.fn().mockResolvedValue({ message: 'ok' })
    const prev = window.aetherDesktop
    window.aetherDesktop = {
      ...(prev ?? {}),
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: vi.fn(),
      writeFileRelative: vi.fn(),
      readTextRelative: vi.fn(),
      runNpmScript,
    } as unknown as typeof window.aetherDesktop
    render(<MenuBar />)
    await user.click(screen.getByRole('button', { name: 'Run' }))
    await user.click(screen.getByRole('menuitem', { name: /npm run dev/ }))
    expect(runNpmScript).toHaveBeenCalledWith('/proj', 'dev')
    await vi.waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument()
    })
    window.aetherDesktop = prev
  })

  it('File > Open Folder loads project when supported and directory picked', async () => {
    const user = userEvent.setup()
    const loadSpy = vi.fn().mockResolvedValue(undefined)
    useEditorStore.setState({ loadProjectFromDirectory: loadSpy })
    vi.mocked(fsAccess.isSupported).mockReturnValue(true)
    vi.mocked(fsAccess.pickDirectory).mockResolvedValue({ name: 'mockdir' } as FileSystemDirectoryHandle)
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Open Folder...' }))

    expect(loadSpy).toHaveBeenCalled()
    expect(screen.getByText('Projet chargé')).toBeInTheDocument()
  })
})
