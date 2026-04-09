import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { extensionHost } from '../../extensions/host'
import { fetchMarketplace, installExtension, uninstallExtension } from '../../extensions/marketplace'
import type { MarketplaceExtension } from '../../extensions/types'
import { useEditorStore } from '../../state/editorStore'
import { ExtensionCard } from './ExtensionCard'

function useExtensionHostSnapshot() {
  return useSyncExternalStore(
    (cb) => extensionHost.onChange(cb),
    () => extensionHost.getSnapshot()
  )
}

export function ExtensionSidebar() {
  const openExtensionDetail = useEditorStore((s) => s.openExtensionDetail)
  useExtensionHostSnapshot()
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<MarketplaceExtension[]>([])
  const [installedOpen, setInstalledOpen] = useState(true)
  const [marketplaceOpen, setMarketplaceOpen] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setCatalog(fetchMarketplace(query || undefined))
  }, [query, refreshKey])

  const installedCatalog = catalog.filter((e) => e.installed)
  const availableCatalog = catalog.filter((e) => !e.installed)

  const handleInstall = useCallback((id: string) => {
    installExtension(id)
    setRefreshKey((k) => k + 1)
  }, [])

  const handleUninstall = useCallback((id: string) => {
    uninstallExtension(id)
    if (extensionHost.has(id)) extensionHost.unregister(id)
    setRefreshKey((k) => k + 1)
  }, [])

  const handleDetail = useCallback((id: string) => {
    openExtensionDetail(id)
  }, [openExtensionDetail])

  return (
    <div className="flex flex-col h-full">
      <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-gray-500 uppercase border-b border-white/5 shrink-0">
        Extensions
      </div>
      <div className="px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded px-2 py-1.5">
          <Search size={12} className="text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search extensions..."
            className="flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div>
          <button
            type="button"
            className="w-full flex items-center gap-1 px-3 py-2 text-[10px] font-bold tracking-wider text-gray-500 uppercase hover:bg-white/5"
            onClick={() => setInstalledOpen(!installedOpen)}
          >
            {installedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Installed ({installedCatalog.length})
          </button>
          {installedOpen && (
            <div>
              {installedCatalog.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-600">No installed extensions match</div>
              ) : (
                installedCatalog.map((ext) => (
                  <ExtensionCard
                    key={ext.id}
                    ext={ext}
                    onDetail={handleDetail}
                    onUninstall={handleUninstall}
                    compact
                  />
                ))
              )}
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            className="w-full flex items-center gap-1 px-3 py-2 text-[10px] font-bold tracking-wider text-gray-500 uppercase hover:bg-white/5"
            onClick={() => setMarketplaceOpen(!marketplaceOpen)}
          >
            {marketplaceOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Marketplace ({availableCatalog.length})
          </button>
          {marketplaceOpen && (
            <div>
              {availableCatalog.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-600">No extensions available</div>
              ) : (
                availableCatalog.map((ext) => (
                  <ExtensionCard
                    key={ext.id}
                    ext={ext}
                    onDetail={handleDetail}
                    onInstall={handleInstall}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
