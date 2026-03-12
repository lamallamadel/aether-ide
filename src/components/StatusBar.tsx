import { AlertTriangle, Bot, Brain, Split, X } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import type { AiHealthStatus } from '../state/editorStore'

const AI_HEALTH_CONFIG: Record<AiHealthStatus, { color: string; label: string; pulse: boolean }> = {
  full:     { color: '#22c55e', label: 'AI Semantic',      pulse: false },
  degraded: { color: '#f59e0b', label: 'AI Keywords Only', pulse: true },
  offline:  { color: '#ef4444', label: 'AI Offline',       pulse: false },
  loading:  { color: '#6b7280', label: 'AI Loading...',    pulse: true },
}

export function StatusBar() {
  const { editorFontSizePx, perf, activeFileId, aiHealth, indexingError, storageQuotaExceeded } = useEditorStore()

  const languageLabel = activeFileId ? getLanguageLabel(activeFileId) : 'Plain Text'
  const healthConfig = AI_HEALTH_CONFIG[aiHealth]

  return (
    <div className="h-7 text-primary-100 font-semibold flex items-center justify-between px-4 text-xs select-none z-10" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
      <div className="flex items-center gap-2">
        {indexingError && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200" title={indexingError}>
            <AlertTriangle size={12} />
            <span>Indexing failed</span>
          </div>
        )}
        {storageQuotaExceeded && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-200" title="Storage quota exceeded. Try clearing browser data.">
            <AlertTriangle size={12} />
            <span>Storage full</span>
          </div>
        )}
        <div className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          <Split size={12} />
          <span>master*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          <X size={12} className="rounded-full bg-primary-500/20 p-0.5" />
          <span>0 errors</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          16ms: LT {perf.longTaskCount} / {Math.round(perf.longTaskMaxMs)}ms
        </span>
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">Size: {editorFontSizePx}px</span>
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">UTF-8</span>
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">{languageLabel}</span>
        <span
          className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer"
          title={getHealthTooltip(aiHealth)}
        >
          <span className={healthConfig.pulse ? 'animate-pulse' : ''}>
            <Brain size={12} style={{ color: healthConfig.color }} />
          </span>
          <span style={{ color: healthConfig.color }}>{healthConfig.label}</span>
        </span>
        <span className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          <Bot size={12} />
          <span>Copilot</span>
        </span>
      </div>
    </div>
  )
}

function getHealthTooltip(status: AiHealthStatus): string {
  switch (status) {
    case 'full': return 'AI is using semantic vector search (full intelligence)'
    case 'degraded': return 'Embedding model unavailable. Falling back to keyword search.'
    case 'offline': return 'AI search is offline. Check network connection.'
    case 'loading': return 'Loading embedding model...'
  }
}

function getLanguageLabel(fileId: string): string {
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.tsx')) return 'TypeScript React'
  if (lower.endsWith('.ts')) return 'TypeScript'
  if (lower.endsWith('.jsx')) return 'JavaScript React'
  if (lower.endsWith('.js')) return 'JavaScript'
  if (lower.endsWith('.json')) return 'JSON'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'Markdown'
  if (lower.endsWith('.css')) return 'CSS'
  if (lower.endsWith('.html')) return 'HTML'
  return 'Plain Text'
}
