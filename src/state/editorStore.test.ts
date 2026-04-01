import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileNode } from '../domain/fileNode'
import { INITIAL_FILES } from '../domain/fileNode'
import {
  findNode as findNodeUtil,
  toggleNode,
  updateFileContentInTree,
  insertFileIntoFolder,
  useEditorStore,
} from './editorStore'

vi.mock('../services/fileSystem/fileSystemAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/fileSystem/fileSystemAccess')>()
  const mockFiles: FileNode[] = [
    {
      id: 'root',
      name: 'test-project',
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'src/newfile.ts',
          name: 'newfile.ts',
          type: 'file',
          language: 'typescript',
          parentId: 'src',
          content: 'export const x = 1',
        },
      ],
    },
  ]
  return {
    ...actual,
    readDirectoryRecursive: vi.fn().mockResolvedValue({
      files: mockFiles,
      fileHandles: { 'src/newfile.ts': {} as FileSystemFileHandle },
    }),
    writeFileContent: vi.fn().mockResolvedValue(undefined),
  }
})

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    fileHandles: {},
    activeFileId: 'App.tsx',
    openFiles: ['App.tsx', 'main.tsx'],
    sidebarVisible: true,
    aiPanelVisible: true,
    commandPaletteOpen: false,
    globalSearchOpen: false,
    settingsOpen: false,
    missionControlOpen: false,
    terminalPanelOpen: false,
    terminalPanelHeight: 200,
    aiMode: 'cloud',
    perf: { longTaskCount: 0, longTaskMaxMs: 0, slowFrameCount: 0, slowFrameMaxMs: 0 },
    worktreeChanges: {},
    editorFontSizePx: 14,
    editorWordWrap: false,
    editorMinimap: true,
    _untitledCounter: 1,
    syntaxTrees: {},
    symbolsByFile: {},
  })
})

describe('editorStore', () => {
  it('openFile active et pas de doublon', () => {
    const { openFile } = useEditorStore.getState()
    openFile('main.tsx')
    openFile('main.tsx')
    const state = useEditorStore.getState()
    expect(state.activeFileId).toBe('main.tsx')
    expect(state.openFiles.filter((id) => id === 'main.tsx')).toHaveLength(1)
  })

  it('closeFile choisit le dernier onglet restant', () => {
    const { closeFile } = useEditorStore.getState()
    closeFile('App.tsx')
    const state = useEditorStore.getState()
    expect(state.openFiles).toEqual(['main.tsx'])
    expect(state.activeFileId).toBe('main.tsx')
  })

  it('toggleFolder inverse isOpen', () => {
    const { toggleFolder, findNode } = useEditorStore.getState()
    const before = findNode('utils')
    expect(before?.type).toBe('folder')
    toggleFolder('utils')
    const after = useEditorStore.getState().findNode('utils')
    expect(after?.isOpen).toBe(!before?.isOpen)
  })

  it('getFileContent retourne le contenu', () => {
    const { getFileContent } = useEditorStore.getState()
    expect(getFileContent('readme.md')).toContain('# Aether Code')
  })

  it('toggleTerminalPanel inverse terminalPanelOpen', () => {
    const { toggleTerminalPanel } = useEditorStore.getState()
    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)
    toggleTerminalPanel()
    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)
    toggleTerminalPanel()
    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)
  })

  it('setTerminalPanelOpen et setTerminalPanelHeight', () => {
    const { setTerminalPanelOpen, setTerminalPanelHeight } = useEditorStore.getState()
    setTerminalPanelOpen(true)
    expect(useEditorStore.getState().terminalPanelOpen).toBe(true)
    setTerminalPanelHeight(300)
    expect(useEditorStore.getState().terminalPanelHeight).toBe(300)
  })

  it('hasFileHandle retourne false sans handle, true avec', () => {
    const { hasFileHandle } = useEditorStore.getState()
    expect(hasFileHandle('App.tsx')).toBe(false)
    useEditorStore.setState({
      fileHandles: { 'App.tsx': {} as FileSystemFileHandle },
    })
    expect(hasFileHandle('App.tsx')).toBe(true)
  })

  it('upsertWorktreeChange ajoute une modification', () => {
    const { upsertWorktreeChange } = useEditorStore.getState()
    upsertWorktreeChange({
      fileId: 'App.tsx',
      originalContent: 'hello',
      proposedContent: 'hi',
    })
    const state = useEditorStore.getState()
    expect(state.worktreeChanges['App.tsx']).toEqual({
      fileId: 'App.tsx',
      originalContent: 'hello',
      proposedContent: 'hi',
    })
  })

  it('rejectWorktreeChange retire une modification', () => {
    const { upsertWorktreeChange, rejectWorktreeChange } = useEditorStore.getState()
    upsertWorktreeChange({ fileId: 'App.tsx', originalContent: 'a', proposedContent: 'b' })
    rejectWorktreeChange('App.tsx')
    expect(useEditorStore.getState().worktreeChanges).toEqual({})
  })

  it('applyWorktreeChange applique le contenu et retire la modif', () => {
    const { upsertWorktreeChange, applyWorktreeChange, getFileContent } = useEditorStore.getState()
    upsertWorktreeChange({
      fileId: 'App.tsx',
      originalContent: 'Welcome to Aether Code',
      proposedContent: 'Bienvenue sur Aether Code',
    })
    applyWorktreeChange('App.tsx')
    expect(getFileContent('App.tsx')).toContain('Bienvenue')
    expect(useEditorStore.getState().worktreeChanges).toEqual({})
  })

  it('clearWorktree vide toutes les modifications', () => {
    const { upsertWorktreeChange, clearWorktree } = useEditorStore.getState()
    upsertWorktreeChange({ fileId: 'App.tsx', originalContent: 'a', proposedContent: 'b' })
    upsertWorktreeChange({ fileId: 'main.tsx', originalContent: 'x', proposedContent: 'y' })
    clearWorktree()
    expect(useEditorStore.getState().worktreeChanges).toEqual({})
  })

  it('createUntitledFile crée un fichier et l\'ouvre', () => {
    const { createUntitledFile, findNode } = useEditorStore.getState()
    createUntitledFile()
    const state = useEditorStore.getState()
    expect(state.activeFileId).toMatch(/^Untitled-\d+\.aether$/)
    expect(findNode(state.activeFileId!)).toBeTruthy()
    expect(state.openFiles).toContain(state.activeFileId)
  })

  it('setEditorFontSizePx, toggleEditorWordWrap, toggleEditorMinimap', () => {
    const { setEditorFontSizePx, toggleEditorWordWrap, toggleEditorMinimap } = useEditorStore.getState()
    setEditorFontSizePx(16)
    expect(useEditorStore.getState().editorFontSizePx).toBe(16)
    toggleEditorWordWrap()
    expect(useEditorStore.getState().editorWordWrap).toBe(true)
    toggleEditorMinimap()
    expect(useEditorStore.getState().editorMinimap).toBe(false)
  })

  it('setMissionControlOpen, setGlobalSearchOpen, setSettingsOpen', () => {
    const { setMissionControlOpen, setGlobalSearchOpen, setSettingsOpen } = useEditorStore.getState()
    setMissionControlOpen(true)
    expect(useEditorStore.getState().missionControlOpen).toBe(true)
    setGlobalSearchOpen(true)
    expect(useEditorStore.getState().globalSearchOpen).toBe(true)
    setSettingsOpen(true)
    expect(useEditorStore.getState().settingsOpen).toBe(true)
  })

  it('setSyntaxForFile met à jour syntaxTrees et symbolsByFile', () => {
    const { setSyntaxForFile } = useEditorStore.getState()
    const tree = { root: { type: 'PROGRAM' as const, children: [] } }
    const symbols = [{ kind: 'variable' as const, name: 'x', startIndex: 0, endIndex: 5 }]
    setSyntaxForFile('App.tsx', tree, symbols)
    const state = useEditorStore.getState()
    expect(state.syntaxTrees['App.tsx']).toEqual(tree)
    expect(state.symbolsByFile['App.tsx']).toEqual(symbols)
  })

  it('setActiveFile change le fichier actif', () => {
    const { setActiveFile } = useEditorStore.getState()
    setActiveFile('readme.md')
    expect(useEditorStore.getState().activeFileId).toBe('readme.md')
  })

  it('setFileContent met à jour le contenu d\'un fichier', () => {
    const { setFileContent, getFileContent } = useEditorStore.getState()
    setFileContent('App.tsx', 'const x = 42')
    expect(getFileContent('App.tsx')).toBe('const x = 42')
  })

  it('setCommandPaletteOpen, setIndexingError, setStorageQuotaExceeded, setPerf', () => {
    const { setCommandPaletteOpen, setIndexingError, setStorageQuotaExceeded, setPerf } =
      useEditorStore.getState()
    setCommandPaletteOpen(true)
    expect(useEditorStore.getState().commandPaletteOpen).toBe(true)
    setIndexingError('Index failed')
    expect(useEditorStore.getState().indexingError).toBe('Index failed')
    setStorageQuotaExceeded(true)
    expect(useEditorStore.getState().storageQuotaExceeded).toBe(true)
    setPerf({ longTaskCount: 5, longTaskMaxMs: 100, slowFrameCount: 2, slowFrameMaxMs: 50 })
    expect(useEditorStore.getState().perf.longTaskCount).toBe(5)
  })

  it('setEditorTheme, setEditorFontFamily, setIdeThemeColor', () => {
    const { setEditorTheme, setEditorFontFamily, setIdeThemeColor } = useEditorStore.getState()
    setEditorTheme('Nord')
    expect(useEditorStore.getState().editorTheme).toBe('Nord')
    setEditorFontFamily('Fira Code')
    expect(useEditorStore.getState().editorFontFamily).toBe('Fira Code')
    setIdeThemeColor('cyan')
    expect(useEditorStore.getState().ideThemeColor).toBe('cyan')
  })

  it('applyWorktreeChange sans modification existante ne fait rien', () => {
    const { applyWorktreeChange, getFileContent } = useEditorStore.getState()
    const before = getFileContent('App.tsx')
    applyWorktreeChange('App.tsx')
    expect(getFileContent('App.tsx')).toBe(before)
  })

  it('closeFile avec seul onglet ouvert met activeFileId à null', () => {
    useEditorStore.setState({ openFiles: ['App.tsx'], activeFileId: 'App.tsx' })
    const { closeFile } = useEditorStore.getState()
    closeFile('App.tsx')
    const state = useEditorStore.getState()
    expect(state.openFiles).toEqual([])
    expect(state.activeFileId).toBeNull()
  })

  it('executeEditorCommand retourne false quand aucun runner enregistré', () => {
    const { executeEditorCommand } = useEditorStore.getState()
    expect(executeEditorCommand('undo')).toBe(false)
    expect(executeEditorCommand('copy')).toBe(false)
  })

  it('executeEditorCommand délègue au runner quand enregistré', () => {
    const { setEditorCommandRunner, executeEditorCommand } = useEditorStore.getState()
    const mockRunner = vi.fn().mockReturnValue(true)
    setEditorCommandRunner(mockRunner)
    expect(executeEditorCommand('undo')).toBe(true)
    expect(mockRunner).toHaveBeenCalledWith('undo')
    setEditorCommandRunner(null)
    expect(executeEditorCommand('redo')).toBe(false)
  })

  it('loadProjectFromDirectory charge les fichiers et ouvre le premier', async () => {
    const { loadProjectFromDirectory } = useEditorStore.getState()
    const mockHandle = { name: 'test-project' } as FileSystemDirectoryHandle
    await loadProjectFromDirectory(mockHandle)
    const state = useEditorStore.getState()
    expect(state.files[0].name).toBe('test-project')
    expect(state.openFiles).toContain('src/newfile.ts')
    expect(state.activeFileId).toBe('src/newfile.ts')
    expect(state.worktreeChanges).toEqual({})
  })

  it('loadProjectFromDirectory met indexingError en cas d\'erreur', async () => {
    const { readDirectoryRecursive } = await import('../services/fileSystem/fileSystemAccess')
    ;(readDirectoryRecursive as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Access denied'))
    const { loadProjectFromDirectory } = useEditorStore.getState()
    const mockHandle = {} as FileSystemDirectoryHandle
    await loadProjectFromDirectory(mockHandle)
    expect(useEditorStore.getState().indexingError).toBe('Access denied')
  })

  it('saveFileToDisk retourne false sans handle', async () => {
    const { saveFileToDisk } = useEditorStore.getState()
    expect(await saveFileToDisk('App.tsx')).toBe(false)
  })

  it('saveFileToDisk écrit le contenu et retourne true avec handle', async () => {
    useEditorStore.setState({
      fileHandles: { 'App.tsx': {} as FileSystemFileHandle },
    })
    const { saveFileToDisk } = useEditorStore.getState()
    const ok = await saveFileToDisk('App.tsx')
    expect(ok).toBe(true)
    const { writeFileContent } = await import('../services/fileSystem/fileSystemAccess')
    expect(writeFileContent).toHaveBeenCalled()
  })
})
