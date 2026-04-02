import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'

type SymbolRow = {
  name: string
  kind: string
  startIndex: number
}

const lineFromOffset = (content: string, offset: number): number =>
  content.slice(0, Math.min(offset, content.length)).split('\n').length

export function GoToSymbol() {
  const { goToSymbolOpen, setGoToSymbolOpen, activeFileId, symbolsByFile, getFileContent, goToSymbolFilter } =
    useEditorStore(
      useShallow((s) => ({
        goToSymbolOpen: s.goToSymbolOpen,
        setGoToSymbolOpen: s.setGoToSymbolOpen,
        activeFileId: s.activeFileId,
        symbolsByFile: s.symbolsByFile,
        getFileContent: s.getFileContent,
        goToSymbolFilter: s.goToSymbolFilter,
      }))
    )
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentSymbols = useMemo<SymbolRow[]>(() => {
    if (!activeFileId) return []
    const fileSymbols = symbolsByFile[activeFileId] ?? []
    const classKinds = new Set(['class', 'interface', 'type', 'enum'])
    return fileSymbols
      .filter((s) => s.name && s.name.trim().length > 0)
      .filter((s) => (goToSymbolFilter === 'class' ? classKinds.has(s.kind) : true))
      .map((s) => ({ name: s.name, kind: s.kind, startIndex: s.startIndex }))
  }, [activeFileId, symbolsByFile, goToSymbolFilter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return currentSymbols
    return currentSymbols.filter((s) => s.name.toLowerCase().includes(q) || s.kind.toLowerCase().includes(q))
  }, [currentSymbols, query])

  useEffect(() => {
    if (!goToSymbolOpen) {
      setQuery('')
      setSelectedIndex(0)
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(t)
  }, [goToSymbolOpen])

  useEffect(() => {
    if (selectedIndex >= filtered.length) setSelectedIndex(0)
  }, [filtered.length, selectedIndex])

  const chooseSymbol = (sym: SymbolRow) => {
    if (!activeFileId) return
    const content = getFileContent(activeFileId)
    const line = lineFromOffset(content, sym.startIndex)
    window.dispatchEvent(
      new CustomEvent('aether-goto-symbol', {
        detail: { fileId: activeFileId, startIndex: sym.startIndex, line },
      })
    )
    setGoToSymbolOpen(false)
  }

  if (!goToSymbolOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={goToSymbolFilter === 'class' ? 'Go to Class' : 'Go to Symbol'}
        className="w-[640px] max-w-[95vw] bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden"
      >
        <div className="h-10 flex items-center justify-between px-3 border-b border-white/10 bg-[#111111]">
          <div className="text-xs uppercase tracking-wider text-gray-400">
            {goToSymbolFilter === 'class' ? 'Go to Class' : 'Go to Symbol'}
          </div>
          <button type="button" className="text-gray-500 hover:text-white" onClick={() => setGoToSymbolOpen(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 bg-[#111111] border border-white/10 rounded-md px-2">
            <Search size={14} className="text-gray-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setGoToSymbolOpen(false)
                  return
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (filtered.length > 0) setSelectedIndex((v) => (v + 1) % filtered.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  if (filtered.length > 0) setSelectedIndex((v) => (v - 1 + filtered.length) % filtered.length)
                  return
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const item = filtered[selectedIndex]
                  if (item) chooseSymbol(item)
                }
              }}
              placeholder={goToSymbolFilter === 'class' ? 'Filter classes…' : 'Type symbol name…'}
              className="w-full h-9 bg-transparent text-sm text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No symbols found in active file</div>
          ) : (
            filtered.map((sym, idx) => (
              <button
                key={`${sym.kind}:${sym.name}:${sym.startIndex}`}
                type="button"
                className={`w-full px-4 py-2 text-left border-b border-white/5 ${
                  idx === selectedIndex ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                }`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => chooseSymbol(sym)}
              >
                <div className="text-sm">{sym.name}</div>
                <div className="text-[11px] text-gray-500">{sym.kind}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
