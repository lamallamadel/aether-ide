import { useEffect } from 'react'
import { ActivityBar } from './components/ActivityBar'
import { AIChatPanel } from './components/AIChatPanel'
import { CommandPalette } from './components/CommandPalette'
import { EditorArea } from './components/EditorArea'
import { GlobalSearch } from './components/GlobalSearch'
import { MenuBar } from './components/MenuBar'
import { MissionControl } from './components/MissionControl'
import { SettingsModal } from './components/SettingsModal'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { useEditorStore } from './state/editorStore'
import { enableZeroEgress } from './services/security/networkGuard'
import { startPerfMonitor } from './services/perf/perfMonitor'
import { workerBridge } from './services/workers/WorkerBridge'
import { vectorStore } from './services/db/VectorStore'
import { THEME_COLORS } from './lib/theme'

export default function App() {
  const { setCommandPaletteOpen, toggleSidebar, toggleAiPanel, setSettingsOpen, aiMode, setPerf, setAiHealth, ideThemeColor, setMissionControlOpen, setIndexingError } =
    useEditorStore()

  useEffect(() => {
    const onAIClick = (e: any) => {
        // e.detail contains { type: 'warning' | 'suggestion', line: number }
        console.log('AI Gutter Clicked:', e.detail)
        setMissionControlOpen(true)
    }
    window.addEventListener('aether-ai-click', onAIClick)
    return () => window.removeEventListener('aether-ai-click', onAIClick)
  }, [setMissionControlOpen])

  useEffect(() => {
    // Initial Indexing of Files
    const files = useEditorStore.getState().files
    // Flatten files for indexing (simplified)
    const flatFiles: { fileId: string; content: string }[] = []
    const traverse = (nodes: any[]) => {
        for (const node of nodes) {
            if (node.type === 'file') {
                flatFiles.push({ fileId: node.id, content: node.content })
            }
            if (node.children) traverse(node.children)
        }
    }
    traverse(files)
    
    console.log('App: Starting Initial Indexing...', { fileCount: flatFiles.length, files: flatFiles.map(f => f.fileId) })
    
    setIndexingError(null)
    workerBridge.postRequest('INDEX_BUILD', { files: flatFiles })
        .then((res: any) => {
          console.log('App: Initial Indexing Complete:', res)
          setIndexingError(null)
        })
        .catch((err: any) => {
          console.error('App: Indexing Failed:', err)
          setIndexingError(err?.message ?? 'Indexing failed')
        })
  }, [setIndexingError])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      if (isEditable) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        toggleAiPanel()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCommandPaletteOpen, setSettingsOpen, toggleAiPanel, toggleSidebar])

  useEffect(() => {
    if (aiMode !== 'local') return
    const cleanup = enableZeroEgress()
    return () => cleanup()
  }, [aiMode])

  useEffect(() => {
    const stop = startPerfMonitor((m) => setPerf(m))
    return () => stop()
  }, [setPerf])

  useEffect(() => {
    const unsubscribe = vectorStore.onHealthChange((status) => {
      switch (status) {
        case 'ready': setAiHealth('full'); break
        case 'degraded': setAiHealth('degraded'); break
        case 'error': setAiHealth('offline'); break
        case 'loading': setAiHealth('loading'); break
      }
    })
    return unsubscribe
  }, [setAiHealth])

  useEffect(() => {
    const styleId = 'dynamic-theme-colors'
    let style = document.getElementById(styleId)
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    const colors = THEME_COLORS[ideThemeColor as keyof typeof THEME_COLORS]
    if (colors) {
      const css = `:root {
        ${Object.entries(colors)
          .map(([key, value]) => `--color-primary-${key}: ${value};`)
          .join('\n')}
      }`
      style.innerHTML = css
    }
  }, [ideThemeColor])

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <MenuBar />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />
        <EditorArea />
        <AIChatPanel />
      </div>
      <StatusBar />
      <CommandPalette />
      <GlobalSearch />
      <SettingsModal />
      <MissionControl />
    </div>
  )
}
