import { useEffect, useState } from 'react'
import { CheckCircle2, Terminal, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'

export function RemoteToast() {
  const { remoteConnection, setTerminalPanelOpen } = useEditorStore(
    useShallow((s) => ({
      remoteConnection: s.remoteConnection,
      setTerminalPanelOpen: s.setTerminalPanelOpen,
    }))
  )

  const [visible, setVisible] = useState(false)
  const [distroName, setDistroName] = useState('')

  useEffect(() => {
    if (remoteConnection?.status === 'connected') {
      setDistroName(remoteConnection.distro)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 6000)
      return () => clearTimeout(timer)
    }
    setVisible(false)
  }, [remoteConnection?.status, remoteConnection?.distro])

  if (!visible) return null

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-right fade-in duration-200" role="status" aria-live="polite">
      <div className="flex items-center gap-3 bg-[#1a1a1a] border border-green-500/30 rounded-xl px-4 py-3 shadow-2xl shadow-green-500/10">
        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm text-white font-medium">
            Connected to WSL: {distroName}
          </span>
          <span className="text-xs text-gray-500">
            Workspace loaded successfully
          </span>
        </div>
        <button
          type="button"
          className="ml-2 flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-md transition-colors"
          onClick={() => {
            setTerminalPanelOpen(true)
            setVisible(false)
          }}
        >
          <Terminal size={12} />
          Open Terminal
        </button>
        <button
          type="button"
          className="p-0.5 text-gray-600 hover:text-white"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
