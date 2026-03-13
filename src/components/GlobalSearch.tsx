import { AlertTriangle, Search, X, Sparkles, FileCode } from 'lucide-react'
import { ThemedSelect } from './ThemedSelect'
import { workerBridge } from '../services/workers/WorkerBridge'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FileNode } from '../domain/fileNode'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import { graphragQuery } from '../services/graphrag/graphrag'

type FlatFile = { fileId: string; name: string; parentId?: string; content: string }

type SearchMode = 'content' | 'filename' | 'knowledge'
type SearchScope = 'all' | 'open'

type ContentResult = {
  fileId: string
  startLine: number
  endLine: number
  score: number
}

const flattenFiles = (nodes: FileNode[]): FlatFile[] => {
  const out: FlatFile[] = []
  const visit = (n: FileNode) => {
    if (n.type === 'file') out.push({ fileId: n.id, name: n.name, parentId: n.parentId, content: n.content ?? '' })
    if (n.children) for (const c of n.children) visit(c)
  }
  for (const n of nodes) visit(n)
  return out
}

const extOf = (name: string) => {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase()
}



const HighlightMatch = ({ text, query, matchCase, matchWholeWord }: { text: string; query: string; matchCase?: boolean; matchWholeWord?: boolean }) => {
    if (!query) return <>{text}</>
    const flags = matchCase ? 'g' : 'gi'
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = matchWholeWord ? `\\b${escaped}\\b` : escaped
    const parts = text.split(new RegExp(`(${pattern})`, flags))
    return (
        <>
            {parts.map((part, i) => {
                // Double check if it really matches the query structure for whole word to be safe, 
                // though regex split should handle it. All captured parts match the pattern.
                // However, split might return non-matching parts that are just text.
                // We check if the part matches the pattern.
                const re = new RegExp(`^${pattern}$`, flags)
                return re.test(part) ? (
                    <span key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</span>
                ) : (
                    part
                )
            })}
        </>
    )
}

export function GlobalSearch() {
  const { globalSearchOpen, setGlobalSearchOpen, files, openFiles, openFile, perf, aiHealth } = useEditorStore(
    useShallow((s) => ({
      globalSearchOpen: s.globalSearchOpen,
      setGlobalSearchOpen: s.setGlobalSearchOpen,
      files: s.files,
      openFiles: s.openFiles,
      openFile: s.openFile,
      perf: s.perf,
      aiHealth: s.aiHealth,
    }))
  )
  const [mode, setMode] = useState<SearchMode>('content')
  const [scope, setScope] = useState<SearchScope>('all')
  const [query, setQuery] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [matchWholeWord, setMatchWholeWord] = useState(false)
  const [types, setTypes] = useState<Record<string, boolean>>({ ts: true, tsx: true, json: true, md: true })
  
  const [results, setResults] = useState<(FlatFile | ContentResult | any)[]>([])
  const [status, setStatus] = useState('ready')
  const inputRef = useRef<HTMLInputElement>(null)

  const allFiles = useMemo(() => flattenFiles(files), [files])
  const scopedFiles = useMemo(() => 
    scope === 'all' ? allFiles : allFiles.filter(f => openFiles.includes(f.fileId)),
  [allFiles, scope, openFiles])

  useEffect(() => {
    if (!globalSearchOpen) {
      setQuery('')
      setResults([])
      return
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [globalSearchOpen])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setStatus('searching')
      
      if (mode === 'filename') {
        const q = matchCase ? trimmed : trimmed.toLowerCase()
        const matches = scopedFiles.filter((f) => {
            if (scope === 'open' && !openFiles.includes(f.fileId)) return false
            if (!types[extOf(f.name)]) return false
            
            const name = matchCase ? f.name : f.name.toLowerCase()
            if (matchWholeWord) {
                // Use regex for whole word filename match (search "global" matches "GlobalSearch.tsx" -> false? usually filename search is fuzzy)
                // If user wants whole word in filename, maybe they mean the filename *contains* the whole word.
                // e.g. "Global-Search" contains "Global".
                const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const re = new RegExp(`\\b${escaped}\\b`, matchCase ? '' : 'i')
                return re.test(f.name)
            }
            return name.includes(q)
        })
        setResults(matches)
        setStatus('ready')
        return
      }

      if (mode === 'knowledge') {
        try {
            const results = await graphragQuery(trimmed)
            setResults(results.map(r => ({
                fileId: r.chunk.fileId,
                name: r.chunk.fileId,
                score: r.score,
                snippet: r.chunk.text,
                startLine: 1,
                endLine: 1
            })))
            setStatus('ready')
        } catch (e) {
            console.error('GraphRAG error:', e)
            setStatus('error')
        }
        return
      }

      // Content search
      workerBridge.postRequest('INDEX_SEARCH', { 
        query: trimmed, 
        topK: 50,
        options: { matchCase, matchWholeWord }
      }).then((res: any) => {
         const enriched = (res.results || []).map((r: any) => {
             const file = allFiles.find(f => f.fileId === r.fileId)
             return {
                 ...r,
                 name: file?.name || r.fileId,
                 parentId: file?.parentId,
             }
         })
         setResults(enriched)
         setStatus('ready')
      }).catch(() => setStatus('error'))

    }, 150)

    return () => clearTimeout(timer)
  }, [query, mode, scope, types, matchCase, matchWholeWord, scopedFiles])

  // Style helper for matching the file chips
  const getButtonStyle = (active: boolean) => (active ? {
      backgroundColor: 'rgb(var(--color-primary-600) / 0.2)',
      borderColor: 'rgb(var(--color-primary-500) / 0.3)',
      color: 'rgb(var(--color-primary-200))',
  } : {})

  const getButtonClass = (active: boolean) => `search-chip px-2 py-1 rounded border ${active ? '' : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-300'}`

  useEffect(() => {
    if (!globalSearchOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setGlobalSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [globalSearchOpen, setGlobalSearchOpen])

  if (!globalSearchOpen) return null

  const isContent = mode === 'content'
  const modeOptions = [
    { value: 'content' as const, label: 'Content' },
    { value: 'filename' as const, label: 'Filename' },
    { value: 'knowledge' as const, label: 'Knowledge' },
  ]
  const scopeOptions = [
    { value: 'all' as const, label: 'All files' },
    { value: 'open' as const, label: 'Open tabs' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global Search"
        className="w-[900px] max-w-[95vw] h-[70vh] bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
          <div className="text-xs font-bold tracking-wider text-gray-400 uppercase flex items-center gap-2">
            {mode === 'knowledge' ? <Sparkles size={14} className="text-emerald-400" /> : <Search size={14} className="text-gray-500" />}
            <span>{mode === 'knowledge' ? 'Aether Intelligence (RAG)' : 'Global Search'}</span>
            {mode === 'knowledge' && (
               <span className="ml-4 text-[10px] font-normal normal-case border-l border-white/10 pl-2 flex items-center gap-1">
                  {aiHealth === 'degraded' ? (
                    <><AlertTriangle size={10} className="text-amber-400" /><span className="text-amber-400">Keyword Mode</span></>
                  ) : aiHealth === 'offline' ? (
                    <span className="text-red-400">Offline</span>
                  ) : (
                    <span className="text-gray-600">Latency: {Math.max(12, perf.longTaskMaxMs).toFixed(0)}ms</span>
                  )}
               </span>
            )}
          </div>
          <button className="text-gray-500 hover:text-white" onClick={() => setGlobalSearchOpen(false)} type="button">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-white/5 bg-[#0c0c0c]">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'content' ? 'Search in file contents…' : mode === 'filename' ? 'Search file names…' : 'Search knowledge…'}
              className="flex-1 bg-[#1a1a1a] text-white text-sm rounded-md px-3 py-2 border border-white/5 focus:outline-none" style={{ borderColor: 'rgb(var(--color-primary-500) / 0.5)' }}
            />
            <ThemedSelect<SearchMode>
              ariaLabel="Search mode"
              value={mode}
              options={modeOptions}
              onChange={(v) => setMode(v)}
              className="min-w-[140px]"
            />
            <ThemedSelect<SearchScope>
              ariaLabel="Search scope"
              value={scope}
              options={scopeOptions}
              onChange={(v) => setScope(v)}
              className="min-w-[140px]"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
            {(['ts', 'tsx', 'json', 'md'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
                className={`search-chip px-2 py-1 rounded border ${
                  types[t] ? `search-chip px-2 py-1 rounded border` : 'bg-white/5 border-white/10'
                }`}
                style={
                  types[t]
                    ? {
                        backgroundColor: 'rgb(var(--color-primary-600) / 0.2)',
                        borderColor: 'rgb(var(--color-primary-500) / 0.3)',
                        color: 'rgb(var(--color-primary-200))',
                      }
                    : {}
                }
              >
                .{t}
              </button>
            ))}
            
            <div className="h-4 w-px bg-white/10 mx-2" />
            
            <button
                type="button"
                onClick={() => setMatchCase(!matchCase)}
                className={getButtonClass(matchCase)}
                style={getButtonStyle(matchCase)}
                title="Match Case"
            >
                Cc
            </button>
            <button
                type="button"
                onClick={() => setMatchWholeWord(!matchWholeWord)}
                className={getButtonClass(matchWholeWord)}
                style={getButtonStyle(matchWholeWord)}
                title="Match Whole Word"
            >
                W
            </button>

            <div className="ml-auto text-gray-500">
              {isContent ? (status === 'building' ? 'Indexing…' : status === 'ready' ? 'Indexed' : status) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {results.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500 text-sm">
              {query.trim() ? 'No results found' : 'Type a query to search'}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {results.map((r) => {
                if ('content' in r) {
                  const file = r as FlatFile
                  return (
                    <button
                      key={file.fileId}
                      type="button"
                      className="search-result-item w-full text-left px-6 py-4 hover:bg-white/5 transition-colors"
                      onClick={() => {
                        openFile(file.fileId)
                        setGlobalSearchOpen(false)
                      }}
                    >
                      <div className="text-sm text-white font-medium">{file.name}</div>
                      <div className="text-xs text-gray-600">{file.parentId}</div>
                    </button>
                  )
                }

                if ('startLine' in r) {
                  const res = r as ContentResult & { name: string; parentId?: string; snippet: string }
                  return (
                    <button
                      key={`${res.fileId}:${res.startLine}-${res.endLine}:${res.score}`}
                      type="button"
                      className="search-result-item w-full text-left px-6 py-4 hover:bg-white/5 transition-colors group"
                      onClick={() => {
                        openFile(res.fileId)
                        setGlobalSearchOpen(false)
                      }}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div className="min-w-0 flex items-center gap-2">
                           <FileCode size={14} className="text-cyan-400" />
                           <div className="text-sm text-white font-medium truncate">
                            {res.name}
                            <span className="ml-2 text-xs text-gray-500">
                               L{res.startLine}-L{res.endLine}
                            </span>
                           </div>
                           <div className="text-xs text-gray-600 truncate">{res.parentId}</div>
                        </div>
                        <div className="text-xs text-emerald-400 font-mono shrink-0">Score: {Math.round(res.score * 100)}%</div>
                      </div>
                      <div className="text-xs text-slate-300 font-mono pl-4 border-l-2 border-slate-700 group-hover:border-emerald-500 transition-colors overflow-hidden">
                          <pre className="whitespace-pre-wrap font-sans opacity-80">
                              <HighlightMatch text={res.snippet} query={query} matchCase={matchCase} matchWholeWord={matchWholeWord} />
                          </pre>
                      </div>
                    </button>
                  )
                }

                const res = r as { fileId: string; name: string; parentId?: string; snippet: string; score: number }
                return (
                  <button
                    key={`${res.fileId}:${res.score}:${res.snippet.length}`}
                    type="button"
                    className="search-result-item w-full text-left px-6 py-4 hover:bg-white/5 transition-colors group"
                    onClick={() => {
                      openFile(res.fileId)
                      setGlobalSearchOpen(false)
                    }}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="min-w-0 flex items-center gap-2">
                        <FileCode size={14} className="text-cyan-400" />
                        <div className="text-sm text-white font-medium truncate">{res.name}</div>
                        <div className="text-xs text-gray-600 truncate">{res.parentId}</div>
                      </div>
                      <div className="text-xs text-emerald-400 font-mono shrink-0">Score: {Math.round(res.score * 100)}%</div>
                    </div>
                    <div className="text-xs text-slate-300 font-mono pl-4 border-l-2 border-slate-700 group-hover:border-emerald-500 transition-colors overflow-hidden">
                        <pre className="whitespace-pre-wrap font-sans opacity-80">
                            <HighlightMatch text={res.snippet} query={query} matchCase={matchCase} matchWholeWord={matchWholeWord} />
                        </pre>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
