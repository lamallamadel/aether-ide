import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'

/** Bandeau Accept / Reject quand un worktree fantôme existe pour le fichier actif (aperçu type Cursor). */
export function WorktreeInlineBar() {
  const { activeFileId, worktreeChanges, applyWorktreeChange, rejectWorktreeChange } = useEditorStore(
    useShallow((s) => ({
      activeFileId: s.activeFileId,
      worktreeChanges: s.worktreeChanges,
      applyWorktreeChange: s.applyWorktreeChange,
      rejectWorktreeChange: s.rejectWorktreeChange,
    }))
  )

  if (!activeFileId) return null
  const change = worktreeChanges[activeFileId]
  if (!change) return null

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs border-b border-amber-500/30 bg-amber-950/40 text-amber-100 shrink-0">
      <span>Worktree preview — proposed changes differ from saved file.</span>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
          onClick={() => rejectWorktreeChange(activeFileId)}
        >
          Reject
        </button>
        <button
          type="button"
          className="px-2 py-0.5 rounded bg-primary-600 hover:bg-primary-500 text-white"
          onClick={() => applyWorktreeChange(activeFileId)}
        >
          Accept
        </button>
      </div>
    </div>
  )
}
