import { Check, Cloud, Monitor, Palette, Settings, Shield, Type, X } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import { ThemedSelect } from './ThemedSelect'

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
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
  } = useEditorStore(
    useShallow((s) => ({
      settingsOpen: s.settingsOpen,
      setSettingsOpen: s.setSettingsOpen,
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
    }))
  )

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setSettingsOpen(false)
      return
    }
    // Focus trap: cycle focus within the dialog
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
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }, [setSettingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    previousFocusRef.current = document.activeElement
    window.addEventListener('keydown', handleKeyDown)
    // Auto-focus the dialog on open
    requestAnimationFrame(() => {
      dialogRef.current?.focus()
    })
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      // Restore focus to previously focused element
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [settingsOpen, handleKeyDown])

  if (!settingsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="w-[520px] max-w-[95vw] bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#151515]">
          <div className="flex items-center gap-2 font-medium">
            <Settings size={18} style={{ color: 'rgb(var(--color-primary-400))' }} />
            <span>Settings</span>
          </div>
          <button type="button" onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Appearance</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Palette size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Accent Color</div>
                  <div className="text-xs text-gray-500">Controls the main accent color of the IDE.</div>
                </div>
              </div>
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
            </div>

            <div className="h-px bg-white/5" />

            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Editor</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Palette size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Theme</div>
                  <div className="text-xs text-gray-500">Controls the editor color scheme.</div>
                </div>
              </div>
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Type size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Font Family</div>
                  <div className="text-xs text-gray-500">Controls the editor font family.</div>
                </div>
              </div>
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Type size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Font Size</div>
                  <div className="text-xs text-gray-500">Controls the editor font size in pixels.</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/20 rounded p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setEditorFontSizePx(Math.max(10, editorFontSizePx - 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-mono">{editorFontSizePx}</span>
                <button
                  type="button"
                  onClick={() => setEditorFontSizePx(Math.min(24, editorFontSizePx + 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <button type="button" className="w-full flex items-center justify-between" onClick={toggleEditorMinimap}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Monitor size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-200">Minimap</div>
                  <div className="text-xs text-gray-500">Controls whether the minimap is shown.</div>
                </div>
              </div>
              <div
                style={{ backgroundColor: editorMinimap ? 'rgb(var(--color-primary-600))' : undefined }}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editorMinimap ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </div>
            </button>

            <button type="button" className="w-full flex items-center justify-between" onClick={toggleEditorWordWrap}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Check size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-200">Word Wrap</div>
                  <div className="text-xs text-gray-500">Wrap lines that exceed viewport width.</div>
                </div>
              </div>
              <div
                style={{ backgroundColor: editorWordWrap ? 'rgb(var(--color-primary-600))' : undefined }}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editorWordWrap ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </div>
            </button>
          </div>

          <div className="h-px bg-white/5" />

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">AI & Privacy</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Shield size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">AI Mode</div>
                  <div className="text-xs text-gray-500">Local enforces zero-egress (blocks outbound network calls).</div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-black/20 rounded p-1 border border-white/5">
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-xs`}
                  style={aiMode === 'cloud' ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))', borderColor: 'rgb(var(--color-primary-500) / 0.3)' } : {}}
                  onClick={() => setAiMode('cloud')}
                >
                  <span className="inline-flex items-center gap-1">
                    <Cloud size={12} />
                    Cloud
                  </span>
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-xs`}
                  style={aiMode === 'local' ? { backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-200))', borderColor: 'rgb(var(--color-primary-500) / 0.3)' } : {}}
                  onClick={() => setAiMode('local')}
                >
                  Local
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          <div className="text-center pt-2">
            <div className="text-xs text-gray-600">Aether Code v0.1.0 (Alpha)</div>
            <div className="text-[10px] text-gray-700 mt-1">Inspired by Cursor & Sublime Text</div>
          </div>
        </div>
      </div>
    </div>
  )
}
