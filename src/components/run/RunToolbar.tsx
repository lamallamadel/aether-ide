/**
 * Run toolbar — configuration selector dropdown + Play / Stop / Restart buttons.
 * Rendered inside the EditorArea header row.
 */
import { useState, useRef, useEffect } from 'react'
import { Play, Square, RotateCcw, ChevronDown, Settings2, Sparkles } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useRunStore } from '../../run/runStore'
import { launchSelected, stopInstance, restartInstance, launchActiveFile, launchWindQuick } from '../../run/runEngine'
import { useEditorStore } from '../../state/editorStore'

export function RunToolbar() {
  const {
    configurations,
    selectedConfigId,
    setSelectedConfigId,
    instances,
    openBottomPanel,
  } = useRunStore(
    useShallow((s) => ({
      configurations: s.configurations,
      selectedConfigId: s.selectedConfigId,
      setSelectedConfigId: s.setSelectedConfigId,
      instances: s.instances,
      openBottomPanel: s.openBottomPanel,
    }))
  )

  const { openRunConfigEditor, activeFileId, workspaceHasWindToml } = useEditorStore(
    useShallow((s) => ({
      openRunConfigEditor: s.openRunConfigEditor,
      activeFileId: s.activeFileId,
      workspaceHasWindToml: s.workspaceHasWindToml,
    }))
  )

  const isAetherFile = activeFileId?.endsWith('.aether') ?? false

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedConfig = configurations.find((c) => c.id === selectedConfigId) ?? null

  // Active instance for the selected config
  const activeInstance = selectedConfigId
    ? Object.values(instances).find(
        (i) =>
          i.configId === selectedConfigId &&
          (i.state === 'running' || i.state === 'starting')
      ) ?? null
    : null

  const isRunning = !!activeInstance
  const isStarting = activeInstance?.state === 'starting'

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleRun = () => {
    void launchSelected().then(() => openBottomPanel())
  }

  const handleStop = () => {
    if (activeInstance) stopInstance(activeInstance.id)
  }

  const handleRestart = () => {
    if (activeInstance) {
      void restartInstance(activeInstance.id)
    } else {
      void launchSelected().then(() => openBottomPanel())
    }
  }

  if (configurations.length === 0 && !isAetherFile && !workspaceHasWindToml) return null

  return (
    <div className="flex items-center gap-1 px-2 shrink-0">
      {/* wind run (Wind.toml workspace) */}
      {workspaceHasWindToml && (
        <button
          type="button"
          title="wind run"
          onClick={() => void launchWindQuick('run').then(() => openBottomPanel())}
          className="flex items-center gap-1 px-2 h-6 rounded text-[11px] text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
        >
          <Sparkles size={10} />
          <span className="truncate max-w-[72px]">Wind run</span>
        </button>
      )}
      {/* Run Active .aether File (direct aethercc when no Wind.toml) */}
      {isAetherFile && !workspaceHasWindToml && (
        <button
          type="button"
          title={`Run ${activeFileId}`}
          onClick={() => void launchActiveFile().then(() => openBottomPanel())}
          className="flex items-center gap-1 px-2 h-6 rounded text-[11px] text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
        >
          <Sparkles size={10} />
          <span className="truncate max-w-[100px]">Run</span>
        </button>
      )}
      {configurations.length === 0 ? null : (
        <>
      
      {/* Config selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-1 px-2 h-6 rounded text-[11px] text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 max-w-[160px] transition-colors"
        >
          <span className="truncate flex-1">
            {selectedConfig?.name ?? 'Select configuration'}
          </span>
          <ChevronDown size={10} className="shrink-0 text-gray-500" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded shadow-xl min-w-[200px] py-1">
            {configurations.map((config) => (
              <button
                key={config.id}
                type="button"
                onClick={() => {
                  setSelectedConfigId(config.id)
                  setDropdownOpen(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/10 transition-colors flex items-center gap-2 ${
                  config.id === selectedConfigId ? 'text-white' : 'text-gray-400'
                }`}
              >
                {config.id === selectedConfigId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                )}
                {config.id !== selectedConfigId && (
                  <span className="w-1.5 h-1.5 shrink-0" />
                )}
                <span className="truncate">{config.name}</span>
              </button>
            ))}
            <div className="h-px bg-white/10 my-1" />
            {selectedConfig && (
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false)
                  openRunConfigEditor(selectedConfig.id)
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-gray-500 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
              >
                <Settings2 size={11} />
                Edit configuration
              </button>
            )}
          </div>
        )}
      </div>

      {/* Run / Stop */}
      {isRunning ? (
        <button
          type="button"
          title="Stop"
          onClick={handleStop}
          className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Square size={12} />
        </button>
      ) : (
        <button
          type="button"
          title="Run"
          onClick={handleRun}
          disabled={!selectedConfig}
          className="w-6 h-6 flex items-center justify-center rounded text-green-400 hover:bg-green-400/10 disabled:opacity-30 transition-colors"
        >
          <Play size={12} />
        </button>
      )}

      {/* Restart */}
      <button
        type="button"
        title={isRunning ? 'Restart' : 'Re-run'}
        onClick={handleRestart}
        disabled={!selectedConfig}
        className={`w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors ${
          isStarting ? 'animate-spin' : ''
        }`}
      >
        <RotateCcw size={12} />
      </button>
        </>
      )}
    </div>
  )
}
