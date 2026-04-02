import { ChevronRight, FileCode } from 'lucide-react'
import { memo } from 'react'

/** Fil d’Ariane du fichier actif (repères type IDE : JetBrains / Cursor). */
export const EditorBreadcrumb = memo(function EditorBreadcrumb({ filePath }: { filePath: string }) {
  const segments = filePath.split(/[/\\]/).filter(Boolean)
  if (segments.length === 0) return null

  return (
    <div
      className="flex items-center gap-0.5 min-h-[28px] px-3 py-1 text-[11px] leading-tight border-b border-white/5 bg-[#141414] text-gray-400 overflow-hidden"
      aria-label="Chemin du fichier"
    >
      <FileCode size={12} className="shrink-0 text-gray-500 mr-1" aria-hidden />
      <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar gap-0.5">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          return (
            <span key={`${i}-${seg}`} className="flex items-center gap-0.5 shrink-0 min-w-0">
              {i > 0 && <ChevronRight size={10} className="shrink-0 opacity-40 text-gray-500" aria-hidden />}
              <span
                className={
                  isLast
                    ? 'text-gray-200 font-medium truncate max-w-[min(40vw,240px)]'
                    : 'text-gray-500 truncate max-w-[120px]'
                }
                title={seg}
              >
                {seg}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
})
