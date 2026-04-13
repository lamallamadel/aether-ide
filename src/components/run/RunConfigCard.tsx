/**
 * Card component for a single RunConfiguration in the sidebar.
 */
import { Play, Square, Pencil, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useRunStore } from '../../run/runStore'
import { launchConfig, stopInstance } from '../../run/runEngine'
import { useEditorStore } from '../../state/editorStore'
import type { RunConfiguration } from '../../run/types'

const TYPE_LABELS: Record<string, string> = {
  aether: 'aether',
  cmake: 'cmake',
  python: 'python',
  npm: 'npm',
  node: 'node',
  shell: 'shell',
  wsl: 'wsl',
}

const TYPE_COLORS: Record<string, string> = {
  aether: 'text-purple-400',
  cmake: 'text-cyan-400',
  python: 'text-yellow-400',
  npm: 'text-green-400',
  node: 'text-yellow-400',
  shell: 'text-cyan-400',
  wsl: 'text-purple-400',
}

interface Props {
  config: RunConfiguration
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
}

export function RunConfigCard({ config, isSelected, onSelect, onEdit }: Props) {
  const { instances, removeConfig } = useRunStore(
    useShallow((s) => ({ instances: s.instances, removeConfig: s.removeConfig }))
  )
  const workspaceRootPath = useEditorStore((s) => s.workspaceRootPath)

  // Find an active instance for this config
  const activeInstance = Object.values(instances).find(
    (i) => i.configId === config.id && (i.state === 'running' || i.state === 'starting')
  )

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation()
    void launchConfig(config, workspaceRootPath)
  }

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeInstance) stopInstance(activeInstance.id)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Delete "${config.name}"?`)) {
      removeConfig(config.id)
    }
  }

  const typeLabel = TYPE_LABELS[config.type] ?? config.type
  const typeColor = TYPE_COLORS[config.type] ?? 'text-gray-400'
  const subLabel =
    config.type === 'aether'
      ? `aethercc ${config.aetherFile ?? 'main.aether'}`
      : config.type === 'cmake'
      ? `cmake --build ${config.cmakeBuildDir ?? 'build'}${config.cmakeTarget ? ` --target ${config.cmakeTarget}` : ''}`
      : config.type === 'python'
      ? `python3 ${config.pythonModule ?? 'main.py'}`
      : config.type === 'npm'
      ? `npm run ${config.npmScript ?? '?'}`
      : config.type === 'node'
      ? config.nodeFile ?? 'index.js'
      : config.command ?? ''

  return (
    <div
      onClick={onSelect}
      className={`group flex items-start gap-2 px-3 py-2 cursor-pointer rounded mx-1 ${
        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      {/* Status dot */}
      <div className="mt-1 shrink-0">
        {activeInstance ? (
          <span className="block w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Running" />
        ) : (
          <span className="block w-2 h-2 rounded-full bg-white/20" title="Stopped" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-200 truncate">{config.name}</span>
          <span className={`text-[9px] font-mono uppercase ${typeColor} shrink-0`}>{typeLabel}</span>
        </div>
        {subLabel && (
          <div className="text-[10px] text-gray-600 truncate mt-0.5">{subLabel}</div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
        {activeInstance ? (
          <button
            type="button"
            title="Stop"
            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            onClick={handleStop}
          >
            <Square size={12} />
          </button>
        ) : (
          <button
            type="button"
            title="Run"
            className="p-1 text-gray-500 hover:text-green-400 transition-colors"
            onClick={handleRun}
          >
            <Play size={12} />
          </button>
        )}
        <button
          type="button"
          title="Edit"
          className="p-1 text-gray-500 hover:text-white transition-colors"
          onClick={handleEdit}
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          title="Delete"
          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
          onClick={handleDelete}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
