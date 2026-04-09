import { Cloud, Shield } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { SettingRow } from './primitives'

export function AiPrivacySettings() {
  const { aiMode, setAiMode } = useEditorStore(
    useShallow((s) => ({ aiMode: s.aiMode, setAiMode: s.setAiMode }))
  )

  return (
    <div className="space-y-6">
      <h3 id="settings-panel-aiPrivacy" className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI Privacy</h3>
      <SettingRow icon={<Shield size={16} />} title="AI Mode" description="Local enforces zero-egress (blocks outbound network calls).">
        <div className="flex items-center gap-1 bg-black/20 rounded p-1 border border-white/5">
          <button
            type="button"
            className="px-2 py-1 rounded text-xs"
            style={aiMode === 'cloud' ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))' } : {}}
            onClick={() => setAiMode('cloud')}
          >
            <span className="inline-flex items-center gap-1"><Cloud size={12} />Cloud</span>
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded text-xs"
            style={aiMode === 'local' ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))' } : {}}
            onClick={() => setAiMode('local')}
          >
            Local
          </button>
        </div>
      </SettingRow>
    </div>
  )
}
