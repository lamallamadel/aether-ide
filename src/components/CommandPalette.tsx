import { Bot, CornerDownLeft, Eye, EyeOff, FileCode, Search, Settings, Terminal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FileNode } from '../domain/fileNode'
import { useShallow } from 'zustand/react/shallow'
import { SETTINGS_CATEGORIES } from '../config/settingsCategories'
import { useEditorStore } from '../state/editorStore'

function getAllFiles(nodes: FileNode[]): FileNode[] {
  let result: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') result.push(node)
    if (node.children) result = [...result, ...getAllFiles(node.children)]
  }
  return result
}

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    files,
    openFile,
    toggleSidebar,
    toggleAiPanel,
    sidebarVisible,
    aiPanelVisible,
    setGlobalSearchOpen,
    openSettings,
    setMissionControlOpen,
  } = useEditorStore(
    useShallow((s) => ({
      commandPaletteOpen: s.commandPaletteOpen,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      files: s.files,
      openFile: s.openFile,
      toggleSidebar: s.toggleSidebar,
      toggleAiPanel: s.toggleAiPanel,
      sidebarVisible: s.sidebarVisible,
      aiPanelVisible: s.aiPanelVisible,
      setGlobalSearchOpen: s.setGlobalSearchOpen,
      openSettings: s.openSettings,
      setMissionControlOpen: s.setMissionControlOpen,
    }))
  )
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const fileList = useMemo(() => getAllFiles(files), [files])
  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return fileList
    return fileList.filter((f) => f.name.toLowerCase().includes(q))
  }, [fileList, search])

  const systemCommands = useMemo(
    () => [
      {
        id: 'cmd-sidebar',
        name: sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar',
        type: 'command' as const,
        icon: sidebarVisible ? <EyeOff size={14} /> : <Eye size={14} />,
        action: () => toggleSidebar(),
      },
      {
        id: 'cmd-ai',
        name: aiPanelVisible ? 'Close AI Assistant' : 'Open AI Assistant',
        type: 'command' as const,
        icon: <Bot size={14} />,
        action: () => toggleAiPanel(),
      },
      {
        id: 'cmd-search',
        name: 'Global Search',
        type: 'command' as const,
        icon: <Search size={14} />,
        action: () => setGlobalSearchOpen(true),
      },
      {
        id: 'cmd-mission',
        name: 'Mission Control',
        type: 'command' as const,
        icon: <Terminal size={14} />,
        action: () => setMissionControlOpen(true),
      },
      {
        id: 'cmd-settings',
        name: 'Open Settings',
        type: 'command' as const,
        icon: <Settings size={14} />,
        action: () => openSettings({ open: true }),
      },
      ...SETTINGS_CATEGORIES.map((category) => ({
        id: `cmd-settings-${category.id}`,
        name: `Preferences: ${category.label}`,
        type: 'command' as const,
        icon: <Settings size={14} />,
        action: () => openSettings({ open: true, category: category.id }),
      })),
    ],
    [aiPanelVisible, openSettings, setGlobalSearchOpen, setMissionControlOpen, sidebarVisible, toggleAiPanel, toggleSidebar]
  )

  const filteredCommands = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return systemCommands
    return systemCommands.filter((c) => c.name.toLowerCase().includes(q))
  }, [search, systemCommands])

  const combinedResults = useMemo(() => [...filteredCommands, ...filteredFiles], [filteredCommands, filteredFiles])

  useEffect(() => {
    if (commandPaletteOpen) {
      setSelectedIndex(0)
      const t = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
    setSearch('')
  }, [commandPaletteOpen])

  useEffect(() => {
    if (selectedIndex >= combinedResults.length) setSelectedIndex(0)
  }, [combinedResults.length, selectedIndex])

  const handleSelect = (item: (typeof combinedResults)[number]) => {
    if ('type' in item && item.type === 'command') {
      item.action()
    } else {
      openFile(item.id)
    }
    setCommandPaletteOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (combinedResults.length === 0) return
      setSelectedIndex((prev) => (prev + 1) % combinedResults.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (combinedResults.length === 0) return
      setSelectedIndex((prev) => (prev - 1 + combinedResults.length) % combinedResults.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = combinedResults[selectedIndex]
      if (item) handleSelect(item)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setCommandPaletteOpen(false)
    }
  }

  if (!commandPaletteOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-[600px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <Search size={18} className="text-gray-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-white text-lg placeholder-gray-600 focus:outline-none"
            placeholder="Type a command or file name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-gray-500 font-mono">
            ESC
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto py-2 custom-scrollbar">
          {combinedResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No results found</div>
          ) : (
            combinedResults.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`
                  flex items-center px-4 py-2 cursor-pointer transition-colors
                  ${idx === selectedIndex ? 'text-white' : 'text-gray-400 hover:bg-white/5'}
                `}
                style={{ backgroundColor: idx === selectedIndex ? 'rgb(var(--color-primary-600) / 0.2)' : undefined }}
              >
                <div className="mr-3 opacity-60">
                  {'type' in item && item.type === 'command' ? item.icon : <FileCode size={14} />}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-sm font-medium truncate">{'type' in item && item.type === 'command' ? item.name : item.name}</span>
                  {'type' in item && item.type === 'command' ? null : (
                    <span className="text-[10px] text-gray-600 truncate">{item.parentId}</span>
                  )}
                </div>
                {idx === selectedIndex && <CornerDownLeft size={12} style={{ color: 'rgb(var(--color-primary-400))' }} opacity={0.5} />}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 bg-[#151515] border-t border-white/5 flex justify-between items-center text-[10px] text-gray-600 uppercase tracking-widest font-bold">
          <span>{combinedResults.length} Results</span>
          <div className="flex gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
        </div>
      </div>
    </div>
  )
}
