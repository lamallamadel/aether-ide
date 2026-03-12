import { create } from 'zustand'
import type { FileNode } from '../domain/fileNode'
import { INITIAL_FILES } from '../domain/fileNode'
import type { ExtractedSymbol, SerializedTree } from '../services/syntax/syntaxTypes'
import type { PerfMetrics } from '../services/perf/perfMonitor'

export type AiHealthStatus = 'full' | 'degraded' | 'offline' | 'loading'

/** Commands exécutables depuis le MenuBar vers CodeMirror */
export type EditorCommand = 'undo' | 'redo' | 'copy' | 'cut' | 'paste' | 'selectAll'

export interface EditorState {
  files: FileNode[]
  activeFileId: string | null
  openFiles: string[]
  sidebarVisible: boolean
  aiPanelVisible: boolean
  commandPaletteOpen: boolean
  globalSearchOpen: boolean
  settingsOpen: boolean
  missionControlOpen: boolean
  aiMode: 'cloud' | 'local'
  aiHealth: AiHealthStatus
  indexingError: string | null
  storageQuotaExceeded: boolean
  perf: PerfMetrics
  worktreeChanges: Record<string, { fileId: string; originalContent: string; proposedContent: string }>
  editorFontSizePx: number
  editorWordWrap: boolean
  editorMinimap: boolean
  editorTheme: string
  editorFontFamily: string
  ideThemeColor: string
  _untitledCounter: number
  syntaxTrees: Record<string, SerializedTree>
  symbolsByFile: Record<string, ExtractedSymbol[]>

  toggleFolder: (folderId: string) => void
  openFile: (fileId: string) => void
  closeFile: (fileId: string) => void
  setActiveFile: (fileId: string) => void
  setFileContent: (fileId: string, content: string) => void
  setSyntaxForFile: (fileId: string, tree: SerializedTree, symbols: ExtractedSymbol[]) => void
  toggleSidebar: () => void
  toggleAiPanel: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setGlobalSearchOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setMissionControlOpen: (open: boolean) => void
  setAiMode: (mode: 'cloud' | 'local') => void
  setAiHealth: (status: AiHealthStatus) => void
  setIndexingError: (error: string | null) => void
  setStorageQuotaExceeded: (exceeded: boolean) => void
  setPerf: (metrics: PerfMetrics) => void
  getFileContent: (fileId: string) => string
  findNode: (id: string) => FileNode | null
  setEditorFontSizePx: (value: number) => void
  toggleEditorWordWrap: () => void
  toggleEditorMinimap: () => void
  setEditorTheme: (theme: string) => void
  setEditorFontFamily: (font: string) => void
  setIdeThemeColor: (color: string) => void
  createUntitledFile: () => void
  upsertWorktreeChange: (change: { fileId: string; originalContent: string; proposedContent: string }) => void
  rejectWorktreeChange: (fileId: string) => void
  applyWorktreeChange: (fileId: string) => void
  clearWorktree: () => void
  /** Exécute une commande sur l'éditeur actif. Retourne false si aucune vue ou commande non dispo. */
  executeEditorCommand: (cmd: EditorCommand) => boolean
  /** Enregistré par CodeEditor au mount, null au unmount. */
  setEditorCommandRunner: (runner: ((cmd: EditorCommand) => boolean) | null) => void
  editorCommandRunner: ((cmd: EditorCommand) => boolean) | null
}

export const findNode = (nodes: FileNode[], id: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

export const toggleNode = (nodes: FileNode[], id: string): FileNode[] => {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, isOpen: !node.isOpen }
    if (node.children) return { ...node, children: toggleNode(node.children, id) }
    return node
  })
}

export const updateFileContentInTree = (nodes: FileNode[], fileId: string, content: string): FileNode[] => {
  return nodes.map((node) => {
    if (node.id === fileId && node.type === 'file') return { ...node, content }
    if (node.children) return { ...node, children: updateFileContentInTree(node.children, fileId, content) }
    return node
  })
}

export const insertFileIntoFolder = (nodes: FileNode[], folderId: string, file: FileNode): FileNode[] => {
  return nodes.map((node) => {
    if (node.id === folderId && node.type === 'folder') {
      const children = [...(node.children ?? []), file]
      return { ...node, isOpen: true, children }
    }
    if (node.children) return { ...node, children: insertFileIntoFolder(node.children, folderId, file) }
    return node
  })
}

export const useEditorStore = create<EditorState>((set, get) => ({
  files: INITIAL_FILES,
  activeFileId: 'App.tsx',
  openFiles: ['App.tsx', 'main.tsx'],
  sidebarVisible: true,
  aiPanelVisible: true,
  commandPaletteOpen: false,
  globalSearchOpen: false,
  settingsOpen: false,
  missionControlOpen: false,
  aiMode: 'cloud',
  aiHealth: 'loading',
  indexingError: null,
  storageQuotaExceeded: false,
  perf: { longTaskCount: 0, longTaskMaxMs: 0, slowFrameCount: 0, slowFrameMaxMs: 0 },
  worktreeChanges: {},
  editorFontSizePx: 14,
  editorWordWrap: false,
  editorMinimap: true,
  editorTheme: 'Aether',
  editorFontFamily: 'JetBrains Mono',
  ideThemeColor: 'purple',
  _untitledCounter: 1,
  syntaxTrees: {},
  symbolsByFile: {},

  toggleFolder: (folderId) =>
    set((state) => ({
      files: toggleNode(state.files, folderId),
    })),

  openFile: (fileId) =>
    set((state) => {
      const isAlreadyOpen = state.openFiles.includes(fileId)
      return {
        activeFileId: fileId,
        openFiles: isAlreadyOpen ? state.openFiles : [...state.openFiles, fileId],
      }
    }),

  closeFile: (fileId) =>
    set((state) => {
      const newOpenFiles = state.openFiles.filter((id) => id !== fileId)
      let newActiveId = state.activeFileId
      if (state.activeFileId === fileId) {
        newActiveId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null
      }
      return {
        openFiles: newOpenFiles,
        activeFileId: newActiveId,
      }
    }),

  setActiveFile: (fileId) => set({ activeFileId: fileId }),
  setFileContent: (fileId, content) => set((state) => ({ files: updateFileContentInTree(state.files, fileId, content) })),
  setSyntaxForFile: (fileId, tree, symbols) => set((state) => ({ syntaxTrees: { ...state.syntaxTrees, [fileId]: tree }, symbolsByFile: { ...state.symbolsByFile, [fileId]: symbols } })),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  toggleAiPanel: () => set((state) => ({ aiPanelVisible: !state.aiPanelVisible })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setMissionControlOpen: (open) => set({ missionControlOpen: open }),
  setAiMode: (mode) => set({ aiMode: mode }),
  setAiHealth: (status) => set({ aiHealth: status }),
  setIndexingError: (error) => set({ indexingError: error }),
  setStorageQuotaExceeded: (exceeded) => set({ storageQuotaExceeded: exceeded }),
  setPerf: (metrics) => set({ perf: metrics }),

  setEditorFontSizePx: (value) => set({ editorFontSizePx: value }),
  toggleEditorWordWrap: () => set((state) => ({ editorWordWrap: !state.editorWordWrap })),
  toggleEditorMinimap: () => set((state) => ({ editorMinimap: !state.editorMinimap })),
  setEditorTheme: (theme) => set({ editorTheme: theme }),
  setEditorFontFamily: (font) => set({ editorFontFamily: font }),
  setIdeThemeColor: (color) => set({ ideThemeColor: color }),

  createUntitledFile: () =>
    set((state) => {
      const n = state._untitledCounter
      const name = `Untitled-${n}.ts`
      const file: FileNode = {
        id: name,
        name,
        type: 'file',
        language: 'typescript',
        parentId: 'src',
        content: '',
      }
      const nextFiles = insertFileIntoFolder(state.files, 'src', file)
      return {
        files: nextFiles,
        activeFileId: file.id,
        openFiles: state.openFiles.includes(file.id) ? state.openFiles : [...state.openFiles, file.id],
        _untitledCounter: n + 1,
      }
    }),

  getFileContent: (fileId) => {
    const node = findNode(get().files, fileId)
    return node?.content || ''
  },

  findNode: (id) => findNode(get().files, id),

  upsertWorktreeChange: (change) =>
    set((state) => ({
      worktreeChanges: { ...state.worktreeChanges, [change.fileId]: change },
    })),

  rejectWorktreeChange: (fileId) =>
    set((state) => {
      const next = { ...state.worktreeChanges }
      delete next[fileId]
      return { worktreeChanges: next }
    }),

  applyWorktreeChange: (fileId) =>
    set((state) => {
      const change = state.worktreeChanges[fileId]
      if (!change) return state
      const nextFiles = updateFileContentInTree(state.files, fileId, change.proposedContent)
      const nextChanges = { ...state.worktreeChanges }
      delete nextChanges[fileId]
      return { files: nextFiles, worktreeChanges: nextChanges }
    }),

  clearWorktree: () => set({ worktreeChanges: {} }),

  editorCommandRunner: null as ((cmd: EditorCommand) => boolean) | null,
  setEditorCommandRunner: (runner) => set({ editorCommandRunner: runner }),
  executeEditorCommand: (cmd) => get().editorCommandRunner?.(cmd) ?? false,
}))
