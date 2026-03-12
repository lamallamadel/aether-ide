import { Menu, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../state/editorStore'

type MenuKey = 'File' | 'Edit' | 'Selection' | 'View' | 'Go' | 'Run' | 'Terminal' | 'Help'

type MenuItem =
  | { kind: 'action'; id: string; label: string; action: () => void; checked?: boolean }
  | { kind: 'separator'; id: string }

const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function MenuBar() {
  const {
    activeFileId,
    getFileContent,
    setCommandPaletteOpen,
    setGlobalSearchOpen,
    setSettingsOpen,
    setMissionControlOpen,
    commandPaletteOpen,
    globalSearchOpen,
    settingsOpen,
    missionControlOpen,
    toggleSidebar,
    toggleAiPanel,
    createUntitledFile,
    closeFile,
    editorFontSizePx,
    setEditorFontSizePx,
    editorWordWrap,
    toggleEditorWordWrap,
    editorMinimap,
    toggleEditorMinimap,
  } = useEditorStore()

  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuButtonRefs = useRef<Record<MenuKey, HTMLButtonElement | null>>({
    File: null,
    Edit: null,
    Selection: null,
    View: null,
    Go: null,
    Run: null,
    Terminal: null,
    Help: null,
  })

  const announce = (msg: string) => {
    setAnnouncement(msg)
    window.setTimeout(() => setAnnouncement(''), 2000)
  }

  const menus: Record<MenuKey, MenuItem[]> = useMemo(
    () => ({
      File: [
        { kind: 'action', id: 'file-new', label: 'New File', action: () => createUntitledFile() },
        { kind: 'action', id: 'file-open', label: 'Open File...', action: () => setCommandPaletteOpen(true) },
        { kind: 'action', id: 'file-folder', label: 'Open Folder...', action: () => announce('Browser Security: Folder access limited') },
        { kind: 'separator', id: 'file-sep-1' },
        {
          kind: 'action',
          id: 'file-save',
          label: 'Save',
          action: () => {
            if (!activeFileId) {
              announce('No active file to save')
              return
            }
            downloadTextFile(activeFileId, getFileContent(activeFileId))
            announce(`Saved ${activeFileId}`)
          },
        },
        {
          kind: 'action',
          id: 'file-saveas',
          label: 'Save As...',
          action: () => {
            if (!activeFileId) {
              announce('No active file to save')
              return
            }
            downloadTextFile(activeFileId, getFileContent(activeFileId))
            announce(`Downloaded ${activeFileId}`)
          },
        },
        { kind: 'separator', id: 'file-sep-2' },
        {
          kind: 'action',
          id: 'file-close',
          label: 'Close Editor',
          action: () => {
             if (activeFileId) closeFile(activeFileId)
          }
        },
        { kind: 'separator', id: 'file-sep-3' },
        { kind: 'action', id: 'file-exit', label: 'Exit', action: () => announce('Exit is not supported in the browser') },
      ],
      Edit: [
        { kind: 'action', id: 'edit-undo', label: 'Undo', action: () => announce('Undo unavailable (read-only mode)') },
        { kind: 'action', id: 'edit-redo', label: 'Redo', action: () => announce('Redo unavailable (read-only mode)') },
        { kind: 'separator', id: 'edit-sep-1' },
        { kind: 'action', id: 'edit-cut', label: 'Cut', action: () => announce('Cut unavailable') },
        { kind: 'action', id: 'edit-copy', label: 'Copy', action: () => announce('Use Ctrl+C to copy') },
        { kind: 'action', id: 'edit-paste', label: 'Paste', action: () => announce('Use Ctrl+V to paste') },
        { kind: 'separator', id: 'edit-sep-2' },
        { kind: 'action', id: 'edit-find', label: 'Find', action: () => setGlobalSearchOpen(true) },
      ],
      Selection: [
        { kind: 'action', id: 'sel-all', label: 'Select All', action: () => announce('Select All confirmed') },
      ],
      View: [
        { kind: 'action', id: 'view-palette', label: 'Command Palette', action: () => setCommandPaletteOpen(true) },
        { kind: 'action', id: 'view-search', label: 'Global Search', action: () => setGlobalSearchOpen(true) },
        { kind: 'separator', id: 'view-sep-1' },
        { kind: 'action', id: 'view-zoom-in', label: 'Zoom In', action: () => setEditorFontSizePx(editorFontSizePx + 1) },
        { kind: 'action', id: 'view-zoom-out', label: 'Zoom Out', action: () => setEditorFontSizePx(Math.max(8, editorFontSizePx - 1)) },
        { kind: 'action', id: 'view-zoom-reset', label: 'Reset Zoom', action: () => setEditorFontSizePx(14) },
        { kind: 'separator', id: 'view-sep-2' },
        { kind: 'action', id: 'view-word-wrap', label: 'Toggle Word Wrap', action: () => toggleEditorWordWrap(), checked: editorWordWrap },
        { kind: 'action', id: 'view-minimap', label: 'Toggle Minimap', action: () => toggleEditorMinimap(), checked: editorMinimap },
        { kind: 'separator', id: 'view-sep-3' },
        { kind: 'action', id: 'view-sidebar', label: 'Toggle Sidebar', action: () => toggleSidebar() },
        { kind: 'action', id: 'view-ai', label: 'Toggle AI Panel', action: () => toggleAiPanel() },
        { kind: 'action', id: 'view-settings', label: 'Open Settings', action: () => setSettingsOpen(true) },
      ],
      Go: [
        { kind: 'action', id: 'go-file', label: 'Go to File...', action: () => setCommandPaletteOpen(true) },
        { kind: 'action', id: 'go-symbol', label: 'Go to Symbol...', action: () => setGlobalSearchOpen(true) },
      ],
      Run: [
        { kind: 'action', id: 'run-placeholder', label: '(Debug/Run — coming soon)', action: () => announce('Debugging and Run not yet implemented') },
      ],
      Terminal: [
        { kind: 'action', id: 'term-new', label: 'New Terminal', action: () => setMissionControlOpen(true) },
      ],
      Help: [
        { kind: 'action', id: 'help-welcome', label: 'Welcome', action: () => announce('Welcome') },
        { kind: 'action', id: 'help-docs', label: 'Documentation', action: () => announce('See README.md') },
        { kind: 'action', id: 'help-about', label: 'About', action: () => setSettingsOpen(true) },
      ],
    }),
    [
      activeFileId,
      createUntitledFile,
      getFileContent,
      setCommandPaletteOpen,
      setGlobalSearchOpen,
      setMissionControlOpen,
      setSettingsOpen,
      toggleAiPanel,
      toggleSidebar,
      closeFile,
      editorFontSizePx,
      setEditorFontSizePx,
      editorWordWrap,
      toggleEditorWordWrap,
      editorMinimap,
      toggleEditorMinimap,
    ]
  )

  useEffect(() => {
    const onAnyPointerDown = (event: MouseEvent | PointerEvent) => {
      const el = rootRef.current
      if (!el) return
      if (!el.contains(event.target as Node)) setActiveMenu(null)
    }
    document.addEventListener('pointerdown', onAnyPointerDown)
    document.addEventListener('mousedown', onAnyPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onAnyPointerDown)
      document.removeEventListener('mousedown', onAnyPointerDown)
    }
  }, [])

  useEffect(() => {
    if (!activeMenu) return
    const t = window.setTimeout(() => itemRefs.current[0]?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [activeMenu])

  useEffect(() => {
    if (!activeMenu) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenuAndFocus(activeMenu)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeMenu])

  const closeAll = () => {
    setActiveMenu(null)
    setMobileOpen(false)
  }

  const closeMenuAndFocus = (key: MenuKey) => {
    setActiveMenu(null)
    window.setTimeout(() => menuButtonRefs.current[key]?.focus(), 0)
  }

  useEffect(() => {
    if (!activeMenu && !mobileOpen) return
    if (!commandPaletteOpen && !globalSearchOpen && !settingsOpen && !missionControlOpen) return
    closeAll()
  }, [activeMenu, commandPaletteOpen, globalSearchOpen, missionControlOpen, mobileOpen, settingsOpen])

  const onMenuButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, key: MenuKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setActiveMenu((prev) => (prev === key ? null : key))
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveMenu(key)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeMenuAndFocus(key)
    }
  }

  const onMenuItemKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number, count: number) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (activeMenu) closeMenuAndFocus(activeMenu)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      itemRefs.current[(idx + 1) % count]?.focus()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      itemRefs.current[(idx - 1 + count) % count]?.focus()
    }
  }

  const renderDropdown = (key: MenuKey) => {
    const items = menus[key]
    const actionable = items.filter((i) => i.kind === 'action') as Array<Extract<MenuItem, { kind: 'action' }>>
    itemRefs.current = []
    return (
      <div
        role="menu"
        aria-label={`${key} menu`}
        className="absolute top-full left-0 z-50 flex flex-col menu-dropdown menu-dropdown-in"
      >
        {items.map((it) => {
          if (it.kind === 'separator') {
            return <div key={it.id} className="my-1 h-px bg-white/10" />
          }

          const idx = actionable.findIndex((a) => a.id === it.id)
          return (
            <button
              key={it.id}
              type="button"
              tabIndex={0}
              role="menuitem"
              aria-checked={it.checked}
              ref={(el) => {
                itemRefs.current[idx] = el
              }}
              className="px-4 py-2 text-[12px] flex items-center justify-between text-left menu-item cursor-pointer group"
              onKeyDown={(e) => onMenuItemKeyDown(e, idx, actionable.length)}
              onClick={() => {
                it.action()
                closeAll()
              }}
            >
              <span>{it.label}</span>
              {it.checked !== undefined && (
                 <span className={`ml-3 ${it.checked ? 'text-primary-400 opacity-100' : 'opacity-0'}`}>✓</span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="menu-bar flex items-center px-2 select-none shrink-0 z-30 relative"
    >
      <div className="flex items-center gap-2 mr-2">
        <button
          type="button"
          className="sm:hidden p-1 rounded hover:bg-white/10 text-gray-300 menu-focus"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Menu size={16} strokeWidth={1.5} />
        </button>
        <div className="mr-2 ml-1 font-bold text-sm tracking-tight flex items-center gap-2 menu-brand">
          <Sparkles size={14} strokeWidth={1.5} />
          Aether
        </div>
      </div>

      <nav aria-label="Top menu" className="hidden sm:flex text-[13px] h-full">
        {(Object.keys(menus) as MenuKey[]).map((key) => (
          <div key={key} className="relative h-full">
            <button
              type="button"
              tabIndex={0}
              ref={(el) => {
                menuButtonRefs.current[key] = el
              }}
              className={`px-3 h-full flex items-center cursor-pointer menu-button menu-focus ${activeMenu === key ? 'menu-button-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={activeMenu === key}
              onKeyDown={(e) => onMenuButtonKeyDown(e, key)}
              onClick={() => setActiveMenu((prev) => (prev === key ? null : key))}
              onMouseEnter={() => {
                if (activeMenu) setActiveMenu(key)
              }}
            >
              {key}
            </button>
            {activeMenu === key ? renderDropdown(key) : null}
          </div>
        ))}
      </nav>

      <div className="ml-auto text-[11px] text-gray-500 px-2" aria-live="polite">
        {announcement}
      </div>

      {mobileOpen ? (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={closeAll}>
          <div
            className="absolute top-0 left-0 right-0 menu-bar p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Menu</div>
            <div className="space-y-2">
              {(Object.keys(menus) as MenuKey[]).map((key) => (
                <details key={key} className="bg-white/5 rounded-[var(--menu-radius)] border border-white/10">
                  <summary className="cursor-pointer px-3 py-2 text-sm text-gray-200 menu-focus rounded-[var(--menu-radius)]">
                    {key}
                  </summary>
                  <div className="p-1">
                    {menus[key].map((it) => {
                      if (it.kind === 'separator') return <div key={it.id} className="my-1 h-px bg-white/10" />
                      return (
                        <button
                          key={it.id}
                          type="button"
                          tabIndex={0}
                          className="w-full text-left px-3 py-2 text-xs menu-item cursor-pointer flex justify-between items-center"
                          onClick={() => {
                            it.action()
                            closeAll()
                          }}
                        >
                          <span>{it.label}</span>
                          {it.checked !== undefined && it.checked && <span>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
