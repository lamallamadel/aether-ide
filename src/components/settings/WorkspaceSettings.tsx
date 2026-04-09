import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { InfoCard } from './primitives'

export function WorkspaceSettings() {
  const { activeWorkspaceId, workspaceEnvironmentStatus } = useEditorStore(
    useShallow((s) => ({
      activeWorkspaceId: s.activeWorkspaceId,
      workspaceEnvironmentStatus: s.workspaceEnvironmentStatus,
    }))
  )

  return (
    <div className="space-y-4">
      <h3 id="settings-panel-workspace" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Workspace</h3>
      <InfoCard title="Active workspace" value={activeWorkspaceId ?? 'none'} />
      <InfoCard title="Status" value={workspaceEnvironmentStatus} />
      <p className="text-xs text-gray-500">
        Use File &gt; Open Folder to bind a project workspace (browser or Electron desktop).
      </p>
    </div>
  )
}
