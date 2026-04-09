/**
 * Zustand store for Run/Debug management.
 * Manages configurations, running instances, and the bottom panel tab system.
 */
import { create } from 'zustand'
import type { RunConfiguration, RunInstance, BottomPanelTab } from './types'
import {
  readLaunchConfigs,
  writeLaunchConfigs,
  readLaunchConfigsFsa,
  writeLaunchConfigsFsa,
  generateConfigId,
} from './launchConfig'

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface RunState {
  /** All saved run configurations */
  configurations: RunConfiguration[]
  /** Live + recent run instances */
  instances: Record<string, RunInstance>
  /** Id of the configuration selected in the toolbar dropdown */
  selectedConfigId: string | null
  /** Bottom panel: ordered tabs */
  bottomTabs: BottomPanelTab[]
  /** Bottom panel: id of the active tab */
  activeBottomTabId: string | null
  /** Whether the bottom panel is open */
  bottomPanelOpen: boolean
  /** Height of the bottom panel in px */
  bottomPanelHeight: number
  /** Whether configs have been loaded from disk */
  configsLoaded: boolean

  // -------------------------------------------------------------------------
  // Config CRUD
  // -------------------------------------------------------------------------
  addConfig: (config: RunConfiguration) => void
  updateConfig: (id: string, patch: Partial<RunConfiguration>) => void
  removeConfig: (id: string) => void
  setSelectedConfigId: (id: string | null) => void
  loadConfigsFromWorkspace: (
    workspaceRootPath: string | null,
    workspaceHandle: FileSystemDirectoryHandle | null
  ) => Promise<void>
  saveConfigsToWorkspace: (
    workspaceRootPath: string | null,
    workspaceHandle: FileSystemDirectoryHandle | null
  ) => Promise<void>

  // -------------------------------------------------------------------------
  // Instance management (called by runEngine)
  // -------------------------------------------------------------------------
  addInstance: (instance: RunInstance) => void
  updateInstance: (id: string, patch: Partial<RunInstance>) => void
  appendOutput: (instanceId: string, text: string) => void
  removeInstance: (id: string) => void

  // -------------------------------------------------------------------------
  // Bottom panel
  // -------------------------------------------------------------------------
  openBottomPanel: () => void
  closeBottomPanel: () => void
  toggleBottomPanel: () => void
  setBottomPanelHeight: (h: number) => void
  setActiveBottomTab: (id: string) => void
  addBottomTab: (tab: BottomPanelTab) => void
  removeBottomTab: (id: string) => void
  /** Ensure a 'terminal' tab exists and make it active */
  ensureTerminalTab: (sessionId: number) => void
  /** Ensure a 'run' tab for the given instance exists and make it active */
  ensureRunTab: (instance: RunInstance) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TERMINAL_TAB_ID = 'tab-terminal'

function makeTerminalTab(sessionId: number): BottomPanelTab {
  return {
    id: TERMINAL_TAB_ID,
    kind: 'terminal',
    label: 'Terminal',
    terminalSessionId: sessionId,
  }
}

function makeRunTab(instance: RunInstance): BottomPanelTab {
  return {
    id: `tab-run-${instance.id}`,
    kind: 'run',
    label: instance.configName,
    instanceId: instance.id,
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRunStore = create<RunState>((set, get) => ({
  configurations: [],
  instances: {},
  selectedConfigId: null,
  bottomTabs: [makeTerminalTab(0)],
  activeBottomTabId: TERMINAL_TAB_ID,
  bottomPanelOpen: false,
  bottomPanelHeight: 220,
  configsLoaded: false,

  // ---- Config CRUD -------------------------------------------------------

  addConfig: (config) => {
    set((s) => ({ configurations: [...s.configurations, config] }))
    const st = get()
    void st.saveConfigsToWorkspace(null, null)
  },

  updateConfig: (id, patch) => {
    set((s) => ({
      configurations: s.configurations.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
    const st = get()
    void st.saveConfigsToWorkspace(null, null)
  },

  removeConfig: (id) => {
    set((s) => ({
      configurations: s.configurations.filter((c) => c.id !== id),
      selectedConfigId: s.selectedConfigId === id ? null : s.selectedConfigId,
    }))
    const st = get()
    void st.saveConfigsToWorkspace(null, null)
  },

  setSelectedConfigId: (id) => set({ selectedConfigId: id }),

  loadConfigsFromWorkspace: async (workspaceRootPath, workspaceHandle) => {
    try {
      let configs: RunConfiguration[] = []
      if (workspaceRootPath) {
        configs = await readLaunchConfigs(workspaceRootPath)
      } else if (workspaceHandle) {
        configs = await readLaunchConfigsFsa(workspaceHandle)
      }
      set({
        configurations: configs,
        configsLoaded: true,
        selectedConfigId: configs.find((c) => c.pinned)?.id ?? configs[0]?.id ?? null,
      })
    } catch {
      set({ configsLoaded: true })
    }
  },

  saveConfigsToWorkspace: async (workspaceRootPath, workspaceHandle) => {
    const { configurations } = get()
    // Accept overridden paths from call site; fall back to nothing (no-op if neither)
    const effectiveRoot = workspaceRootPath
    const effectiveHandle = workspaceHandle
    if (!effectiveRoot && !effectiveHandle) return
    try {
      if (effectiveRoot) {
        await writeLaunchConfigs(effectiveRoot, configurations)
      } else if (effectiveHandle) {
        await writeLaunchConfigsFsa(effectiveHandle, configurations)
      }
    } catch (err) {
      console.error('runStore: failed to save launch.json', err)
    }
  },

  // ---- Instances ----------------------------------------------------------

  addInstance: (instance) =>
    set((s) => ({ instances: { ...s.instances, [instance.id]: instance } })),

  updateInstance: (id, patch) =>
    set((s) => {
      const existing = s.instances[id]
      if (!existing) return s
      return { instances: { ...s.instances, [id]: { ...existing, ...patch } } }
    }),

  appendOutput: (instanceId, text) =>
    set((s) => {
      const inst = s.instances[instanceId]
      if (!inst) return s
      const MAX_LINES = 2000
      const next = [...inst.outputLines, text]
      const trimmed = next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
      return { instances: { ...s.instances, [instanceId]: { ...inst, outputLines: trimmed } } }
    }),

  removeInstance: (id) =>
    set((s) => {
      const next = { ...s.instances }
      delete next[id]
      return { instances: next }
    }),

  // ---- Bottom panel -------------------------------------------------------

  openBottomPanel: () => set({ bottomPanelOpen: true }),
  closeBottomPanel: () => set({ bottomPanelOpen: false }),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelHeight: (h) => set({ bottomPanelHeight: Math.max(100, Math.min(600, h)) }),

  setActiveBottomTab: (id) =>
    set((s) => {
      if (!s.bottomTabs.find((t) => t.id === id)) return s
      return { activeBottomTabId: id }
    }),

  addBottomTab: (tab) =>
    set((s) => {
      if (s.bottomTabs.find((t) => t.id === tab.id)) return { activeBottomTabId: tab.id }
      return { bottomTabs: [...s.bottomTabs, tab], activeBottomTabId: tab.id }
    }),

  removeBottomTab: (id) =>
    set((s) => {
      const remaining = s.bottomTabs.filter((t) => t.id !== id)
      const nextActive =
        s.activeBottomTabId === id
          ? (remaining[remaining.length - 1]?.id ?? null)
          : s.activeBottomTabId
      return { bottomTabs: remaining, activeBottomTabId: nextActive }
    }),

  ensureTerminalTab: (sessionId) => {
    const tab = makeTerminalTab(sessionId)
    const s = get()
    const existing = s.bottomTabs.find((t) => t.id === TERMINAL_TAB_ID)
    if (existing) {
      set({
        bottomTabs: s.bottomTabs.map((t) =>
          t.id === TERMINAL_TAB_ID ? { ...t, terminalSessionId: sessionId } : t
        ),
        activeBottomTabId: TERMINAL_TAB_ID,
        bottomPanelOpen: true,
      })
    } else {
      set({
        bottomTabs: [tab, ...s.bottomTabs],
        activeBottomTabId: TERMINAL_TAB_ID,
        bottomPanelOpen: true,
      })
    }
  },

  ensureRunTab: (instance) => {
    const tab = makeRunTab(instance)
    const s = get()
    if (s.bottomTabs.find((t) => t.id === tab.id)) {
      set({ activeBottomTabId: tab.id, bottomPanelOpen: true })
    } else {
      set({
        bottomTabs: [...s.bottomTabs, tab],
        activeBottomTabId: tab.id,
        bottomPanelOpen: true,
      })
    }
  },
}))

// Stable save helper that reads workspace paths from editorStore at call time
export async function saveRunConfigsNow(): Promise<void> {
  const { useEditorStore } = await import('../state/editorStore')
  const { workspaceRootPath, workspaceHandle } = useEditorStore.getState()
  const { configurations } = useRunStore.getState()
  if (workspaceRootPath) {
    await writeLaunchConfigs(workspaceRootPath, configurations)
  } else if (workspaceHandle) {
    await writeLaunchConfigsFsa(workspaceHandle as FileSystemDirectoryHandle, configurations)
  }
}

/** Generate a new unique config id (re-export for use in components) */
export { generateConfigId }
