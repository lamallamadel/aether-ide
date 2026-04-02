import { useMemo } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'

const lineFromOffset = (content: string, offset: number) =>
  content.slice(0, Math.min(offset, content.length)).split('\n').length

/** Actions rapides mock lors d’un clic sur le gutter IA (intentions type JetBrains). */
export function AiQuickFixBar() {
  const { aiQuickFixContext, setAiQuickFixContext, activeFileId, setMissionControlOpen, symbolsByFile, getFileContent } =
    useEditorStore(
      useShallow((s) => ({
        aiQuickFixContext: s.aiQuickFixContext,
        setAiQuickFixContext: s.setAiQuickFixContext,
        activeFileId: s.activeFileId,
        setMissionControlOpen: s.setMissionControlOpen,
        symbolsByFile: s.symbolsByFile,
        getFileContent: s.getFileContent,
      }))
    )

  const ctx = aiQuickFixContext
  const atSymbol = useMemo(() => {
    if (!ctx) return undefined
    const symbols = symbolsByFile[ctx.fileId] ?? []
    const content = getFileContent(ctx.fileId)
    return symbols.find((s) => lineFromOffset(content, s.startIndex) === ctx.line)
  }, [ctx, symbolsByFile, getFileContent])

  if (!aiQuickFixContext) return null
  const { fileId, line, kind } = aiQuickFixContext

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs border-b border-primary-500/25 bg-[#1a1525] text-gray-200 shrink-0">
      <Lightbulb size={14} className="text-primary-400 shrink-0" />
      <span>
        Quick fix (line {line}, {kind}) {activeFileId === fileId ? '' : ` — ${fileId}`}
      </span>
      <div className="flex flex-wrap gap-1 ml-auto">
        <button
          type="button"
          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
          onClick={() => setAiQuickFixContext(null)}
        >
          Dismiss
        </button>
        {atSymbol && (
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('aether-goto-symbol', {
                  detail: { fileId, startIndex: atSymbol.startIndex },
                })
              )
              setAiQuickFixContext(null)
            }}
          >
            Go to definition
          </button>
        )}
        <button
          type="button"
          className="px-2 py-0.5 rounded bg-primary-600/80 hover:bg-primary-500 text-white"
          onClick={() => {
            setMissionControlOpen(true)
            setAiQuickFixContext(null)
          }}
        >
          Open Mission Control
        </button>
      </div>
      <button
        type="button"
        className="p-0.5 text-gray-500 hover:text-white"
        aria-label="Close"
        onClick={() => setAiQuickFixContext(null)}
      >
        <X size={14} />
      </button>
    </div>
  )
}
