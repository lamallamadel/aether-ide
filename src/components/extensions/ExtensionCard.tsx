import { Download, Puzzle, Star, Trash2 } from 'lucide-react'
import type { MarketplaceExtension } from '../../extensions/types'

interface ExtensionCardProps {
  ext: MarketplaceExtension
  onDetail: (id: string) => void
  onInstall?: (id: string) => void
  onUninstall?: (id: string) => void
  compact?: boolean
}

export function ExtensionCard({ ext, onDetail, onInstall, onUninstall, compact }: ExtensionCardProps) {
  const isBuiltin = ext.id === 'aether.native' || ext.id === 'yaml.native'

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors rounded group"
      onClick={() => onDetail(ext.id)}
    >
      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Puzzle size={16} className="text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200 truncate">{ext.name}</span>
          <span className="text-[10px] text-gray-600">v{ext.version}</span>
        </div>
        {!compact && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ext.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
          <span>{ext.author}</span>
          <span className="flex items-center gap-0.5">
            <Star size={9} className="text-yellow-500" />
            {ext.rating}
          </span>
          <span className="flex items-center gap-0.5">
            <Download size={9} />
            {ext.downloadCount >= 1000 ? `${(ext.downloadCount / 1000).toFixed(1)}k` : ext.downloadCount}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
        {ext.installed ? (
          !isBuiltin && onUninstall ? (
            <button
              type="button"
              onClick={() => onUninstall(ext.id)}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Uninstall"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Installed</span>
          )
        ) : onInstall ? (
          <button
            type="button"
            onClick={() => onInstall(ext.id)}
            className="px-2 py-1 text-[10px] font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
          >
            Install
          </button>
        ) : null}
      </div>
    </div>
  )
}
