import { Puzzle } from 'lucide-react'
import { useEditorStore } from '../../state/editorStore'
import { extensionHost } from '../../extensions/host'
import { InfoCard } from './primitives'

export function ExtensionsSettings() {
  const setSidebarView = useEditorStore((s) => s.setSidebarView)
  const extensions = extensionHost.list()
  const active = extensions.filter((e) => e.state === 'active')

  return (
    <div className="space-y-4">
      <h3 id="settings-panel-extensions" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Extensions</h3>
      <InfoCard title="Installed extensions" value={`${extensions.length} total, ${active.length} active`} />
      <InfoCard title="Runtime model" value="Trusted in-process + untrusted sandbox" />
      <div className="flex flex-col gap-2">
        {extensions.map((ext) => (
          <div key={ext.module.manifest.id} className="flex items-center justify-between bg-black/20 border border-white/10 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <Puzzle size={14} className="text-gray-500" />
              <span className="text-sm text-gray-200">{ext.module.manifest.name}</span>
              <span className="text-[10px] text-gray-600">v{ext.module.manifest.version}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${ext.state === 'active' ? 'bg-green-500/20 text-green-400' : ext.state === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {ext.state}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setSidebarView('extensions')}
        className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-sm text-gray-200 hover:bg-white/5 flex items-center justify-center gap-2"
      >
        <Puzzle size={14} />
        Open Extension Manager
      </button>
    </div>
  )
}
