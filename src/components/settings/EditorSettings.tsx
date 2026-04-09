import { Check, Monitor, Type } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { ThemedSelect } from '../ThemedSelect'
import { SettingRow, ToggleRow } from './primitives'

export function EditorSettings() {
  const { editorFontSizePx, setEditorFontSizePx, editorFontFamily, setEditorFontFamily, editorMinimap, toggleEditorMinimap, editorWordWrap, toggleEditorWordWrap } = useEditorStore(
    useShallow((s) => ({
      editorFontSizePx: s.editorFontSizePx,
      setEditorFontSizePx: s.setEditorFontSizePx,
      editorFontFamily: s.editorFontFamily,
      setEditorFontFamily: s.setEditorFontFamily,
      editorMinimap: s.editorMinimap,
      toggleEditorMinimap: s.toggleEditorMinimap,
      editorWordWrap: s.editorWordWrap,
      toggleEditorWordWrap: s.toggleEditorWordWrap,
    }))
  )

  return (
    <div className="space-y-6">
      <h3 id="settings-panel-editor" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Editor</h3>
      <SettingRow icon={<Type size={16} />} title="Font Family" description="Controls the editor font family.">
        <ThemedSelect
          ariaLabel="Select editor font family"
          value={editorFontFamily}
          onChange={setEditorFontFamily}
          options={[
            { value: 'JetBrains Mono', label: 'JetBrains Mono' },
            { value: 'Fira Code', label: 'Fira Code' },
            { value: 'monospace', label: 'Monospace' },
          ]}
        />
      </SettingRow>
      <SettingRow icon={<Type size={16} />} title="Font Size" description="Controls the editor font size in pixels.">
        <div className="flex items-center gap-2 bg-black/20 rounded p-1 border border-white/5">
          <button type="button" onClick={() => setEditorFontSizePx(Math.max(10, editorFontSizePx - 1))} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm">-</button>
          <span className="w-10 text-center text-sm font-mono">{editorFontSizePx}</span>
          <button type="button" onClick={() => setEditorFontSizePx(Math.min(24, editorFontSizePx + 1))} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm">+</button>
        </div>
      </SettingRow>
      <ToggleRow icon={<Monitor size={16} />} title="Minimap" description="Controls whether the minimap is shown." onClick={toggleEditorMinimap} enabled={editorMinimap} />
      <ToggleRow icon={<Check size={16} />} title="Word Wrap" description="Wrap lines that exceed viewport width." onClick={toggleEditorWordWrap} enabled={editorWordWrap} />
    </div>
  )
}
