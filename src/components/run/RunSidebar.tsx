/**
 * Sidebar panel for Run/Debug management.
 * Shows configurations, active instances, and auto-detection for the Aether ecosystem.
 */
import { useState, useEffect } from 'react'
import { Plus, RefreshCw, ChevronDown, ChevronRight, Square, Sparkles, Wrench, Terminal as TerminalIcon } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useRunStore, generateConfigId } from '../../run/runStore'
import { useEditorStore } from '../../state/editorStore'
import { stopInstance } from '../../run/runEngine'
import {
  detectNpmScriptsFsa,
  detectAetherProjects,
} from '../../run/launchConfig'
import type { DetectedProject } from '../../run/launchConfig'
import { RunConfigCard } from './RunConfigCard'
import type { RunConfiguration } from '../../run/types'

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  open,
  onToggle,
  count,
}: {
  title: string
  open: boolean
  onToggle: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 w-full px-2 py-1 text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
    >
      {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      <span>{title}</span>
      {count != null && (
        <span className="ml-auto text-gray-700 font-mono">{count}</span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Detection badge color
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<string, { color: string; icon: typeof Sparkles }> = {
  aether: { color: 'text-purple-400', icon: Sparkles },
  cmake: { color: 'text-cyan-400', icon: Wrench },
  python: { color: 'text-yellow-400', icon: TerminalIcon },
  npm: { color: 'text-green-400', icon: TerminalIcon },
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export function RunSidebar() {
  const {
    configurations,
    selectedConfigId,
    setSelectedConfigId,
    addConfig,
    instances,
    loadConfigsFromWorkspace,
    openBottomPanel,
  } = useRunStore(
    useShallow((s) => ({
      configurations: s.configurations,
      selectedConfigId: s.selectedConfigId,
      setSelectedConfigId: s.setSelectedConfigId,
      addConfig: s.addConfig,
      instances: s.instances,
      loadConfigsFromWorkspace: s.loadConfigsFromWorkspace,
      openBottomPanel: s.openBottomPanel,
    }))
  )

  const { workspaceRootPath, workspaceHandle, openRunConfigEditor } = useEditorStore(
    useShallow((s) => ({
      workspaceRootPath: s.workspaceRootPath,
      workspaceHandle: s.workspaceHandle,
      openRunConfigEditor: s.openRunConfigEditor,
    }))
  )

  const [configsOpen, setConfigsOpen] = useState(true)
  const [runningOpen, setRunningOpen] = useState(true)
  const [recentOpen, setRecentOpen] = useState(true)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [detectedProjects, setDetectedProjects] = useState<DetectedProject[]>([])
  const [loadingDetect, setLoadingDetect] = useState(false)

  useEffect(() => {
    void loadConfigsFromWorkspace(workspaceRootPath, workspaceHandle as FileSystemDirectoryHandle | null)
  }, [workspaceRootPath, workspaceHandle, loadConfigsFromWorkspace])

  const runDetection = async () => {
    setLoadingDetect(true)
    try {
      let projects: DetectedProject[] = []
      if (workspaceRootPath) {
        projects = await detectAetherProjects(workspaceRootPath)
      } else if (workspaceHandle) {
        const scripts = await detectNpmScriptsFsa(workspaceHandle as FileSystemDirectoryHandle)
        projects = scripts.map((s) => ({
          type: 'npm' as const,
          label: `npm run ${s.script}`,
          config: { type: 'npm' as const, npmScript: s.script, name: `npm run ${s.script}` },
        }))
      }
      setDetectedProjects(projects)
    } catch {
      setDetectedProjects([])
    } finally {
      setLoadingDetect(false)
    }
  }

  const handleAddDetected = (project: DetectedProject) => {
    const cfg: RunConfiguration = {
      id: generateConfigId(),
      name: project.config.name ?? project.label,
      type: project.config.type ?? project.type,
      ...project.config,
    }
    addConfig(cfg)
    setSelectedConfigId(cfg.id)
  }

  const handleAddNew = () => {
    const newConfig: RunConfiguration = {
      id: generateConfigId(),
      name: 'New Configuration',
      type: 'shell',
      command: '',
    }
    addConfig(newConfig)
    setSelectedConfigId(newConfig.id)
    openRunConfigEditor(newConfig.id)
  }

  const handleEdit = (configId: string) => {
    setSelectedConfigId(configId)
    openRunConfigEditor(configId)
  }

  const activeInstances = Object.values(instances).filter(
    (i) => i.state === 'running' || i.state === 'starting'
  )
  const recentInstances = Object.values(instances)
    .filter((i) => i.state === 'stopped' || i.state === 'error')
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
    .slice(0, 5)

  return (
    <div className="flex flex-col h-full text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Run / Debug</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Auto-detect project configurations"
            className="p-1 text-gray-500 hover:text-white transition-colors"
            onClick={() => { setSuggestionsOpen((v) => !v); if (!suggestionsOpen) void runDetection() }}
          >
            <RefreshCw size={12} className={loadingDetect ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            title="Add configuration"
            className="p-1 text-gray-500 hover:text-white transition-colors"
            onClick={handleAddNew}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Auto-detected suggestions */}
        {suggestionsOpen && detectedProjects.length > 0 && (
          <div className="mx-2 my-2 p-2 bg-white/5 rounded border border-white/10">
            <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Detected configurations</div>
            {detectedProjects.map((p, i) => {
              const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.npm
              const BadgeIcon = badge.icon
              return (
                <button
                  key={`${p.type}-${i}`}
                  type="button"
                  onClick={() => handleAddDetected(p)}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 hover:bg-white/10 rounded text-[11px] text-gray-300"
                >
                  <Plus size={10} className={badge.color} />
                  <BadgeIcon size={10} className={badge.color} />
                  <span className="truncate">{p.label}</span>
                </button>
              )
            })}
          </div>
        )}
        {suggestionsOpen && detectedProjects.length === 0 && !loadingDetect && (
          <div className="mx-2 my-2 p-2 bg-white/5 rounded border border-white/10 text-[10px] text-gray-600">
            No project files detected (CMakeLists.txt, Makefile, pyproject.toml, package.json).
          </div>
        )}

        {/* Configurations */}
        <SectionHeader
          title="Configurations"
          open={configsOpen}
          onToggle={() => setConfigsOpen((v) => !v)}
          count={configurations.length}
        />
        {configsOpen && (
          <>
            {configurations.length === 0 ? (
              <div className="px-4 py-3 text-gray-600 text-[11px]">
                No configurations.{' '}
                <button
                  type="button"
                  className="text-primary-400 hover:underline"
                  onClick={handleAddNew}
                >
                  Add one
                </button>
                {' or '}
                <button
                  type="button"
                  className="text-primary-400 hover:underline"
                  onClick={() => { setSuggestionsOpen(true); void runDetection() }}
                >
                  auto-detect
                </button>
                .
              </div>
            ) : (
              configurations.map((config) => (
                <RunConfigCard
                  key={config.id}
                  config={config}
                  isSelected={config.id === selectedConfigId}
                  onSelect={() => setSelectedConfigId(config.id)}
                  onEdit={() => handleEdit(config.id)}
                />
              ))
            )}
          </>
        )}

        {/* Active instances */}
        {activeInstances.length > 0 && (
          <>
            <SectionHeader
              title="Running"
              open={runningOpen}
              onToggle={() => setRunningOpen((v) => !v)}
              count={activeInstances.length}
            />
            {runningOpen && activeInstances.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer"
                onClick={() => {
                  useRunStore.getState().ensureRunTab(inst)
                  openBottomPanel()
                }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-[11px] text-gray-300 truncate flex-1">{inst.configName}</span>
                <button
                  type="button"
                  title="Stop"
                  className="p-0.5 text-gray-500 hover:text-red-400 shrink-0"
                  onClick={(e) => { e.stopPropagation(); stopInstance(inst.id) }}
                >
                  <Square size={10} />
                </button>
              </div>
            ))}
          </>
        )}

        {/* Recent (stopped/error) */}
        {recentInstances.length > 0 && (
          <>
            <div className="mt-1">
              <SectionHeader
                title="Recent"
                open={recentOpen}
                onToggle={() => setRecentOpen((v) => !v)}
              />
            </div>
            {recentOpen && recentInstances.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer"
                onClick={() => {
                  useRunStore.getState().ensureRunTab(inst)
                  openBottomPanel()
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    inst.state === 'error' ? 'bg-red-400' : 'bg-white/20'
                  }`}
                />
                <span className="text-[11px] text-gray-500 truncate flex-1">{inst.configName}</span>
                {inst.exitCode != null && (
                  <span className="text-[10px] text-gray-700 shrink-0">exit {inst.exitCode}</span>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Open panel button */}
      <div className="border-t border-white/5 px-3 py-2 shrink-0">
        <button
          type="button"
          className="w-full text-[10px] text-gray-600 hover:text-gray-300 text-left transition-colors"
          onClick={openBottomPanel}
        >
          Open Run Panel
        </button>
      </div>
    </div>
  )
}
