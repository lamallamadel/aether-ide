import { Layout, Layers, Puzzle, Sparkles, Scan, Sliders, Terminal } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import { useShallow } from 'zustand/react/shallow'

export function ActivityBar() {
  const { setCommandPaletteOpen, toggleAiPanel, openSettings, toggleSidebar, toggleTerminalPanel, sidebarView, setSidebarView, sidebarVisible } = useEditorStore(
    useShallow((s) => ({
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      toggleAiPanel: s.toggleAiPanel,
      openSettings: s.openSettings,
      toggleSidebar: s.toggleSidebar,
      toggleTerminalPanel: s.toggleTerminalPanel,
      sidebarView: s.sidebarView,
      setSidebarView: s.setSidebarView,
      sidebarVisible: s.sidebarVisible,
    }))
  )

  const isExplorer = sidebarView === 'explorer' && sidebarVisible
  const isExtensions = sidebarView === 'extensions' && sidebarVisible

  return (
    <div className="w-12 bg-[#111111] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
      <button
        type="button"
        tabIndex={0}
        aria-label="Toggle Sidebar"
        onClick={toggleSidebar}
        style={{ backgroundColor: 'rgb(var(--color-primary-600) / 0.2)', color: 'rgb(var(--color-primary-400))' }}
        className="p-2 rounded-lg activity-item"
      >
        <Layout size={20} strokeWidth={1.5} />
      </button>
      <div className="w-6 h-[1px] bg-white/10 my-1"></div>
      <button
        type="button"
        tabIndex={0}
        aria-label="Explorer"
        onClick={() => {
          if (isExplorer) toggleSidebar()
          else setSidebarView('explorer')
        }}
        className={`p-2 transition-colors activity-item ${isExplorer ? 'text-white border-l-2 border-white' : 'text-gray-500 hover:text-white'}`}
      >
        <Layers size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        tabIndex={0}
        aria-label="Open Command Palette"
        onClick={() => setCommandPaletteOpen(true)}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Scan size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        tabIndex={0}
        aria-label="Toggle AI Panel"
        onClick={toggleAiPanel}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Sparkles size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        tabIndex={0}
        aria-label="Extensions"
        onClick={() => {
          if (isExtensions) toggleSidebar()
          else setSidebarView('extensions')
        }}
        className={`p-2 transition-colors activity-item ${isExtensions ? 'text-white border-l-2 border-white' : 'text-gray-500 hover:text-white'}`}
      >
        <Puzzle size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        tabIndex={0}
        aria-label="Toggle Terminal"
        onClick={toggleTerminalPanel}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Terminal size={20} strokeWidth={1.5} />
      </button>
      <div className="flex-1"></div>
      <button
        type="button"
        tabIndex={0}
        aria-label="Open Settings"
        onClick={() => openSettings()}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Sliders size={20} strokeWidth={1.5} />
      </button>
    </div>
  )
}
