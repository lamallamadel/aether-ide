import { Download, Puzzle, Shield, Star, Terminal, Zap } from 'lucide-react'
import { useCallback, useState, useSyncExternalStore } from 'react'
import { extensionHost } from '../../extensions/host'
import { installExtension, uninstallExtension, isInstalled, BUILTIN_CATALOG } from '../../extensions/marketplace'

function useExtensionHostSnapshot() {
  return useSyncExternalStore(
    (cb) => extensionHost.onChange(cb),
    () => extensionHost.getSnapshot()
  )
}

export function ExtensionDetailView({ extId }: { extId: string }) {
  const extensions = useExtensionHostSnapshot()
  const [tab, setTab] = useState<'overview' | 'permissions' | 'contributions'>('overview')
  const [, setRefreshKey] = useState(0)

  const catalogEntry = BUILTIN_CATALOG.find((e) => e.id === extId)
  const hostEntry = extensions.find((e) => e.module.manifest.id === extId)
  const manifest = hostEntry?.module.manifest ?? catalogEntry
  const installed = isInstalled(extId)
  const isBuiltin = extId === 'aether.native' || extId === 'yaml.native'

  const handleInstall = useCallback(() => {
    installExtension(extId)
    setRefreshKey((k) => k + 1)
  }, [extId])

  const handleUninstall = useCallback(() => {
    uninstallExtension(extId)
    if (extensionHost.has(extId)) extensionHost.unregister(extId)
    setRefreshKey((k) => k + 1)
  }, [extId])

  const handleToggle = useCallback(async () => {
    if (!hostEntry) return
    if (extensionHost.isEnabled(extId)) {
      await extensionHost.disable(extId)
    } else {
      await extensionHost.enable(extId)
    }
  }, [extId, hostEntry])

  if (!manifest) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>Extension "{extId}" not found.</p>
      </div>
    )
  }

  const readme = catalogEntry?.readme ?? `# ${manifest.name}\n\nNo additional information available.`
  const description = catalogEntry?.description ?? manifest.description ?? 'No description'
  const author = catalogEntry?.author ?? manifest.author ?? 'Unknown'
  const rating = catalogEntry?.rating ?? 0
  const downloads = catalogEntry?.downloadCount ?? 0

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-y-auto custom-scrollbar">
      <div className="px-6 py-5 border-b border-white/5 bg-[#151515]">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <Puzzle size={28} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">{manifest.name}</h2>
              <span className="text-xs text-gray-500">v{manifest.version}</span>
              {hostEntry && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  hostEntry.state === 'active' ? 'bg-green-500/20 text-green-400' :
                  hostEntry.state === 'disabled' ? 'bg-yellow-500/20 text-yellow-400' :
                  hostEntry.state === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {hostEntry.state}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{author}</span>
              {rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={11} className="text-yellow-500" />
                  {rating}
                </span>
              )}
              {downloads > 0 && (
                <span className="flex items-center gap-1">
                  <Download size={11} />
                  {downloads >= 1000 ? `${(downloads / 1000).toFixed(1)}k` : downloads}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Terminal size={11} />
                {manifest.runtime}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {installed && hostEntry && (
              <button
                type="button"
                onClick={handleToggle}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                  extensionHost.isEnabled(extId)
                    ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                    : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                }`}
              >
                {extensionHost.isEnabled(extId) ? 'Disable' : 'Enable'}
              </button>
            )}
            {installed ? (
              !isBuiltin && (
                <button
                  type="button"
                  onClick={handleUninstall}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Uninstall
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleInstall}
                className="px-3 py-1.5 text-xs font-medium rounded text-white transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
              >
                Install
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-white/5">
        <div className="flex gap-0 px-6">
          {(['overview', 'permissions', 'contributions'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'text-white border-current'
                  : 'text-gray-500 hover:text-gray-300 border-transparent'
              }`}
              style={tab === t ? { color: 'rgb(var(--color-primary-400))' } : undefined}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6">
        {tab === 'overview' && (
          <div className="prose prose-invert prose-sm max-w-none">
            {readme.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>
              if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-gray-300 mt-4 mb-2">{line.slice(3)}</h2>
              if (line.startsWith('- ')) return <li key={i} className="text-sm text-gray-400 ml-4">{line.slice(2)}</li>
              if (line.trim() === '') return <br key={i} />
              return <p key={i} className="text-sm text-gray-400">{line}</p>
            })}
          </div>
        )}

        {tab === 'permissions' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Required Permissions</h3>
            {manifest.permissions.length === 0 ? (
              <p className="text-sm text-gray-500">No permissions required.</p>
            ) : (
              <div className="space-y-2">
                {manifest.permissions.map((p) => (
                  <div key={p} className="flex items-center gap-3 bg-black/20 border border-white/10 rounded px-3 py-2">
                    <Shield size={14} className="text-yellow-500 shrink-0" />
                    <div>
                      <div className="text-sm text-gray-200">{p}</div>
                      <div className="text-[10px] text-gray-500">
                        {p === 'workspace.read' && 'Read files and directories in the workspace'}
                        {p === 'workspace.search' && 'Search across workspace files'}
                        {p === 'network' && 'Make outbound network requests'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Zap size={12} />
              <span>Trusted: {manifest.trusted ? 'Yes (runs in-process)' : 'No (sandboxed)'}</span>
            </div>
          </div>
        )}

        {tab === 'contributions' && (
          <div className="space-y-4">
            {manifest.contributes?.commands && manifest.contributes.commands.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Commands</h3>
                <div className="space-y-1">
                  {manifest.contributes.commands.map((cmd) => (
                    <div key={cmd.id} className="flex items-center justify-between bg-black/20 border border-white/10 rounded px-3 py-2">
                      <span className="text-sm text-gray-200">{cmd.title}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{cmd.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {manifest.contributes?.languages && manifest.contributes.languages.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Languages</h3>
                <div className="space-y-1">
                  {manifest.contributes.languages.map((lang) => (
                    <div key={lang.id} className="flex items-center justify-between bg-black/20 border border-white/10 rounded px-3 py-2">
                      <span className="text-sm text-gray-200">{lang.id}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{lang.extensions.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!manifest.contributes?.commands?.length && !manifest.contributes?.languages?.length && (
              <p className="text-sm text-gray-500">No contributions declared.</p>
            )}
            <div className="mt-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Activation Events</h3>
              <div className="flex flex-wrap gap-1.5">
                {manifest.activationEvents.map((ev) => (
                  <span key={ev} className="text-[10px] font-mono text-gray-400 bg-black/20 border border-white/10 rounded px-2 py-1">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
