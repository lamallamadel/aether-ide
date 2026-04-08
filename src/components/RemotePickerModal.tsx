import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MonitorSmartphone,
  Server,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  ChevronRight,
  X,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import type { WslDistro } from '../types/aether-desktop'

type Step = 'type' | 'distro' | 'folder' | 'connecting'

export function RemotePickerModal() {
  const { remotePickerOpen, setRemotePickerOpen, connectToWsl, remoteConnection } = useEditorStore(
    useShallow((s) => ({
      remotePickerOpen: s.remotePickerOpen,
      setRemotePickerOpen: s.setRemotePickerOpen,
      connectToWsl: s.connectToWsl,
      remoteConnection: s.remoteConnection,
    }))
  )

  const [step, setStep] = useState<Step>('type')
  const [wslAvailable, setWslAvailable] = useState<boolean | null>(null)
  const [distros, setDistros] = useState<WslDistro[]>([])
  const [selectedDistro, setSelectedDistro] = useState<WslDistro | null>(null)
  const [folderPath, setFolderPath] = useState('/home')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingDistros, setLoadingDistros] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (remotePickerOpen) {
      setStep('type')
      setWslAvailable(null)
      setDistros([])
      setSelectedDistro(null)
      setFolderPath('/home')
      setSuggestions([])
      setError(null)
    }
  }, [remotePickerOpen])

  useEffect(() => {
    if (step === 'folder' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

  const connStatus = remoteConnection?.status

  useEffect(() => {
    if (step === 'connecting' && connStatus === 'connected') {
      const timer = setTimeout(() => setRemotePickerOpen(false), 800)
      return () => clearTimeout(timer)
    }
  }, [step, connStatus, setRemotePickerOpen])

  const scanDistros = async () => {
    setLoadingDistros(true)
    setError(null)
    try {
      const wsl = window.aetherDesktop?.wsl
      if (!wsl) { setError('WSL bridge not available (Electron required)'); return }
      const check = await wsl.checkAvailable()
      setWslAvailable(check.available)
      if (!check.available) { setError('WSL is not installed on this machine.'); return }
      const list = await wsl.listDistros()
      setDistros(list)
      if (list.length === 0) setError('No WSL distributions found.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect WSL')
    } finally {
      setLoadingDistros(false)
    }
  }

  const browseFolders = async (basePath: string) => {
    if (!selectedDistro) return
    setLoadingSuggestions(true)
    try {
      const wsl = window.aetherDesktop?.wsl
      if (!wsl) return
      const folders = await wsl.browseFolders(selectedDistro.name, basePath)
      setSuggestions(folders)
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSelectType = () => {
    setStep('distro')
    scanDistros()
  }

  const handleSelectDistro = (d: WslDistro) => {
    setSelectedDistro(d)
    setStep('folder')
    const home = `/home`
    setFolderPath(home)
    browseFolders(home)
  }

  const handleConnect = () => {
    if (!selectedDistro || !folderPath.trim()) return
    setStep('connecting')
    connectToWsl(selectedDistro.name, selectedDistro.version, folderPath.trim())
  }

  const progressSteps = useMemo(() => {
    if (step !== 'connecting') return []
    const s = remoteConnection?.status ?? 'connecting'
    return [
      { label: `Connecting to ${selectedDistro?.name}...`, done: s === 'connected' || s === 'error' },
      { label: 'Loading file tree...', done: s === 'connected' || s === 'error' },
      { label: 'Starting terminal...', done: s === 'connected' },
    ]
  }, [step, remoteConnection?.status, selectedDistro?.name])

  if (!remotePickerOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setRemotePickerOpen(false)}
    >
      <div
        className="w-[560px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-green-400" />
            <h2 className="text-white font-semibold text-base">Open Remote</h2>
          </div>
          <button
            type="button"
            className="p-1 text-gray-500 hover:text-white rounded"
            onClick={() => setRemotePickerOpen(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 min-h-[280px] flex flex-col">
          {/* Step 1: Choose type */}
          {step === 'type' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-400 mb-2">Select a remote target to connect to:</p>
              <button
                type="button"
                className="flex items-center gap-3 p-4 rounded-lg border border-white/10 hover:border-green-500/50 hover:bg-green-500/5 transition-colors text-left group"
                onClick={handleSelectType}
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MonitorSmartphone size={20} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">WSL (Windows Subsystem for Linux)</div>
                  <div className="text-xs text-gray-500 mt-0.5">Connect to a Linux distribution running on WSL</div>
                </div>
                <ChevronRight size={16} className="text-gray-600 group-hover:text-green-400 transition-colors" />
              </button>
              <button
                type="button"
                className="flex items-center gap-3 p-4 rounded-lg border border-white/10 opacity-40 cursor-not-allowed text-left"
                disabled
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Server size={20} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">SSH Remote</div>
                  <div className="text-xs text-gray-500 mt-0.5">Coming soon</div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Pick distro */}
          {step === 'distro' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {loadingDistros ? 'Scanning WSL distributions...' : 'Select a distribution:'}
                </p>
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-white"
                  onClick={() => setStep('type')}
                >
                  Back
                </button>
              </div>

              {loadingDistros && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="text-green-400 animate-spin" />
                </div>
              )}

              {error && !loadingDistros && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <AlertTriangle size={32} className="text-amber-400" />
                  <p className="text-sm text-gray-300">{error}</p>
                  {wslAvailable === false && (
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <p className="text-xs text-gray-500">
                        Install WSL to get started with Linux on Windows:
                      </p>
                      <code className="text-xs bg-white/5 px-3 py-1.5 rounded font-mono text-green-400">
                        wsl --install
                      </code>
                      <a
                        href="https://learn.microsoft.com/windows/wsl/install"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:underline mt-1"
                      >
                        Learn more <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!loadingDistros && !error && distros.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {distros.map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-green-500/40 hover:bg-green-500/5 transition-colors text-left group"
                      onClick={() => handleSelectDistro(d)}
                    >
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                        {d.state === 'Running'
                          ? <Wifi size={16} className="text-green-400" />
                          : <WifiOff size={16} className="text-gray-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">{d.name}</span>
                          {d.isDefault && (
                            <span className="text-[9px] uppercase font-bold tracking-wider bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          WSL {d.version} &middot; {d.state}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 group-hover:text-green-400 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Choose folder */}
          {step === 'folder' && selectedDistro && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Open folder in <span className="text-white font-medium">{selectedDistro.name}</span>:
                </p>
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-white"
                  onClick={() => setStep('distro')}
                >
                  Back
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[#111] rounded-lg border border-white/10 px-3 py-2 focus-within:border-green-500/50 transition-colors">
                  <FolderOpen size={14} className="text-gray-500 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none font-mono"
                    placeholder="/home/user/project"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConnect()
                      if (e.key === 'Tab' && suggestions.length > 0) {
                        e.preventDefault()
                        setFolderPath(suggestions[0])
                        browseFolders(suggestions[0])
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="px-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-colors"
                  onClick={() => browseFolders(folderPath)}
                >
                  Browse
                </button>
              </div>

              {loadingSuggestions && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 size={12} className="animate-spin" /> Loading...
                </div>
              )}

              {suggestions.length > 0 && !loadingSuggestions && (
                <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="flex items-center gap-2 px-3 py-1.5 text-left text-sm font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                      onClick={() => {
                        setFolderPath(s)
                        browseFolders(s)
                      }}
                    >
                      <FolderOpen size={12} className="text-gray-600 shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="mt-2 w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!folderPath.trim()}
                onClick={handleConnect}
              >
                Connect
              </button>
            </div>
          )}

          {/* Step 4: Connecting */}
          {step === 'connecting' && (
            <div className="flex flex-col gap-4 py-4">
              {progressSteps.map((ps, i) => (
                <div key={i} className="flex items-center gap-3">
                  {ps.done
                    ? <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                    : connStatus === 'error'
                      ? <AlertTriangle size={18} className="text-red-400 shrink-0" />
                      : <Loader2 size={18} className="text-green-400 animate-spin shrink-0" />
                  }
                  <span className={`text-sm ${ps.done ? 'text-green-300' : connStatus === 'error' ? 'text-red-300' : 'text-gray-400'}`}>
                    {ps.label}
                  </span>
                </div>
              ))}

              {connStatus === 'connected' && (
                <div className="mt-2 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span className="text-sm text-green-300 font-medium">
                    Connected to WSL: {selectedDistro?.name}
                  </span>
                </div>
              )}

              {connStatus === 'error' && remoteConnection?.errorMessage && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-sm text-red-300">{remoteConnection.errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
                    onClick={() => setStep('folder')}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#151515] border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-widest font-bold">
          <span>
            {step === 'type' && 'Select target'}
            {step === 'distro' && `${distros.length} distribution${distros.length !== 1 ? 's' : ''}`}
            {step === 'folder' && selectedDistro?.name}
            {step === 'connecting' && 'Connecting...'}
          </span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  )
}
