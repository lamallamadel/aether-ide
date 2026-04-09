import { Palette } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { ThemedSelect } from '../ThemedSelect'
import { SettingRow } from './primitives'

export function ThemeSettings() {
  const { ideThemeColor, setIdeThemeColor, editorTheme, setEditorTheme } = useEditorStore(
    useShallow((s) => ({
      ideThemeColor: s.ideThemeColor,
      setIdeThemeColor: s.setIdeThemeColor,
      editorTheme: s.editorTheme,
      setEditorTheme: s.setEditorTheme,
    }))
  )

  return (
    <div className="space-y-6">
      <h3 id="settings-panel-theme" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Theme</h3>
      <SettingRow icon={<Palette size={16} />} title="Accent Color" description="Controls the main accent color of the IDE.">
        <ThemedSelect
          ariaLabel="Select accent color"
          value={ideThemeColor}
          onChange={setIdeThemeColor}
          options={[
            { value: 'purple', label: 'Purple' },
            { value: 'blue', label: 'Blue' },
            { value: 'green', label: 'Green' },
            { value: 'red', label: 'Red' },
            { value: 'teal', label: 'Teal' },
          ]}
        />
      </SettingRow>
      <SettingRow icon={<Palette size={16} />} title="Editor Theme" description="Controls the editor color scheme.">
        <ThemedSelect
          ariaLabel="Select editor theme"
          value={editorTheme}
          onChange={setEditorTheme}
          options={[
            { value: 'Aether', label: 'Aether' },
            { value: 'Sublime', label: 'Sublime' },
            { value: 'Monokai', label: 'Monokai' },
            { value: 'Nord', label: 'Nord' },
            { value: 'Solarized Light', label: 'Solarized Light' },
            { value: 'Solarized Dark', label: 'Solarized Dark' },
          ]}
        />
      </SettingRow>
    </div>
  )
}
