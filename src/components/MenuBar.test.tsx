import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { MenuBar } from './MenuBar'
import * as fsAccess from '../services/fileSystem/fileSystemAccess'

vi.mock('../services/fileSystem/fileSystemAccess', () => ({
  isSupported: vi.fn(() => false),
  pickDirectory: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('./CodeEditor', () => ({
  CodeEditor: () => null,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'App.tsx',
    openFiles: ['App.tsx'],
    terminalPanelOpen: false,
    commandPaletteOpen: false,
    globalSearchOpen: false,
    settingsOpen: false,
    missionControlOpen: false,
    sidebarVisible: true,
    aiPanelVisible: false,
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

  it('New Terminal toggles terminalPanelOpen', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    await user.click(screen.getByRole('menuitem', { name: 'New Terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Terminal' }))
    await user.click(screen.getByRole('menuitem', { name: 'New Terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)
  })

  it('View menu contains Open Settings', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('menuitem', { name: 'Open Settings' })).toBeInTheDocument()
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

    expect(useEditorStore.getState().activeFileId).toMatch(/^Untitled-\d+\.ts$/)
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

  it('Go > Go to Symbol opens global search', async () => {
    const user = userEvent.setup()
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'Go' }))
    await user.click(screen.getByRole('menuitem', { name: 'Go to Symbol...' }))

    expect(useEditorStore.getState().globalSearchOpen).toBe(true)
  })

  it('File > Save downloads active file when no file handle', async () => {
    const user = userEvent.setup()
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:menu-test')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Save' }))

    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalled()
    expect(screen.getByText(/Downloaded App\.tsx/)).toBeInTheDocument()
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

  it('File > Save As downloads active file', async () => {
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:menu-test-2')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    render(<MenuBar />)

    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(screen.getByRole('menuitem', { name: 'Save As...' }))

    expect(clickSpy).toHaveBeenCalled()
    expect(screen.getByText(/Downloaded App\.tsx/)).toBeInTheDocument()
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
