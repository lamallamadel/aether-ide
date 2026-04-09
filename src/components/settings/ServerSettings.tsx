import { Server } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { ThemedSelect } from '../ThemedSelect'
import { SettingRow } from './primitives'

export function ServerSettings() {
  const { lspMode, setLspMode, externalLspEndpoint, setExternalLspEndpoint } = useEditorStore(
    useShallow((s) => ({
      lspMode: s.lspMode,
      setLspMode: s.setLspMode,
      externalLspEndpoint: s.externalLspEndpoint,
      setExternalLspEndpoint: s.setExternalLspEndpoint,
    }))
  )

  return (
    <div className="space-y-6">
      <h3 id="settings-panel-servers" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Servers</h3>
      <SettingRow icon={<Server size={16} />} title="LSP Mode" description="Embedded, external, or auto fallback for Aether and YAML.">
        <ThemedSelect
          ariaLabel="Select LSP mode"
          value={lspMode}
          onChange={(value) => setLspMode(value as 'embedded' | 'external' | 'auto')}
          options={[
            { value: 'embedded', label: 'Embedded' },
            { value: 'external', label: 'External' },
            { value: 'auto', label: 'Auto' },
          ]}
        />
      </SettingRow>
      <SettingRow icon={<Server size={16} />} title="External endpoint (Aether/YAML)" description="HTTP endpoint for JSON-RPC bridge.">
        <input
          aria-label="External LSP endpoint"
          value={externalLspEndpoint}
          onChange={(e) => setExternalLspEndpoint(e.target.value)}
          placeholder="http://localhost:3001/lsp"
          className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none"
        />
      </SettingRow>
    </div>
  )
}
