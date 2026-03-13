import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import { lineDiff } from '../services/diff/lineDiff'
import { assessProposedChange } from '../services/security/riskEngine'

export function MissionControl() {
  const {
    missionControlOpen,
    setMissionControlOpen,
    worktreeChanges,
    upsertWorktreeChange,
    applyWorktreeChange,
    rejectWorktreeChange,
    clearWorktree,
    activeFileId,
    getFileContent,
    findNode,
  } = useEditorStore(
    useShallow((s) => ({
      missionControlOpen: s.missionControlOpen,
      setMissionControlOpen: s.setMissionControlOpen,
      worktreeChanges: s.worktreeChanges,
      upsertWorktreeChange: s.upsertWorktreeChange,
      applyWorktreeChange: s.applyWorktreeChange,
      rejectWorktreeChange: s.rejectWorktreeChange,
      clearWorktree: s.clearWorktree,
      activeFileId: s.activeFileId,
      getFileContent: s.getFileContent,
      findNode: s.findNode,
    }))
  )

  const changeList = useMemo(() => Object.values(worktreeChanges), [worktreeChanges])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [confirmHighRisk, setConfirmHighRisk] = useState(false)

  useEffect(() => {
    if (!missionControlOpen) return
    if (changeList.length === 0) {
      const target = activeFileId ?? 'App.tsx'
      const original = getFileContent(target)
      const proposed = original.replace('Welcome to Aether Code', 'Bienvenue sur Aether Code')
      if (original && proposed !== original) {
        upsertWorktreeChange({ fileId: target, originalContent: original, proposedContent: proposed })
        setSelectedFileId(target)
      }
      return
    }
    if (!selectedFileId) setSelectedFileId(changeList[0].fileId)
  }, [activeFileId, changeList, getFileContent, missionControlOpen, selectedFileId, upsertWorktreeChange])

  useEffect(() => {
    if (!missionControlOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMissionControlOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [missionControlOpen, setMissionControlOpen])

  const selected = selectedFileId ? worktreeChanges[selectedFileId] : null
  const selectedName = selectedFileId ? findNode(selectedFileId)?.name ?? selectedFileId : null
  const risk = useMemo(() => {
    if (!selected) return null
    return assessProposedChange(selected.originalContent, selected.proposedContent)
  }, [selected])
  const diffLines = useMemo(() => {
    if (!selected) return []
    return lineDiff(selected.originalContent, selected.proposedContent)
  }, [selected])
  useEffect(() => {
    setConfirmHighRisk(false)
  }, [selectedFileId])

  if (!missionControlOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[8vh]">
      <div className="w-[1000px] h-[72vh] bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
          <div className="text-xs font-bold tracking-wider text-gray-400 uppercase">Mission Control</div>
          <button
            className="text-gray-500 hover:text-white"
            onClick={() => setMissionControlOpen(false)}
            type="button"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-64 border-r border-white/5 bg-[#0c0c0c] flex flex-col">
            <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-gray-500 uppercase border-b border-white/5">
              Changes
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
              {changeList.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No pending changes</div>
              ) : (
                changeList.map((c) => {
                  const isActive = c.fileId === selectedFileId
                  const name = findNode(c.fileId)?.name ?? c.fileId
                  return (
                    <div
                      key={c.fileId}
                      className={`px-4 py-2 text-sm cursor-pointer ${
                        isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                      onClick={() => setSelectedFileId(c.fileId)}
                    >
                      <div className="truncate">{name}</div>
                      <div className="text-xs text-gray-600 truncate">{c.fileId}</div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-xs text-gray-400 truncate">{selectedName ?? 'Select a change'}</div>
                {risk ? (
                  <div
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      risk.level === 'trivial'
                        ? 'bg-green-500/10 text-green-200 border-green-500/20'
                        : risk.level === 'review'
                          ? 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20'
                          : 'bg-red-500/10 text-red-200 border-red-500/20'
                    }`}
                    title={risk.reasons.join('\n')}
                  >
                    {risk.level.toUpperCase()}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-2 py-1 rounded bg-white/5 text-gray-300 hover:bg-white/10"
                  type="button"
                  onClick={() => {
                    clearWorktree()
                    setSelectedFileId(null)
                  }}
                >
                  Reject All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar font-mono text-xs leading-5">
              {selected ? (
                diffLines.map((l, idx) => (
                  <div
                    key={idx}
                    className={`px-4 whitespace-pre ${
                      l.type === 'add' ? 'bg-green-500/10 text-green-200' : l.type === 'del' ? 'bg-red-500/10 text-red-200' : 'text-gray-300'
                    }`}
                  >
                    <span className="inline-block w-4 select-none opacity-60">
                      {l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '}
                    </span>
                    <span>{l.text}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-gray-500">No diff to display</div>
              )}
            </div>

            <div className="h-12 border-t border-white/5 bg-[#0c0c0c] flex items-center justify-end gap-2 px-4">
              <button
                className="flex items-center gap-2 text-xs px-3 py-2 rounded bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
                type="button"
                disabled={!selectedFileId}
                onClick={() => {
                  if (!selectedFileId) return
                  rejectWorktreeChange(selectedFileId)
                  setSelectedFileId(null)
                }}
              >
                <X size={12} />
                Reject
              </button>
              <button
                style={{ backgroundColor: 'rgb(var(--color-primary-600))', '--tw-bg-opacity': '1' } as React.CSSProperties}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded text-white disabled:opacity-40"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500))')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))')}
                type="button"
                disabled={!selectedFileId}
                onClick={() => {
                  if (!selectedFileId) return
                  if (risk?.level === 'high' && !confirmHighRisk) {
                    setConfirmHighRisk(true)
                    return
                  }
                  applyWorktreeChange(selectedFileId)
                  setSelectedFileId(null)
                }}
              >
                <Check size={12} />
                {risk?.level === 'high' && !confirmHighRisk ? 'Accept (Confirm)' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
