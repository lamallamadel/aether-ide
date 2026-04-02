import { Check, Cloud, Monitor, Palette, Search, Server, Settings, Shield, Type, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { SETTINGS_CATEGORIES, type SettingsCategory } from '../config/settingsCategories'
import { getDesktopMeta, getWorkspaceShellKind } from '../services/fileSystem/workspaceBackend'
import { useEditorStore } from '../state/editorStore'
import { ThemedSelect } from './ThemedSelect'

export function SettingsModal() {
  const {
    settingsOpen,
    openSettings,
    settingsCategory,
    setSettingsCategory,
    editorFontSizePx,
    setEditorFontSizePx,
    editorMinimap,
    toggleEditorMinimap,
    editorWordWrap,
    toggleEditorWordWrap,
    aiMode,
    setAiMode,
    editorTheme,
    setEditorTheme,
    editorFontFamily,
    setEditorFontFamily,
    ideThemeColor,
    setIdeThemeColor,
    lspMode,
    setLspMode,
    externalLspEndpoint,
    setExternalLspEndpoint,
    runtimeEnvironment,
    workspaceEnvironmentStatus,
    activeWorkspaceId,
    resolvedEnvironment,
    resetWorkspaceEnvironment,
  } = useEditorStore(
    useShallow((s) => ({
      settingsOpen: s.settingsOpen,
      openSettings: s.openSettings,
      settingsCategory: s.settingsCategory,
      setSettingsCategory: s.setSettingsCategory,
      editorFontSizePx: s.editorFontSizePx,
      setEditorFontSizePx: s.setEditorFontSizePx,
      editorMinimap: s.editorMinimap,
      toggleEditorMinimap: s.toggleEditorMinimap,
      editorWordWrap: s.editorWordWrap,
      toggleEditorWordWrap: s.toggleEditorWordWrap,
      aiMode: s.aiMode,
      setAiMode: s.setAiMode,
      editorTheme: s.editorTheme,
      setEditorTheme: s.setEditorTheme,
      editorFontFamily: s.editorFontFamily,
      setEditorFontFamily: s.setEditorFontFamily,
      ideThemeColor: s.ideThemeColor,
      setIdeThemeColor: s.setIdeThemeColor,
      lspMode: s.lspMode,
      setLspMode: s.setLspMode,
      externalLspEndpoint: s.externalLspEndpoint,
      setExternalLspEndpoint: s.setExternalLspEndpoint,
      runtimeEnvironment: s.runtimeEnvironment,
      workspaceEnvironmentStatus: s.workspaceEnvironmentStatus,
      activeWorkspaceId: s.activeWorkspaceId,
      resolvedEnvironment: s.resolvedEnvironment,
      resetWorkspaceEnvironment: s.resetWorkspaceEnvironment,
    }))
  )

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)
  const searchQueryRef = useRef('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  const hostShellLabel = useMemo(() => {
    if (getWorkspaceShellKind() === 'electron') {
      const p = getDesktopMeta()?.platform ?? '?'
      return `Electron (${p})`
    }
    return 'Browser'
  }, [])

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return SETTINGS_CATEGORIES
    return SETTINGS_CATEGORIES.filter((category) => {
      const haystack = [category.label, ...category.keywords].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [searchQuery])

  useEffect(() => {
    if (!filteredCategories.some((category) => category.id === settingsCategory)) {
      const first = filteredCategories[0]
      if (first) setSettingsCategory(first.id)
    }
  }, [filteredCategories, setSettingsCategory, settingsCategory])

  const handleCategory = (category: SettingsCategory) => {
    setSettingsCategory(category)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (searchQueryRef.current.trim()) {
        setSearchQuery('')
        return
      }
      openSettings({ open: false })
      return
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [openSettings])

  useEffect(() => {
    if (!settingsOpen) return
    previousFocusRef.current = document.activeElement
    window.addEventListener('keydown', handleKeyDown)
    requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current instanceof HTMLElement) previousFocusRef.current.focus()
    }
  }, [settingsOpen, handleKeyDown])

  if (!settingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => openSettings({ open: false })}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="w-[860px] max-w-[95vw] max-h-[92vh] bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#151515]">
          <div className="flex items-center gap-2 font-medium">
            <Settings size={18} style={{ color: 'rgb(var(--color-primary-400))' }} />
            <span>Settings</span>
          </div>
          <button type="button" onClick={() => openSettings({ open: false })} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 bg-[#111111] border border-white/10 rounded px-3 py-2">
            <Search size={14} className="text-gray-500" />
            <input
              aria-label="Search settings"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-transparent text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="w-56 shrink-0 border-r border-white/5 p-3 overflow-y-auto custom-scrollbar">
            <nav aria-label="Settings categories" className="space-y-1">
              {filteredCategories.length === 0 ? (
                <div className="px-2 py-1 text-xs text-gray-500">Aucun resultat</div>
              ) : (
                filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-current={settingsCategory === category.id ? 'page' : undefined}
                    onClick={() => handleCategory(category.id)}
                    className="w-full rounded px-2 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
                    style={settingsCategory === category.id ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))' } : undefined}
                  >
                    {category.label}
                  </button>
                ))
              )}
            </nav>
          </aside>

          <section role="region" aria-labelledby={`settings-panel-${settingsCategory}`} className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-6">
            {settingsCategory === 'theme' && (
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
            )}

            {settingsCategory === 'editor' && (
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
            )}

            {settingsCategory === 'languages' && (
              <div className="space-y-4">
                <h3 id="settings-panel-languages" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Languages</h3>
                <InfoCard title="Default language for new files" value="aether (.aether)" />
                <InfoCard title="File associations" value=".yaml/.yml -> yaml, .aether -> aether" />
                <InfoCard title="Language support source" value="Built-in native extensions + syntax clients" />
              </div>
            )}

            {settingsCategory === 'servers' && (
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
            )}

            {settingsCategory === 'aiPrivacy' && (
              <div className="space-y-6">
                <h3 id="settings-panel-aiPrivacy" className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI Privacy</h3>
                <SettingRow icon={<Shield size={16} />} title="AI Mode" description="Local enforces zero-egress (blocks outbound network calls).">
                  <div className="flex items-center gap-1 bg-black/20 rounded p-1 border border-white/5">
                    <button
                      type="button"
                      className="px-2 py-1 rounded text-xs"
                      style={aiMode === 'cloud' ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))', borderColor: 'rgb(var(--color-primary-500) / 0.3)' } : {}}
                      onClick={() => setAiMode('cloud')}
                    >
                      <span className="inline-flex items-center gap-1"><Cloud size={12} />Cloud</span>
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded text-xs"
                      style={aiMode === 'local' ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))', borderColor: 'rgb(var(--color-primary-500) / 0.3)' } : {}}
                      onClick={() => setAiMode('local')}
                    >
                      Local
                    </button>
                  </div>
                </SettingRow>
              </div>
            )}

            {settingsCategory === 'environment' && (
              <div className="space-y-4">
                <h3 id="settings-panel-environment" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Environment</h3>
                <div className="grid grid-cols-1 gap-2 text-xs text-gray-400 bg-black/20 rounded border border-white/10 p-3">
                  <div>Host shell: <span className="text-gray-200">{hostShellLabel}</span></div>
                  <div>Runtime mode: <span className="text-gray-200">{runtimeEnvironment.mode}</span></div>
                  <div>Workspace: <span className="text-gray-200">{activeWorkspaceId ?? 'none'}</span></div>
                  <div>Workspace status: <span className="text-gray-200">{workspaceEnvironmentStatus}</span></div>
                  <div>Sources: <span className="text-gray-200">ai={resolvedEnvironment.sourceByField.aiMode}, lsp={resolvedEnvironment.sourceByField.lspMode}, endpoint={resolvedEnvironment.sourceByField.externalLspEndpoint}</span></div>
                </div>
                <button type="button" onClick={resetWorkspaceEnvironment} className="w-full bg-[#111111] border border-white/10 rounded px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
                  Reset workspace overrides
                </button>
              </div>
            )}

            {settingsCategory === 'keybindings' && (
              <div className="space-y-4">
                <h3 id="settings-panel-keybindings" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Keybindings</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>Ctrl/Cmd+K - Command Palette</li>
                  <li>Ctrl/Cmd+, - Open Settings</li>
                  <li>Ctrl/Cmd+B - Toggle Sidebar</li>
                  <li>Ctrl/Cmd+L - Toggle AI Panel</li>
                  <li>Ctrl/Cmd+Shift+O - Go to Symbol</li>
                  <li>Ctrl/Cmd+` - Toggle Terminal</li>
                </ul>
                <p className="text-xs text-gray-500">Custom keymap editor: coming soon.</p>
              </div>
            )}

            {settingsCategory === 'workspace' && (
              <div className="space-y-4">
                <h3 id="settings-panel-workspace" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Workspace</h3>
                <InfoCard title="Active workspace" value={activeWorkspaceId ?? 'none'} />
                <InfoCard title="Status" value={workspaceEnvironmentStatus} />
                <p className="text-xs text-gray-500">
                  Use File &gt; Open Folder to bind a project workspace (browser or Electron desktop).
                </p>
              </div>
            )}

            {settingsCategory === 'extensions' && (
              <div className="space-y-4">
                <h3 id="settings-panel-extensions" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Extensions</h3>
                <InfoCard title="Built-in native extensions" value="aether.native, yaml.native" />
                <InfoCard title="Runtime model" value="Trusted in-process + untrusted sandbox" />
                <p className="text-xs text-gray-500">Extension manager UI is not yet exposed in this version.</p>
              </div>
            )}

            <div className="h-px bg-white/5 mt-8" />
            <div className="text-center pt-2">
              <div className="text-xs text-gray-600">Aether Code v0.1.0 (Alpha)</div>
              <div className="text-[10px] text-gray-700 mt-1">Inspired by Cursor & Sublime Text</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function SettingRow(props: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded text-gray-400">{props.icon}</div>
        <div>
          <div className="text-sm font-medium text-gray-200">{props.title}</div>
          <div className="text-xs text-gray-500">{props.description}</div>
        </div>
      </div>
      <div className="min-w-[180px]">{props.children}</div>
    </div>
  )
}

function ToggleRow(props: { icon: ReactNode; title: string; description: string; onClick: () => void; enabled: boolean }) {
  return (
    <button type="button" className="w-full flex items-center justify-between" onClick={props.onClick}>
      <div className="flex items-center gap-3 text-left">
        <div className="p-2 bg-white/5 rounded text-gray-400">{props.icon}</div>
        <div>
          <div className="text-sm font-medium text-gray-200">{props.title}</div>
          <div className="text-xs text-gray-500">{props.description}</div>
        </div>
      </div>
      <div style={{ backgroundColor: props.enabled ? 'rgb(var(--color-primary-600))' : undefined }}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${props.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </button>
  )
}

function InfoCard(props: { title: string; value: string }) {
  return (
    <div className="text-xs text-gray-400 bg-black/20 rounded border border-white/10 p-3">
      <div className="text-gray-500 mb-1">{props.title}</div>
      <div className="text-gray-200">{props.value}</div>
    </div>
  )
}
