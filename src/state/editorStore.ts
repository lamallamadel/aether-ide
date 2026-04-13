import { create } from 'zustand'
import type { FileNode } from '../domain/fileNode'
import { INITIAL_FILES } from '../domain/fileNode'
import type { ExtractedSymbol, SerializedTree } from '../services/syntax/syntaxTypes'
import type { PerfMetrics } from '../services/perf/perfMonitor'
import { readDirectoryRecursive, writeFileContent } from '../services/fileSystem/fileSystemAccess'
import type { AetherLspMode, LspDiagnostic } from '../lsp/server/aetherEmbeddedServer'
import type { RuntimeEnvironment, WorkspaceEnvironment, WorkspaceEnvironmentStatus, ResolvedEnvironment } from '../config/environment'
import { resolveEnvironment } from '../config/environment'
import { DEFAULT_SETTINGS_CATEGORY, isSettingsCategory, SETTINGS_CATEGORY_STORAGE_KEY, type SettingsCategory } from '../config/settingsCategories'
import {
  readWorkspaceOverridesFromRoot,
  readWorkspaceOverridesFromNativeRoot,
  writeWorkspaceProjectConfig,
  writeWorkspaceProjectConfigNative,
} from '../config/workspaceProjectConfig'
import { nativeLoadWorkspace, nativeWriteFileRelative } from '../services/fileSystem/electronNativeWorkspace'
import type { WorkspaceProvider } from '../services/fileSystem/workspaceProvider'
import type { RemoteConnectionStatus } from '../types/aether-desktop'
import type { AetherProject, AetherSdk } from '../config/projectConfig'
import { readProjectConfig, writeProjectConfig, readProjectConfigFsa, writeProjectConfigFsa, createDefaultProject, detectProjectType } from '../config/projectConfig'

let _connectionEpoch = 0

export type AiHealthStatus = 'full' | 'degraded' | 'offline' | 'loading'

export interface RemoteConnection {
  type: 'wsl'
  distro: string
  wslVersion: 1 | 2
  linuxRootPath: string
  status: RemoteConnectionStatus
  errorMessage?: string
}


/** Commands exécutables depuis le MenuBar vers CodeMirror */
export type EditorCommand = 'undo' | 'redo' | 'copy' | 'cut' | 'paste' | 'selectAll' | 'findInFile'

/** Split éditeur : colonnes (côte à côte) ou lignes (empilé). */
export type EditorSplitMode = 'none' | 'columns' | 'rows'

/** Terminal : barre pleine largeur (historique) ou ancré sous la colonne éditeur. */
export type TerminalDockMode = 'workspace' | 'editor'

export type SidebarView = 'explorer' | 'extensions' | 'run'

export const SPECIAL_TAB_SETTINGS = '__settings__'
export const SPECIAL_TAB_EXT_DETAIL_PREFIX = '__ext_detail__:'
export const SPECIAL_TAB_RUN_CONFIG_PREFIX = '__run_config__:'
export const isSpecialTab = (id: string) =>
  id === SPECIAL_TAB_SETTINGS ||
  id.startsWith(SPECIAL_TAB_EXT_DETAIL_PREFIX) ||
  id.startsWith(SPECIAL_TAB_RUN_CONFIG_PREFIX)

export interface EditorState {
  files: FileNode[]
  fileHandles: Record<string, FileSystemFileHandle>
  workspaceHandle: FileSystemDirectoryHandle | null
  /** Racine workspace absolue (Electron + IPC natif) ; exclusif avec un chargement FSA classique. */
  workspaceRootPath: string | null
  activeFileId: string | null
  openFiles: string[]
  sidebarVisible: boolean
  sidebarView: SidebarView
  aiPanelVisible: boolean
  commandPaletteOpen: boolean
  globalSearchOpen: boolean
  goToSymbolOpen: boolean
  /** Filtre symboles dans Go to Symbol : tout ou classes uniquement. */
  goToSymbolFilter: 'all' | 'class'
  settingsCategory: SettingsCategory
  missionControlOpen: boolean
  terminalPanelOpen: boolean
  terminalPanelHeight: number
  terminalSessionId: number
  terminalDock: TerminalDockMode
  editorSplit: EditorSplitMode
  /** Volet actif pour les commandes Edit et la barre de position. */
  activeEditorPane: 'primary' | 'secondary'
  /** Fraction [0.2–0.8] : largeur (columns) ou hauteur (rows) du volet primaire. */
  editorSplitRatio: number
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
  /** LSP diagnostics per file (errors, warnings). */
  diagnosticsByFile: Record<string, LspDiagnostic[]>

  /** Aether project settings loaded from .aetheride/project.json (null if not initialized). */
  projectSettings: AetherProject | null

  /** Active remote connection (null = local). */
  remoteConnection: RemoteConnection | null
  /** Active workspace provider (null = FSA browser mode). */
  activeProvider: WorkspaceProvider | null
  /** Modal picker for remote connections. */
  remotePickerOpen: boolean
  /** Modal for opening a folder in WSL. */
  wslFolderPromptOpen: boolean

  toggleFolder: (folderId: string) => void
  openFile: (fileId: string) => void
  closeFile: (fileId: string) => void
  setActiveFile: (fileId: string) => void
  setFileContent: (fileId: string, content: string) => void
  setSyntaxForFile: (fileId: string, tree: SerializedTree, symbols: ExtractedSymbol[]) => void
  setDiagnosticsForFile: (fileId: string, diagnostics: LspDiagnostic[]) => void
  toggleSidebar: () => void
  toggleAiPanel: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setGlobalSearchOpen: (open: boolean) => void
  setGoToSymbolOpen: (open: boolean, filter?: 'all' | 'class') => void
  setEditorSplit: (mode: EditorSplitMode) => void
  setActiveEditorPane: (pane: 'primary' | 'secondary') => void
  setEditorSplitRatio: (ratio: number) => void
  setTerminalDock: (dock: TerminalDockMode) => void
  setSettingsCategory: (category: SettingsCategory) => void
  openSettings: (params?: { open?: boolean; category?: SettingsCategory }) => void
  setSidebarView: (view: SidebarView) => void
  openExtensionDetail: (extId: string) => void
  openRunConfigEditor: (configId: string) => void
  setMissionControlOpen: (open: boolean) => void
  setTerminalPanelOpen: (open: boolean) => void
  setTerminalPanelHeight: (height: number) => void
  toggleTerminalPanel: () => void
  newTerminal: () => void
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
  loadProjectFromNativePath: (absolutePath: string) => Promise<void>
  saveFileToDisk: (fileId: string) => Promise<boolean>
  saveFileAsInWorkspace: (fileId: string, targetPath: string) => Promise<{ ok: boolean; fileId?: string; error?: string }>
  hasFileHandle: (fileId: string) => boolean
  /** Exécute une commande sur l'éditeur actif. Retourne false si aucune vue ou commande non dispo. */
  executeEditorCommand: (cmd: EditorCommand) => boolean
  /** Enregistré par CodeEditor au mount, null au unmount. */
  setEditorCommandRunner: (pane: 'primary' | 'secondary', runner: ((cmd: EditorCommand) => boolean) | null) => void
  editorCommandRunnerPrimary: ((cmd: EditorCommand) => boolean) | null
  editorCommandRunnerSecondary: ((cmd: EditorCommand) => boolean) | null
  /** Quick fix / gutter IA : contexte ou null si fermé. */
  aiQuickFixContext: { fileId: string; line: number; kind: 'warning' | 'suggestion' } | null
  setAiQuickFixContext: (ctx: EditorState['aiQuickFixContext']) => void

  setProjectSettings: (project: AetherProject | null) => void
  updateProjectSdk: (sdk: Partial<AetherSdk>) => void
  initProjectIfNeeded: () => Promise<void>

  setRemotePickerOpen: (open: boolean) => void
  setWslFolderPromptOpen: (open: boolean) => void
  setRemoteConnection: (conn: RemoteConnection | null) => void
  setRemoteStatus: (status: RemoteConnectionStatus, errorMessage?: string) => void
  setActiveProvider: (provider: WorkspaceProvider | null) => void
  connectToWsl: (distro: string, wslVersion: 1 | 2) => Promise<void>
  openWslFolder: (linuxPath: string) => Promise<void>
  disconnectRemote: () => void
}

/** Persistance asynchrone de `.aether/workspace.json` après mise à jour du store. */
const schedulePersistWorkspaceProjectConfig = (get: () => EditorState) => {
  queueMicrotask(() => {
    const { workspaceHandle, workspaceRootPath, workspaceEnvironment } = get()
    if (!workspaceEnvironment) return
    if (workspaceHandle) {
      void writeWorkspaceProjectConfig(workspaceHandle, workspaceEnvironment.overrides).catch((err) =>
        console.error('writeWorkspaceProjectConfig failed', err)
      )
    } else if (workspaceRootPath) {
      void writeWorkspaceProjectConfigNative(workspaceRootPath, workspaceEnvironment.overrides).catch((err) =>
        console.error('writeWorkspaceProjectConfigNative failed', err)
      )
    }
  })
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

/** Retire un fichier ou dossier de l’arbre (par id). */
export const removeFileNodeById = (nodes: FileNode[], id: string): FileNode[] => {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children?.length ? { ...n, children: removeFileNodeById(n.children, id) } : n
    )
}

/** Après Save As : l’onglet actif doit afficher le nouveau chemin, pas dupliquer l’entrée. */
const replaceOpenFilesAfterSaveAs = (openFiles: string[], fileId: string, normalized: string): string[] => {
  const mapped = openFiles.map((id) => (id === fileId ? normalized : id))
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of mapped) {
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  if (!openFiles.includes(fileId) && !result.includes(normalized)) result.push(normalized)
  return result
}

const languageForName = (name: string): string | undefined => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.tsx') || lower.endsWith('.ts')) return 'typescript'
  if (lower.endsWith('.jsx') || lower.endsWith('.js')) return 'javascript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.md')) return 'markdown'
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml'
  if (lower.endsWith('.aether')) return 'aether'
  return undefined
}

const upsertFileInWorkspaceTree = (nodes: FileNode[], filePath: string, content: string): FileNode[] => {
  const parts = filePath.split('/').filter(Boolean)
  if (parts.length === 0) return nodes
  const fileName = parts[parts.length - 1]
  const folders = parts.slice(0, -1)

  const upsertChildren = (
    children: FileNode[],
    remainingFolders: string[],
    parentId: string,
    prefix: string
  ): FileNode[] => {
    if (remainingFolders.length === 0) {
      const fileIndex = children.findIndex((n) => n.type === 'file' && n.id === filePath)
      if (fileIndex >= 0) {
        const nextChildren = [...children]
        nextChildren[fileIndex] = {
          ...nextChildren[fileIndex],
          name: fileName,
          content,
          language: languageForName(fileName),
        }
        return nextChildren
      }
      return [
        ...children,
        {
          id: filePath,
          name: fileName,
          type: 'file',
          parentId,
          language: languageForName(fileName),
          content,
        },
      ]
    }

    const folderName = remainingFolders[0]
    const folderId = prefix ? `${prefix}/${folderName}` : folderName
    const folderIndex = children.findIndex((n) => n.type === 'folder' && n.id === folderId)
    const nextChildren = [...children]
    const folderNode: FileNode =
      folderIndex >= 0
        ? nextChildren[folderIndex]
        : {
            id: folderId,
            name: folderName,
            type: 'folder',
            parentId,
            isOpen: true,
            children: [],
          }
    const updatedFolder: FileNode = {
      ...folderNode,
      isOpen: true,
      children: upsertChildren(folderNode.children ?? [], remainingFolders.slice(1), folderId, folderId),
    }

    if (folderIndex >= 0) nextChildren[folderIndex] = updatedFolder
    else nextChildren.push(updatedFolder)
    return nextChildren
  }

  return nodes.map((node) => {
    if (node.id !== 'root' || node.type !== 'folder') return node
    return {
      ...node,
      isOpen: true,
      children: upsertChildren(node.children ?? [], folders, 'root', ''),
    }
  })
}

export const useEditorStore = create<EditorState>((set, get) => ({
  files: INITIAL_FILES,
  fileHandles: {} as Record<string, FileSystemFileHandle>,
  workspaceHandle: null,
  workspaceRootPath: null,
  activeFileId: 'App.tsx',
  openFiles: ['App.tsx', 'main.tsx'],
  sidebarVisible: true,
  sidebarView: 'explorer' as SidebarView,
  aiPanelVisible: true,
  commandPaletteOpen: false,
  globalSearchOpen: false,
  goToSymbolOpen: false,
  goToSymbolFilter: 'all' as const,
  settingsCategory: (() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS_CATEGORY
    const value = window.localStorage.getItem(SETTINGS_CATEGORY_STORAGE_KEY)
    return value && isSettingsCategory(value) ? value : DEFAULT_SETTINGS_CATEGORY
  })(),
  missionControlOpen: false,
  terminalPanelOpen: false,
  terminalPanelHeight: 200,
  terminalSessionId: 0,
  terminalDock: 'workspace' as TerminalDockMode,
  editorSplit: 'none' as EditorSplitMode,
  activeEditorPane: 'primary' as const,
  editorSplitRatio: 0.5,
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
  diagnosticsByFile: {},

  projectSettings: null,

  remoteConnection: null,
  activeProvider: null,
  remotePickerOpen: false,
  wslFolderPromptOpen: false,

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
  setDiagnosticsForFile: (fileId, diagnostics) => set((state) => ({ diagnosticsByFile: { ...state.diagnosticsByFile, [fileId]: diagnostics } })),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  toggleAiPanel: () => set((state) => ({ aiPanelVisible: !state.aiPanelVisible })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  setGoToSymbolOpen: (open, filter) =>
    set((state) => ({
      goToSymbolOpen: open,
      goToSymbolFilter: open ? (filter ?? 'all') : state.goToSymbolFilter,
    })),
  setEditorSplit: (mode) =>
    set(() => ({
      editorSplit: mode,
      ...(mode === 'none'
        ? { editorCommandRunnerSecondary: null, activeEditorPane: 'primary' as const }
        : {}),
    })),
  setActiveEditorPane: (pane) => set({ activeEditorPane: pane }),
  setEditorSplitRatio: (ratio) =>
    set({ editorSplitRatio: Math.min(0.85, Math.max(0.15, ratio)) }),
  setTerminalDock: (dock) => set({ terminalDock: dock }),
  setSettingsCategory: (category) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_CATEGORY_STORAGE_KEY, category)
    }
    set({ settingsCategory: category })
  },
  openSettings: ({ open = true, category } = {}) => {
    if (category && typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_CATEGORY_STORAGE_KEY, category)
    }
    if (open) {
      set((state) => ({
        settingsCategory: category ?? state.settingsCategory,
        activeFileId: SPECIAL_TAB_SETTINGS,
        openFiles: state.openFiles.includes(SPECIAL_TAB_SETTINGS)
          ? state.openFiles
          : [...state.openFiles, SPECIAL_TAB_SETTINGS],
      }))
    } else {
      get().closeFile(SPECIAL_TAB_SETTINGS)
    }
  },
  setSidebarView: (view) => set({ sidebarView: view, sidebarVisible: true }),
  openExtensionDetail: (extId) => {
    const tabId = `${SPECIAL_TAB_EXT_DETAIL_PREFIX}${extId}`
    set((state) => ({
      activeFileId: tabId,
      openFiles: state.openFiles.includes(tabId) ? state.openFiles : [...state.openFiles, tabId],
    }))
  },
  openRunConfigEditor: (configId) => {
    const tabId = `${SPECIAL_TAB_RUN_CONFIG_PREFIX}${configId}`
    set((state) => ({
      activeFileId: tabId,
      openFiles: state.openFiles.includes(tabId) ? state.openFiles : [...state.openFiles, tabId],
    }))
  },
  setMissionControlOpen: (open) => set({ missionControlOpen: open }),
  setTerminalPanelOpen: (open) => set({ terminalPanelOpen: open }),
  setTerminalPanelHeight: (height) => set({ terminalPanelHeight: height }),
  toggleTerminalPanel: () => set((s) => ({ terminalPanelOpen: !s.terminalPanelOpen })),
  newTerminal: () => set((s) => ({ terminalPanelOpen: true, terminalSessionId: s.terminalSessionId + 1 })),
  setAiMode: (mode) =>
    set((state) => {
      const workspaceEnvironment = state.workspaceEnvironment
        ? { ...state.workspaceEnvironment, overrides: { ...state.workspaceEnvironment.overrides, aiMode: mode } }
        : null
      schedulePersistWorkspaceProjectConfig(get)
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
      schedulePersistWorkspaceProjectConfig(get)
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
      schedulePersistWorkspaceProjectConfig(get)
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
      schedulePersistWorkspaceProjectConfig(get)
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
      const { workspaceHandle, workspaceRootPath } = state
      if (workspaceHandle) {
        queueMicrotask(() => {
          void writeWorkspaceProjectConfig(workspaceHandle, {}).catch((err) =>
            console.error('writeWorkspaceProjectConfig failed', err)
          )
        })
      } else if (workspaceRootPath) {
        queueMicrotask(() => {
          void writeWorkspaceProjectConfigNative(workspaceRootPath, {}).catch((err) =>
            console.error('writeWorkspaceProjectConfigNative failed', err)
          )
        })
      }
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
      const overrides = await readWorkspaceOverridesFromRoot(handle)
      const workspaceEnvironment: WorkspaceEnvironment = {
        workspaceId,
        overrides,
      }
      const runtimeEnv = get().runtimeEnvironment
      const resolved = resolveEnvironment(runtimeEnv, workspaceEnvironment)
      set({
        files: newFiles,
        fileHandles: handles,
        workspaceHandle: handle,
        workspaceRootPath: null,
        openFiles: firstFileId ? [firstFileId] : [],
        activeFileId: firstFileId,
        activeWorkspaceId: workspaceId,
        worktreeChanges: {},
        syntaxTrees: {},
        symbolsByFile: {},
        diagnosticsByFile: {},
        workspaceEnvironment,
        workspaceEnvironmentStatus: 'ready',
        aiMode: resolved.aiMode,
        lspMode: resolved.lspMode,
        externalLspEndpoint: resolved.externalLspEndpoint,
        resolvedEnvironment: resolved,
        projectSettings: null,
      })
      const project = await readProjectConfigFsa(handle).catch(() => null)
      if (project) set({ projectSettings: project })
    } catch (err) {
      console.error('loadProjectFromDirectory failed', err)
      set({ indexingError: err instanceof Error ? err.message : 'Failed to load project', workspaceEnvironmentStatus: 'degraded' })
    }
  },

  loadProjectFromNativePath: async (absolutePath) => {
    set({ workspaceEnvironmentStatus: 'loading' })
    try {
      const { files: newFiles, rootPath, workspaceLabel } = await nativeLoadWorkspace(absolutePath)
      const firstFileId = (() => {
        const flat: FileNode[] = []
        const visit = (n: FileNode) => {
          if (n.type === 'file') flat.push(n)
          if (n.children) n.children.forEach(visit)
        }
        newFiles.forEach((root) => visit(root))
        return flat[0]?.id ?? null
      })()
      const workspaceId = workspaceLabel
      const overrides = await readWorkspaceOverridesFromNativeRoot(rootPath)
      const workspaceEnvironment: WorkspaceEnvironment = {
        workspaceId,
        overrides,
      }
      const runtimeEnv = get().runtimeEnvironment
      const resolved = resolveEnvironment(runtimeEnv, workspaceEnvironment)
      set({
        files: newFiles,
        fileHandles: {},
        workspaceHandle: null,
        workspaceRootPath: rootPath,
        openFiles: firstFileId ? [firstFileId] : [],
        activeFileId: firstFileId,
        activeWorkspaceId: workspaceId,
        worktreeChanges: {},
        syntaxTrees: {},
        symbolsByFile: {},
        diagnosticsByFile: {},
        workspaceEnvironment,
        workspaceEnvironmentStatus: 'ready',
        aiMode: resolved.aiMode,
        lspMode: resolved.lspMode,
        externalLspEndpoint: resolved.externalLspEndpoint,
        resolvedEnvironment: resolved,
        projectSettings: null,
      })
      const project = await readProjectConfig(rootPath).catch(() => null)
      if (project) set({ projectSettings: project })
    } catch (err) {
      console.error('loadProjectFromNativePath failed', err)
      set({
        indexingError: err instanceof Error ? err.message : 'Failed to load project',
        workspaceEnvironmentStatus: 'degraded',
      })
    }
  },

  saveFileToDisk: async (fileId) => {
    const provider = get().activeProvider
    const rootPath = get().workspaceRootPath
    if (provider && rootPath) {
      try {
        const content = get().getFileContent(fileId)
        await provider.writeFile(rootPath, fileId.replaceAll('\\', '/'), content)
        return true
      } catch (err) {
        console.error('saveFileToDisk failed', err)
        return false
      }
    }
    if (rootPath) {
      try {
        const content = get().getFileContent(fileId)
        await nativeWriteFileRelative(rootPath, fileId.replaceAll('\\', '/'), content)
        return true
      } catch (err) {
        console.error('saveFileToDisk failed', err)
        return false
      }
    }
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

  saveFileAsInWorkspace: async (fileId, targetPath) => {
    const normalized = targetPath.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
    if (!normalized || normalized.includes('..')) return { ok: false, error: 'Invalid path' }
    const segments = normalized.split('/').filter(Boolean)
    const name = segments[segments.length - 1]
    if (!name) return { ok: false, error: 'Invalid file name' }

    const content = get().getFileContent(fileId)
    const nativeRoot = get().workspaceRootPath
    if (nativeRoot) {
      try {
        await nativeWriteFileRelative(nativeRoot, normalized, content)
        set((state) => {
          let files = upsertFileInWorkspaceTree(state.files, normalized, content)
          if (fileId !== normalized && fileId.startsWith('Untitled-')) {
            files = removeFileNodeById(files, fileId)
          }
          const openFiles = replaceOpenFilesAfterSaveAs(state.openFiles, fileId, normalized)
          let syntaxTrees = state.syntaxTrees
          let symbolsByFile = state.symbolsByFile
          let worktreeChanges = state.worktreeChanges
          let diagnosticsByFile = state.diagnosticsByFile
          if (fileId !== normalized) {
            if (state.syntaxTrees[fileId] !== undefined) {
              syntaxTrees = { ...state.syntaxTrees }
              syntaxTrees[normalized] = syntaxTrees[fileId]
              delete syntaxTrees[fileId]
            }
            if (state.symbolsByFile[fileId] !== undefined) {
              symbolsByFile = { ...state.symbolsByFile }
              symbolsByFile[normalized] = symbolsByFile[fileId]
              delete symbolsByFile[fileId]
            }
            if (state.diagnosticsByFile[fileId] !== undefined) {
              diagnosticsByFile = { ...state.diagnosticsByFile }
              diagnosticsByFile[normalized] = diagnosticsByFile[fileId]
              delete diagnosticsByFile[fileId]
            }
            if (state.worktreeChanges[fileId] !== undefined) {
              worktreeChanges = { ...state.worktreeChanges }
              const ch = worktreeChanges[fileId]
              delete worktreeChanges[fileId]
              worktreeChanges[normalized] = { ...ch, fileId: normalized }
            }
          }
          return {
            files,
            activeFileId: normalized,
            openFiles,
            syntaxTrees,
            symbolsByFile,
            diagnosticsByFile,
            worktreeChanges,
          }
        })
        return { ok: true, fileId: normalized }
      } catch (err) {
        console.error('saveFileAsInWorkspace failed', err)
        return { ok: false, error: err instanceof Error ? err.message : 'Save As failed' }
      }
    }

    const workspaceHandle = get().workspaceHandle
    if (!workspaceHandle) return { ok: false, error: 'Open Folder first' }

    try {
      let directory = workspaceHandle
      for (const folder of segments.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(folder, { create: true })
      }
      const fileHandle = await directory.getFileHandle(name, { create: true })
      await writeFileContent(fileHandle, content)

      set((state) => {
        let files = upsertFileInWorkspaceTree(state.files, normalized, content)
        if (fileId !== normalized && fileId.startsWith('Untitled-')) {
          files = removeFileNodeById(files, fileId)
        }

        const openFiles = replaceOpenFilesAfterSaveAs(state.openFiles, fileId, normalized)

        let syntaxTrees = state.syntaxTrees
        let symbolsByFile = state.symbolsByFile
        let worktreeChanges = state.worktreeChanges
        let diagnosticsByFile = state.diagnosticsByFile
        if (fileId !== normalized) {
          if (state.syntaxTrees[fileId] !== undefined) {
            syntaxTrees = { ...state.syntaxTrees }
            syntaxTrees[normalized] = syntaxTrees[fileId]
            delete syntaxTrees[fileId]
          }
          if (state.symbolsByFile[fileId] !== undefined) {
            symbolsByFile = { ...state.symbolsByFile }
            symbolsByFile[normalized] = symbolsByFile[fileId]
            delete symbolsByFile[fileId]
          }
          if (state.diagnosticsByFile[fileId] !== undefined) {
            diagnosticsByFile = { ...state.diagnosticsByFile }
            diagnosticsByFile[normalized] = diagnosticsByFile[fileId]
            delete diagnosticsByFile[fileId]
          }
          if (state.worktreeChanges[fileId] !== undefined) {
            worktreeChanges = { ...state.worktreeChanges }
            const ch = worktreeChanges[fileId]
            delete worktreeChanges[fileId]
            worktreeChanges[normalized] = { ...ch, fileId: normalized }
          }
        }

        return {
          files,
          fileHandles: { ...state.fileHandles, [normalized]: fileHandle },
          activeFileId: normalized,
          openFiles,
          syntaxTrees,
          symbolsByFile,
          diagnosticsByFile,
          worktreeChanges,
        }
      })
      return { ok: true, fileId: normalized }
    } catch (err) {
      console.error('saveFileAsInWorkspace failed', err)
      return { ok: false, error: err instanceof Error ? err.message : 'Save As failed' }
    }
  },

  hasFileHandle: (fileId) => {
    if (get().fileHandles[fileId]) return true
    if (get().workspaceRootPath) {
      const n = findNode(get().files, fileId)
      return n?.type === 'file'
    }
    return false
  },

  editorCommandRunnerPrimary: null as ((cmd: EditorCommand) => boolean) | null,
  editorCommandRunnerSecondary: null as ((cmd: EditorCommand) => boolean) | null,
  setEditorCommandRunner: (pane, runner) =>
    set(
      pane === 'primary'
        ? { editorCommandRunnerPrimary: runner }
        : { editorCommandRunnerSecondary: runner }
    ),
  executeEditorCommand: (cmd) => {
    const { activeEditorPane, editorCommandRunnerPrimary, editorCommandRunnerSecondary } = get()
    const runner =
      activeEditorPane === 'secondary' ? editorCommandRunnerSecondary : editorCommandRunnerPrimary
    return runner?.(cmd) ?? false
  },
  aiQuickFixContext: null,
  setAiQuickFixContext: (ctx) => set({ aiQuickFixContext: ctx }),

  setProjectSettings: (project) => {
    set({ projectSettings: project })
    if (project) {
      const { workspaceRootPath, workspaceHandle } = get()
      if (workspaceRootPath) {
        void writeProjectConfig(workspaceRootPath, project).catch((err) =>
          console.error('writeProjectConfig failed', err)
        )
      } else if (workspaceHandle) {
        void writeProjectConfigFsa(workspaceHandle, project).catch((err) =>
          console.error('writeProjectConfigFsa failed', err)
        )
      }
    }
  },

  updateProjectSdk: (sdkPatch) => {
    const current = get().projectSettings
    if (!current) return
    const updated: AetherProject = {
      ...current,
      sdk: { ...current.sdk, ...sdkPatch },
    }
    get().setProjectSettings(updated)
  },

  initProjectIfNeeded: async () => {
    const { workspaceRootPath, workspaceHandle, projectSettings, activeWorkspaceId } = get()
    if (projectSettings) return

    let project: AetherProject | null = null
    if (workspaceRootPath) {
      project = await readProjectConfig(workspaceRootPath)
      if (!project) {
        const type = await detectProjectType(workspaceRootPath).catch(() => 'generic' as const)
        project = createDefaultProject(activeWorkspaceId ?? 'workspace', type)
        await writeProjectConfig(workspaceRootPath, project).catch(() => {})
      }
    } else if (workspaceHandle) {
      project = await readProjectConfigFsa(workspaceHandle)
      if (!project) {
        project = createDefaultProject(activeWorkspaceId ?? 'workspace', 'generic')
        await writeProjectConfigFsa(workspaceHandle, project).catch(() => {})
      }
    }

    if (project) set({ projectSettings: project })
  },

  setRemotePickerOpen: (open) => set({ remotePickerOpen: open }),
  setWslFolderPromptOpen: (open) => set({ wslFolderPromptOpen: open }),

  setRemoteConnection: (conn) => set({ remoteConnection: conn }),

  setRemoteStatus: (status, errorMessage) =>
    set((state) => {
      if (!state.remoteConnection) return state
      return { remoteConnection: { ...state.remoteConnection, status, errorMessage } }
    }),

  setActiveProvider: (provider) => set({ activeProvider: provider }),

  connectToWsl: async (distro, wslVersion) => {
    const epoch = ++_connectionEpoch
    const { WslProvider } = await import('../services/fileSystem/workspaceProvider')
    const provider = new WslProvider(distro)
    set({
      remoteConnection: { type: 'wsl', distro, wslVersion, linuxRootPath: '', status: 'connecting' },
      activeProvider: provider,
    })
    try {
      const wsl = window.aetherDesktop?.wsl
      if (!wsl) throw new Error('WSL bridge unavailable')
      const check = await wsl.checkAvailable()
      if (!check.available) throw new Error('WSL is not available')
      if (_connectionEpoch !== epoch) return
      set({
        remoteConnection: { type: 'wsl', distro, wslVersion, linuxRootPath: '', status: 'connected' },
      })
    } catch (err) {
      if (_connectionEpoch !== epoch) return
      console.error('connectToWsl failed', err)
      set({
        remoteConnection: {
          type: 'wsl', distro, wslVersion, linuxRootPath: '',
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Connection failed',
        },
        activeProvider: null,
      })
    }
  },

  openWslFolder: async (linuxPath) => {
    const epoch = _connectionEpoch
    const provider = get().activeProvider
    const conn = get().remoteConnection
    if (!provider || conn?.type !== 'wsl' || conn.status !== 'connected') {
      console.error('openWslFolder: not connected to WSL')
      return
    }
    try {
      const { files: newFiles, rootPath, workspaceLabel } = await provider.loadTree(linuxPath)
      if (_connectionEpoch !== epoch) return
      const firstFileId = (() => {
        const flat: FileNode[] = []
        const visit = (n: FileNode) => {
          if (n.type === 'file') flat.push(n)
          if (n.children) n.children.forEach(visit)
        }
        newFiles.forEach((root) => visit(root))
        return flat[0]?.id ?? null
      })()
      const workspaceId = workspaceLabel
      const runtimeEnv = get().runtimeEnvironment
      const workspaceEnvironment: WorkspaceEnvironment = { workspaceId, overrides: {} }
      const resolved = resolveEnvironment(runtimeEnv, workspaceEnvironment)
      set({
        files: newFiles,
        fileHandles: {},
        workspaceHandle: null,
        workspaceRootPath: rootPath,
        openFiles: firstFileId ? [firstFileId] : [],
        activeFileId: firstFileId,
        activeWorkspaceId: workspaceLabel,
        worktreeChanges: {},
        syntaxTrees: {},
        symbolsByFile: {},
        diagnosticsByFile: {},
        indexingError: null,
        workspaceEnvironment,
        workspaceEnvironmentStatus: 'ready',
        aiMode: resolved.aiMode,
        lspMode: resolved.lspMode,
        externalLspEndpoint: resolved.externalLspEndpoint,
        resolvedEnvironment: resolved,
        remoteConnection: { ...conn, linuxRootPath: linuxPath },
      })
    } catch (err) {
      if (_connectionEpoch !== epoch) return
      console.error('openWslFolder failed', err)
      set({
        remoteConnection: {
          ...conn,
          linuxRootPath: linuxPath,
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Failed to open folder',
        },
      })
    }
  },

  disconnectRemote: () => {
    ++_connectionEpoch
    const runtimeEnv = get().runtimeEnvironment
    const resolved = resolveEnvironment(runtimeEnv, null)
    set({
      remoteConnection: null,
      activeProvider: null,
      files: INITIAL_FILES,
      fileHandles: {},
      workspaceHandle: null,
      workspaceRootPath: null,
      openFiles: ['App.tsx', 'main.tsx'],
      activeFileId: 'App.tsx',
      activeWorkspaceId: null,
      worktreeChanges: {},
      syntaxTrees: {},
      symbolsByFile: {},
      diagnosticsByFile: {},
      terminalPanelOpen: false,
      remotePickerOpen: false,
      wslFolderPromptOpen: false,
      indexingError: null,
      workspaceEnvironment: null,
      workspaceEnvironmentStatus: 'not_loaded',
      aiMode: resolved.aiMode,
      lspMode: resolved.lspMode,
      externalLspEndpoint: resolved.externalLspEndpoint,
      resolvedEnvironment: resolved,
      projectSettings: null,
    })
  },
}))
