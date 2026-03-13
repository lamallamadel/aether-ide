import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from './editorStore'

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
})
