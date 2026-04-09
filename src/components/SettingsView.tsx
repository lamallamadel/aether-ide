import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { SETTINGS_CATEGORIES, type SettingsCategory } from '../config/settingsCategories'
import { useEditorStore } from '../state/editorStore'
import { ThemeSettings } from './settings/ThemeSettings'
import { EditorSettings } from './settings/EditorSettings'
import { LanguageSettings } from './settings/LanguageSettings'
import { ServerSettings } from './settings/ServerSettings'
import { AiPrivacySettings } from './settings/AiPrivacySettings'
import { EnvironmentSettings } from './settings/EnvironmentSettings'
import { KeybindingsSettings } from './settings/KeybindingsSettings'
import { WorkspaceSettings } from './settings/WorkspaceSettings'
import { ExtensionsSettings } from './settings/ExtensionsSettings'

const PANEL_MAP: Record<SettingsCategory, React.FC> = {
  theme: ThemeSettings,
  editor: EditorSettings,
  languages: LanguageSettings,
  servers: ServerSettings,
  aiPrivacy: AiPrivacySettings,
  environment: EnvironmentSettings,
  keybindings: KeybindingsSettings,
  workspace: WorkspaceSettings,
  extensions: ExtensionsSettings,
}

export function SettingsView() {
  const { settingsCategory, setSettingsCategory } = useEditorStore(
    useShallow((s) => ({
      settingsCategory: s.settingsCategory,
      setSettingsCategory: s.setSettingsCategory,
    }))
  )

  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return SETTINGS_CATEGORIES
    return SETTINGS_CATEGORIES.filter((c) => {
      const haystack = [c.label, ...c.keywords].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [searchQuery])

  useEffect(() => {
    if (!filteredCategories.some((c) => c.id === settingsCategory)) {
      const first = filteredCategories[0]
      if (first) setSettingsCategory(first.id)
    }
  }, [filteredCategories, setSettingsCategory, settingsCategory])

  const Panel = PANEL_MAP[settingsCategory]

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 bg-[#111111] border border-white/10 rounded px-3 py-2">
          <Search size={14} className="text-gray-500" />
          <input
            ref={searchRef}
            aria-label="Search settings"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full bg-transparent text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 border-r border-white/5 p-3 overflow-y-auto custom-scrollbar">
          <nav aria-label="Settings categories" className="space-y-1">
            {filteredCategories.length === 0 ? (
              <div className="px-2 py-1 text-xs text-gray-500">No results</div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-current={settingsCategory === category.id ? 'page' : undefined}
                  onClick={() => setSettingsCategory(category.id)}
                  className="w-full rounded px-2 py-2 text-left text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  style={settingsCategory === category.id ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))' } : undefined}
                >
                  {category.label}
                </button>
              ))
            )}
          </nav>
        </aside>

        <section
          role="region"
          aria-labelledby={`settings-panel-${settingsCategory}`}
          className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6"
        >
          {Panel && <Panel />}
          <div className="h-px bg-white/5 mt-8" />
          <div className="text-center pt-2">
            <div className="text-xs text-gray-600">Aether Code v0.1.0 (Alpha)</div>
            <div className="text-[10px] text-gray-700 mt-1">Inspired by Cursor & Sublime Text</div>
          </div>
        </section>
      </div>
    </div>
  )
}
