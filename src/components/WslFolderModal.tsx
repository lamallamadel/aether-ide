import { useCallback, useEffect, useRef, useState } from 'react'
import { FolderOpen, Loader2, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'

export function WslFolderModal() {
  const { open, setOpen, remoteConnection, openWslFolder } = useEditorStore(
    useShallow((s) => ({
      open: s.wslFolderPromptOpen,
      setOpen: s.setWslFolderPromptOpen,
      remoteConnection: s.remoteConnection,
      openWslFolder: s.openWslFolder,
    }))
  )

  const [path, setPath] = useState('/home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const browseSeqRef = useRef(0)

  const distro = remoteConnection?.distro

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const browseFoldersImpl = useCallback(async (basePath: string) => {
    if (!distro) return
    const seq = ++browseSeqRef.current
    setLoadingSuggestions(true)
    setSuggestions([])
    setError(null)
    try {
      const wsl = window.aetherDesktop?.wsl
      if (!wsl) { setError('WSL bridge not available'); return }
      const folders = await wsl.browseFolders(distro, basePath)
      if (!mountedRef.current || browseSeqRef.current !== seq) return
      setSuggestions(folders)
      if (folders.length === 0) setError(`No subfolders found in ${basePath}`)
    } catch (err) {
      if (!mountedRef.current || browseSeqRef.current !== seq) return
      setSuggestions([])
      setError(err instanceof Error ? err.message : 'Browse failed')
    } finally {
      if (mountedRef.current && browseSeqRef.current === seq) setLoadingSuggestions(false)
    }
  }, [distro])

  useEffect(() => {
    if (!open) return
    setLoading(false)
    setError(null)
    setSuggestions([])
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 100)
    if (distro) {
      const wsl = window.aetherDesktop?.wsl
      if (wsl?.getHomePath) {
        wsl.getHomePath(distro).then((home) => {
          if (!mountedRef.current) return
          setPath(home)
          browseFoldersImpl(home)
        }).catch(() => {
          if (!mountedRef.current) return
          setPath('/home')
          browseFoldersImpl('/home')
        })
      } else {
        setPath('/home')
        browseFoldersImpl('/home')
      }
    } else {
      setPath('/home')
    }
    return () => clearTimeout(focusTimer)
  }, [open, distro, browseFoldersImpl])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const handleOpen = async () => {
    const trimmed = path.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      await openWslFolder(trimmed)
      const conn = useEditorStore.getState().remoteConnection
      if (conn?.status === 'error') {
        setError(conn.errorMessage ?? 'Failed to open folder')
        setLoading(false)
        return
      }
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open folder')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wsl-folder-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[520px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-green-400" />
            <h2 id="wsl-folder-title" className="text-white font-semibold text-base">
              Open Folder in WSL{distro ? ` (${distro})` : ''}
            </h2>
          </div>
          <button
            type="button"
            className="p-1 text-gray-500 hover:text-white rounded"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-sm text-gray-400">Enter the Linux path to open:</p>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#111] rounded-lg border border-white/10 px-3 py-2 focus-within:border-green-500/50 transition-colors">
              <FolderOpen size={14} className="text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none font-mono"
                placeholder="/home/user/project"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOpen()
                  if (e.key === 'Tab' && suggestions.length > 0) {
                    e.preventDefault()
                    setPath(suggestions[0])
                    browseFoldersImpl(suggestions[0])
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="px-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-colors"
              onClick={() => browseFoldersImpl(path)}
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
            <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto custom-scrollbar" role="listbox">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={path === s}
                  className="flex items-center gap-2 px-3 py-1.5 text-left text-sm font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                  onClick={() => {
                    setPath(s)
                    browseFoldersImpl(s)
                  }}
                >
                  <FolderOpen size={12} className="text-gray-600 shrink-0" />
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400" role="alert">{error}</p>
          )}

          <button
            type="button"
            className="mt-1 w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={!path.trim() || loading}
            onClick={handleOpen}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
            {loading ? 'Opening...' : 'Open Folder'}
          </button>
        </div>

        <div className="px-5 py-3 bg-[#151515] border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-widest font-bold">
          <span>{distro ?? 'WSL'}</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  )
}
