import { Layout, Layers, Sparkles, Scan, Sliders, Terminal } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import { useShallow } from 'zustand/react/shallow'

export function ActivityBar() {
  const { setCommandPaletteOpen, toggleAiPanel, openSettings, toggleSidebar, toggleTerminalPanel } = useEditorStore(
    useShallow((s) => ({ setCommandPaletteOpen: s.setCommandPaletteOpen, toggleAiPanel: s.toggleAiPanel, openSettings: s.openSettings, toggleSidebar: s.toggleSidebar, toggleTerminalPanel: s.toggleTerminalPanel }))
  )

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
        onClick={toggleSidebar}
        className="p-2 text-white border-l-2 border-white activity-item"
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
        onClick={() => openSettings({ open: true })}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Sliders size={20} strokeWidth={1.5} />
      </button>
    </div>
  )
}
