import { memo } from 'react'

export type EditorMetrics = {
  line: number
  column: number
  selectionLength: number
}

/** Barre fine sous l’éditeur : ligne, colonne, sélection (repères type Replit / VS Code). */
export const EditorPositionBar = memo(function EditorPositionBar({ metrics }: { metrics: EditorMetrics }) {
  const { line, column, selectionLength } = metrics
  return (
    <div
      className="h-6 flex items-center justify-between gap-3 px-3 text-[11px] tabular-nums border-t border-white/5 bg-[#181818] text-gray-500 select-none"
      role="status"
      aria-live="polite"
      aria-label={`Line ${line}, column ${column}`}
    >
      <span className="text-gray-600">Editor</span>
      <div className="flex items-center gap-4 text-gray-400">
        <span>
          Ln {line}, Col {column}
        </span>
        {selectionLength > 0 && <span className="text-primary-300/90">{selectionLength} selected</span>}
      </div>
    </div>
  )
})
