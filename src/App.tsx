import { useEffect } from 'react'
import { ActivityBar } from './components/ActivityBar'
import { AIChatPanel } from './components/AIChatPanel'
import { CommandPalette } from './components/CommandPalette'
import { EditorArea } from './components/EditorArea'
import { GlobalSearch } from './components/GlobalSearch'
import { GoToSymbol } from './components/GoToSymbol'
import { MenuBar } from './components/MenuBar'
import { MissionControl } from './components/MissionControl'
import { RemotePickerModal } from './components/RemotePickerModal'
import { RemoteToast } from './components/RemoteToast'
import { WslFolderModal } from './components/WslFolderModal'
import { RunPanel } from './components/run/RunPanel'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from './state/editorStore'
import { enableZeroEgress } from './services/security/networkGuard'
import { startPerfMonitor } from './services/perf/perfMonitor'
import { workerBridge } from './services/workers/WorkerBridge'
import { vectorStore } from './services/db/VectorStore'
import { THEME_COLORS } from './lib/theme'
import { registerBuiltinExtensions } from './extensions/builtin/registerBuiltinExtensions'
import { aetherLspClient } from './lsp/client/aetherLspClient'
import { ExternalHttpLspTransport } from './lsp/client/externalTransport'
import { yamlLspClient } from './lsp/client/yamlLspClient'
import { extensionHost } from './extensions/host'
import { loadRuntimeEnvironment } from './config/environment'
import { useRunStore } from './run/runStore'

export default function App() {
  const { files, activeFileId, terminalDock, workspaceRootPath, workspaceHandle, setCommandPaletteOpen, setGoToSymbolOpen, toggleSidebar, toggleAiPanel, openSettings, setSidebarView, aiMode, setPerf, setAiHealth, ideThemeColor, setIndexingError, lspMode, externalLspEndpoint, setRuntimeEnvironment, hasFileHandle, saveFileToDisk } =
    useEditorStore(useShallow((s) => ({
      files: s.files,
      activeFileId: s.activeFileId,
      terminalDock: s.terminalDock,
      workspaceRootPath: s.workspaceRootPath,
      workspaceHandle: s.workspaceHandle,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      setGoToSymbolOpen: s.setGoToSymbolOpen,
      toggleSidebar: s.toggleSidebar,
      toggleAiPanel: s.toggleAiPanel,
      openSettings: s.openSettings,
      setSidebarView: s.setSidebarView,
      aiMode: s.aiMode,
      setPerf: s.setPerf,
      setAiHealth: s.setAiHealth,
      ideThemeColor: s.ideThemeColor,
      setIndexingError: s.setIndexingError,
      lspMode: s.lspMode,
      externalLspEndpoint: s.externalLspEndpoint,
      setRuntimeEnvironment: s.setRuntimeEnvironment,
      hasFileHandle: s.hasFileHandle,
      saveFileToDisk: s.saveFileToDisk,
    })))

  const { toggleBottomPanel, bottomPanelOpen, loadConfigsFromWorkspace } = useRunStore(
    useShallow((s) => ({
      toggleBottomPanel: s.toggleBottomPanel,
      bottomPanelOpen: s.bottomPanelOpen,
      loadConfigsFromWorkspace: s.loadConfigsFromWorkspace,
    }))
  )

  useEffect(() => {
    const onAIClick = (e: Event) => {
      const ce = e as CustomEvent<{ kind?: string; line?: number; fileId?: string | null }>
      const d = ce.detail
      if (d?.line != null && d?.kind) {
        const st = useEditorStore.getState()
        st.setAiQuickFixContext({
          fileId: d.fileId ?? st.activeFileId ?? '',
          line: d.line,
          kind: d.kind as 'warning' | 'suggestion',
        })
      }
    }
    window.addEventListener('aether-ai-click', onAIClick)
    return () => window.removeEventListener('aether-ai-click', onAIClick)
  }, [])

  useEffect(() => {
    registerBuiltinExtensions().catch((error) => console.error('Failed to initialize builtin extensions', error))
  }, [])

  useEffect(() => {
    setRuntimeEnvironment(loadRuntimeEnvironment())
  }, [setRuntimeEnvironment])

  useEffect(() => {
    const external = externalLspEndpoint ? new ExternalHttpLspTransport(externalLspEndpoint) : undefined
    aetherLspClient.setMode(lspMode, external)
    yamlLspClient.setMode(lspMode, external)
    aetherLspClient.initialize().catch((e) => console.warn('Aether LSP init failed', e))
    yamlLspClient.initialize().catch((e) => console.warn('YAML LSP init failed', e))
  }, [lspMode, externalLspEndpoint])

  useEffect(() => {
    if (!activeFileId) return
    const lower = activeFileId.toLowerCase()
    if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
      extensionHost.activateByEvent('onLanguage:yaml').catch((e) => console.warn('YAML extension activation failed', e))
    }
  }, [activeFileId])

  useEffect(() => {
    // Indexing of Files (re-runs when files change, e.g. after Open Folder)
    const flatFiles: { fileId: string; content: string }[] = []
    const traverse = (nodes: typeof files) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          flatFiles.push({ fileId: node.id, content: node.content ?? '' })
        }
        if (node.children) traverse(node.children)
      }
    }
    traverse(files)

    console.log('App: Indexing...', { fileCount: flatFiles.length, files: flatFiles.map((f) => f.fileId) })

    workerBridge
      .postRequest('INDEX_BUILD', { files: flatFiles })
      .then((res: unknown) => {
        console.log('App: Indexing Complete:', res)
        setIndexingError(null)
      })
      .catch((err: unknown) => {
        console.error('App: Indexing Failed:', err)
        setIndexingError(err instanceof Error ? err.message : 'Indexing failed')
      })
  }, [files, setIndexingError])

  // Load run configurations when workspace changes
  useEffect(() => {
    void loadConfigsFromWorkspace(
      workspaceRootPath,
      workspaceHandle as FileSystemDirectoryHandle | null
    )
  }, [workspaceRootPath, workspaceHandle, loadConfigsFromWorkspace])

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
        openSettings({ open: true })
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setGoToSymbolOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        setSidebarView('extensions')
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setSidebarView('run')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault()
        toggleBottomPanel()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!activeFileId) return
        if (!hasFileHandle(activeFileId)) return
        void saveFileToDisk(activeFileId).then((ok) => {
          if (!ok || !activeFileId.endsWith('.aether')) return
          const ps = useEditorStore.getState().projectSettings
          if (!ps?.compileOnSave) return
          const content = useEditorStore.getState().getFileContent(activeFileId)
          import('./services/syntax/syntaxClient').then(({ parseFileContent }) => {
            parseFileContent('aether', content).then((res) => {
              useEditorStore.getState().setDiagnosticsForFile(activeFileId, res.diagnostics)
            })
          })
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFileId, hasFileHandle, openSettings, saveFileToDisk, setCommandPaletteOpen, setGoToSymbolOpen, setSidebarView, toggleAiPanel, toggleSidebar, toggleBottomPanel])

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
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 overflow-hidden min-h-0">
          <ActivityBar />
          <Sidebar />
          <EditorArea />
          <AIChatPanel />
        </div>
        {bottomPanelOpen && terminalDock === 'workspace' && <RunPanel />}
      </div>
      <StatusBar />
      <CommandPalette />
      <GlobalSearch />
      <GoToSymbol />
      <MissionControl />
      <RemotePickerModal />
      <WslFolderModal />
      <RemoteToast />
    </div>
  )
}
