import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { getDesktopMeta, getWorkspaceShellKind } from '../../services/fileSystem/workspaceBackend'

export function EnvironmentSettings() {
  const { runtimeEnvironment, workspaceEnvironmentStatus, activeWorkspaceId, resolvedEnvironment, resetWorkspaceEnvironment } = useEditorStore(
    useShallow((s) => ({
      runtimeEnvironment: s.runtimeEnvironment,
      workspaceEnvironmentStatus: s.workspaceEnvironmentStatus,
      activeWorkspaceId: s.activeWorkspaceId,
      resolvedEnvironment: s.resolvedEnvironment,
      resetWorkspaceEnvironment: s.resetWorkspaceEnvironment,
    }))
  )

  const hostShellLabel = useMemo(() => {
    if (getWorkspaceShellKind() === 'electron') {
      const p = getDesktopMeta()?.platform ?? '?'
      return `Electron (${p})`
    }
    return 'Browser'
  }, [])

  return (
    <div className="space-y-4">
      <h3 id="settings-panel-environment" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Environment</h3>
      <div className="grid grid-cols-1 gap-2 text-xs text-gray-400 bg-black/20 rounded border border-white/10 p-3">
        <div>Host shell: <span className="text-gray-200">{hostShellLabel}</span></div>
        <div>Runtime mode: <span className="text-gray-200">{runtimeEnvironment.mode}</span></div>
        <div>Workspace: <span className="text-gray-200">{activeWorkspaceId ?? 'none'}</span></div>
        <div>Workspace status: <span className="text-gray-200">{workspaceEnvironmentStatus}</span></div>
        <div>Sources: <span className="text-gray-200">ai={resolvedEnvironment.sourceByField.aiMode}, lsp={resolvedEnvironment.sourceByField.lspMode}, endpoint={resolvedEnvironment.sourceByField.externalLspEndpoint}</span></div>
      </div>
      <button type="button" onClick={resetWorkspaceEnvironment} className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
        Reset workspace overrides
      </button>
    </div>
  )
}
