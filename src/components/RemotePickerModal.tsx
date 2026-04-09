import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MonitorSmartphone,
  Server,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import type { WslDistro } from '../types/aether-desktop'

type Step = 'type' | 'distro' | 'connecting'

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
  const [loadingDistros, setLoadingDistros] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bridgeDiagnostic, setBridgeDiagnostic] = useState<string | null>(null)

  useEffect(() => {
    if (remotePickerOpen) {
      setStep('type')
      setWslAvailable(null)
      setDistros([])
      setSelectedDistro(null)
      setError(null)
      setBridgeDiagnostic(null)
    }
  }, [remotePickerOpen])

  const connStatus = remoteConnection?.status

  useEffect(() => {
    if (step === 'connecting' && connStatus === 'connected') {
      const timer = setTimeout(() => setRemotePickerOpen(false), 800)
      return () => clearTimeout(timer)
    }
  }, [step, connStatus, setRemotePickerOpen])

  const closeModal = useCallback(() => setRemotePickerOpen(false), [setRemotePickerOpen])

  useEffect(() => {
    if (!remotePickerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [remotePickerOpen, closeModal])

  const scanDistros = async () => {
    setLoadingDistros(true)
    setError(null)
    setBridgeDiagnostic(null)
    try {
      const hasDesktop = typeof window !== 'undefined' && !!window.aetherDesktop
      const hasWslBridge = !!window.aetherDesktop?.wsl
      if (!hasDesktop || !hasWslBridge) {
        const keys = hasDesktop ? Object.keys(window.aetherDesktop ?? {}).join(', ') : '(none)'
        setBridgeDiagnostic(
          [
            `aetherDesktop: ${hasDesktop ? 'present' : 'missing'}`,
            `aetherDesktop.wsl: ${hasWslBridge ? 'present' : 'missing'}`,
            `available keys: ${keys}`,
          ].join(' | ')
        )
      }
      const wsl = window.aetherDesktop?.wsl
      if (!wsl) {
        setError('WSL bridge not available. This build is running without the Electron WSL preload surface.')
        return
      }
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

  const handleSelectType = () => {
    setStep('distro')
    scanDistros()
  }

  const [selectedDistro, setSelectedDistro] = useState<WslDistro | null>(null)

  const handleSelectDistro = (d: WslDistro) => {
    setSelectedDistro(d)
    setStep('connecting')
    connectToWsl(d.name, d.version)
  }

  const connectingLabel = useMemo(() => {
    if (!selectedDistro) return 'Connecting...'
    return `Connecting to ${selectedDistro.name}...`
  }, [selectedDistro])

  if (!remotePickerOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remote-picker-title"
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
            <h2 id="remote-picker-title" className="text-white font-semibold text-base">Open Remote</h2>
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
                  {bridgeDiagnostic && (
                    <div className="w-full rounded-md border border-amber-500/20 bg-black/30 p-2 text-left">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-amber-300">Runtime Diagnostic</p>
                      <code className="block break-all text-[11px] text-amber-100/90">{bridgeDiagnostic}</code>
                    </div>
                  )}
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

          {/* Step 3: Connecting */}
          {step === 'connecting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              {connStatus === 'connecting' && (
                <>
                  <Loader2 size={32} className="text-green-400 animate-spin" />
                  <p className="text-sm text-gray-300">{connectingLabel}</p>
                </>
              )}

              {connStatus === 'connected' && (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 size={32} className="text-green-400" />
                  <p className="text-sm text-green-300 font-medium">
                    Connected to WSL: {selectedDistro?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Use <strong className="text-gray-300">File &gt; Open Folder</strong> to open a project in WSL
                  </p>
                </div>
              )}

              {connStatus === 'error' && (
                <div className="flex flex-col items-center gap-3">
                  <AlertTriangle size={32} className="text-red-400" />
                  <p className="text-sm text-red-300">{remoteConnection?.errorMessage || 'Connection failed'}</p>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
                    onClick={() => setStep('distro')}
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
            {step === 'connecting' && (connStatus === 'connected' ? 'Connected' : 'Connecting...')}
          </span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  )
}
