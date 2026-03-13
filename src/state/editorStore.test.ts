import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import {
  findNode as findNodeUtil,
  toggleNode,
  updateFileContentInTree,
  insertFileIntoFolder,
  useEditorStore,
} from './editorStore'

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
    expect(state.activeFileId).toMatch(/^Untitled-\d+\.ts$/)
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
})
