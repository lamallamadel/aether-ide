import { create } from 'zustand'
import type { FileNode } from '../domain/fileNode'
import { INITIAL_FILES } from '../domain/fileNode'
import type { ExtractedSymbol, SerializedTree } from '../services/syntax/syntaxTypes'
import type { PerfMetrics } from '../services/perf/perfMonitor'
import { readDirectoryRecursive, writeFileContent } from '../services/fileSystem/fileSystemAccess'
import type { AetherLspMode } from '../lsp/server/aetherEmbeddedServer'
import type { RuntimeEnvironment, WorkspaceEnvironment, WorkspaceEnvironmentStatus, ResolvedEnvironment } from '../config/environment'
import { resolveEnvironment } from '../config/environment'

export type AiHealthStatus = 'full' | 'degraded' | 'offline' | 'loading'

/** Commands exécutables depuis le MenuBar vers CodeMirror */
export type EditorCommand = 'undo' | 'redo' | 'copy' | 'cut' | 'paste' | 'selectAll' | 'findInFile'

export interface EditorState {
  files: FileNode[]
  fileHandles: Record<string, FileSystemFileHandle>
  activeFileId: string | null
  openFiles: string[]
  sidebarVisible: boolean
  aiPanelVisible: boolean
  commandPaletteOpen: boolean
  globalSearchOpen: boolean
  goToSymbolOpen: boolean
  settingsOpen: boolean
  missionControlOpen: boolean
  terminalPanelOpen: boolean
  terminalPanelHeight: number
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
  lspMode: AetherLspMode
  externalLspEndpoint: string
  runtimeEnvironment: RuntimeEnvironment
  workspaceEnvironment: WorkspaceEnvironment | null
  workspaceEnvironmentStatus: WorkspaceEnvironmentStatus
  resolvedEnvironment: ResolvedEnvironment
  activeWorkspaceId: string | null
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
  setGoToSymbolOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setMissionControlOpen: (open: boolean) => void
  setTerminalPanelOpen: (open: boolean) => void
  setTerminalPanelHeight: (height: number) => void
  toggleTerminalPanel: () => void
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
  setLspMode: (mode: AetherLspMode) => void
  setExternalLspEndpoint: (endpoint: string) => void
  setRuntimeEnvironment: (env: RuntimeEnvironment) => void
  setWorkspaceEnvironment: (env: WorkspaceEnvironment | null, status?: WorkspaceEnvironmentStatus) => void
  setWorkspaceEnvironmentStatus: (status: WorkspaceEnvironmentStatus) => void
  resetWorkspaceEnvironment: () => void
  createUntitledFile: () => void
  upsertWorktreeChange: (change: { fileId: string; originalContent: string; proposedContent: string }) => void
  rejectWorktreeChange: (fileId: string) => void
  applyWorktreeChange: (fileId: string) => void
  clearWorktree: () => void
  loadProjectFromDirectory: (handle: FileSystemDirectoryHandle) => Promise<void>
  saveFileToDisk: (fileId: string) => Promise<boolean>
  hasFileHandle: (fileId: string) => boolean
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
  fileHandles: {} as Record<string, FileSystemFileHandle>,
  activeFileId: 'App.tsx',
  openFiles: ['App.tsx', 'main.tsx'],
  sidebarVisible: true,
  aiPanelVisible: true,
  commandPaletteOpen: false,
  globalSearchOpen: false,
  goToSymbolOpen: false,
  settingsOpen: false,
  missionControlOpen: false,
  terminalPanelOpen: false,
  terminalPanelHeight: 200,
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
  lspMode: 'embedded',
  externalLspEndpoint: '',
  runtimeEnvironment: { mode: 'development', aiMode: 'cloud', lspMode: 'embedded', externalLspEndpoint: '' },
  workspaceEnvironment: null,
  workspaceEnvironmentStatus: 'not_loaded',
  resolvedEnvironment: {
    mode: 'development',
    aiMode: 'cloud',
    lspMode: 'embedded',
    externalLspEndpoint: '',
    sourceByField: { aiMode: 'runtime', lspMode: 'runtime', externalLspEndpoint: 'fallback' },
  },
  activeWorkspaceId: null,
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
  setGoToSymbolOpen: (open) => set({ goToSymbolOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setMissionControlOpen: (open) => set({ missionControlOpen: open }),
  setTerminalPanelOpen: (open) => set({ terminalPanelOpen: open }),
  setTerminalPanelHeight: (height) => set({ terminalPanelHeight: height }),
  toggleTerminalPanel: () => set((s) => ({ terminalPanelOpen: !s.terminalPanelOpen })),
  setAiMode: (mode) =>
    set((state) => {
      const workspaceEnvironment = state.workspaceEnvironment
        ? { ...state.workspaceEnvironment, overrides: { ...state.workspaceEnvironment.overrides, aiMode: mode } }
        : null
      return {
        aiMode: mode,
        workspaceEnvironment,
        resolvedEnvironment: resolveEnvironment(state.runtimeEnvironment, workspaceEnvironment),
      }
    }),
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
  setLspMode: (mode) =>
    set((state) => {
      const workspaceEnvironment = state.workspaceEnvironment
        ? { ...state.workspaceEnvironment, overrides: { ...state.workspaceEnvironment.overrides, lspMode: mode } }
        : null
      return {
        lspMode: mode,
        workspaceEnvironment,
        resolvedEnvironment: resolveEnvironment(state.runtimeEnvironment, workspaceEnvironment),
      }
    }),
  setExternalLspEndpoint: (endpoint) =>
    set((state) => {
      const workspaceEnvironment = state.workspaceEnvironment
        ? { ...state.workspaceEnvironment, overrides: { ...state.workspaceEnvironment.overrides, externalLspEndpoint: endpoint } }
        : null
      return {
        externalLspEndpoint: endpoint,
        workspaceEnvironment,
        resolvedEnvironment: resolveEnvironment(state.runtimeEnvironment, workspaceEnvironment),
      }
    }),
  setRuntimeEnvironment: (env) =>
    set((state) => {
      const resolved = resolveEnvironment(env, state.workspaceEnvironment)
      return {
        runtimeEnvironment: env,
        aiMode: resolved.aiMode,
        lspMode: resolved.lspMode,
        externalLspEndpoint: resolved.externalLspEndpoint,
        resolvedEnvironment: resolved,
      }
    }),
  setWorkspaceEnvironment: (env, status = 'ready') =>
    set((state) => {
      const resolved = resolveEnvironment(state.runtimeEnvironment, env)
      return {
        workspaceEnvironment: env,
        workspaceEnvironmentStatus: status,
        aiMode: resolved.aiMode,
        lspMode: resolved.lspMode,
        externalLspEndpoint: resolved.externalLspEndpoint,
        resolvedEnvironment: resolved,
      }
    }),
  setWorkspaceEnvironmentStatus: (status) => set({ workspaceEnvironmentStatus: status }),
  resetWorkspaceEnvironment: () =>
    set((state) => {
      const resolved = resolveEnvironment(state.runtimeEnvironment, null)
      return {
        workspaceEnvironment: null,
        workspaceEnvironmentStatus: state.activeWorkspaceId ? 'ready' : 'not_loaded',
        aiMode: resolved.aiMode,
        lspMode: resolved.lspMode,
        externalLspEndpoint: resolved.externalLspEndpoint,
        resolvedEnvironment: resolved,
      }
    }),

  createUntitledFile: () =>
    set((state) => {
      const n = state._untitledCounter
      const name = `Untitled-${n}.aether`
      const file: FileNode = {
        id: name,
        name,
        type: 'file',
        language: 'aether',
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

  loadProjectFromDirectory: async (handle) => {
    set({ workspaceEnvironmentStatus: 'loading' })
    try {
      const { files: newFiles, fileHandles: handles } = await readDirectoryRecursive(handle)
      const firstFileId = (() => {
        const flat: FileNode[] = []
        const visit = (n: FileNode) => {
          if (n.type === 'file') flat.push(n)
          if (n.children) n.children.forEach(visit)
        }
        newFiles.forEach((root) => visit(root))
        return flat[0]?.id ?? null
      })()
      const workspaceId = handle.name || 'workspace'
      const workspaceEnvironment: WorkspaceEnvironment = {
        workspaceId,
        overrides: {},
      }
      set({
        files: newFiles,
        fileHandles: handles,
        openFiles: firstFileId ? [firstFileId] : [],
        activeFileId: firstFileId,
        activeWorkspaceId: workspaceId,
        worktreeChanges: {},
        syntaxTrees: {},
        symbolsByFile: {},
        workspaceEnvironment,
        workspaceEnvironmentStatus: 'ready',
        resolvedEnvironment: resolveEnvironment(get().runtimeEnvironment, workspaceEnvironment),
      })
    } catch (err) {
      console.error('loadProjectFromDirectory failed', err)
      set({ indexingError: err instanceof Error ? err.message : 'Failed to load project', workspaceEnvironmentStatus: 'degraded' })
    }
  },

  saveFileToDisk: async (fileId) => {
    const handle = get().fileHandles[fileId]
    if (!handle) return false
    try {
      const content = get().getFileContent(fileId)
      await writeFileContent(handle, content)
      return true
    } catch (err) {
      console.error('saveFileToDisk failed', err)
      return false
    }
  },

  hasFileHandle: (fileId) => !!get().fileHandles[fileId],

  editorCommandRunner: null as ((cmd: EditorCommand) => boolean) | null,
  setEditorCommandRunner: (runner) => set({ editorCommandRunner: runner }),
  executeEditorCommand: (cmd) => get().editorCommandRunner?.(cmd) ?? false,
}))
