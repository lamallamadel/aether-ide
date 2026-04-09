import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Command, FileCode, Puzzle, Play, Settings, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import { SPECIAL_TAB_SETTINGS, SPECIAL_TAB_EXT_DETAIL_PREFIX, SPECIAL_TAB_RUN_CONFIG_PREFIX, isSpecialTab } from '../state/editorStore'
import type { EditorSplitMode } from '../state/editorStore'
import { CodeEditor } from './CodeEditor'
import { EditorBreadcrumb } from './EditorBreadcrumb'
import type { EditorMetrics } from './EditorPositionBar'
import { EditorPositionBar } from './EditorPositionBar'
import { RunPanel } from './run/RunPanel'
import { RunToolbar } from './run/RunToolbar'
import { WorktreeInlineBar } from './WorktreeInlineBar'
import { AiQuickFixBar } from './AiQuickFixBar'
import { SettingsView } from './SettingsView'
import { ExtensionDetailView } from './extensions/ExtensionDetailView'
import { RunConfigEditor } from './run/RunConfigEditor'
import { useFileSync } from '../hooks/useFileSync'
import { useRunStore } from '../run/runStore'

const INITIAL_METRICS: EditorMetrics = { line: 1, column: 1, selectionLength: 0 }

function getTabLabel(fileId: string): string {
  if (fileId === SPECIAL_TAB_SETTINGS) return 'Settings'
  if (fileId.startsWith(SPECIAL_TAB_EXT_DETAIL_PREFIX))
    return fileId.slice(SPECIAL_TAB_EXT_DETAIL_PREFIX.length)
  if (fileId.startsWith(SPECIAL_TAB_RUN_CONFIG_PREFIX)) {
    const configId = fileId.slice(SPECIAL_TAB_RUN_CONFIG_PREFIX.length)
    const config = useRunStore.getState().configurations.find((c) => c.id === configId)
    return config?.name ?? 'Run Config'
  }
  return fileId
}

function TabIcon({ fileId, isActive }: { fileId: string; isActive: boolean }) {
  if (fileId === SPECIAL_TAB_SETTINGS)
    return <Settings size={12} className={isActive ? 'text-gray-300' : 'grayscale opacity-50'} />
  if (fileId.startsWith(SPECIAL_TAB_EXT_DETAIL_PREFIX))
    return <Puzzle size={12} className={isActive ? 'text-purple-400' : 'grayscale opacity-50'} />
  if (fileId.startsWith(SPECIAL_TAB_RUN_CONFIG_PREFIX))
    return <Play size={12} className={isActive ? 'text-green-400' : 'grayscale opacity-50'} />
  return <FileCode size={12} className={isActive ? 'text-cyan-400' : 'grayscale opacity-50'} />
}

const TabSystem = memo(() => {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useEditorStore(
    useShallow((s) => ({ openFiles: s.openFiles, activeFileId: s.activeFileId, setActiveFile: s.setActiveFile, closeFile: s.closeFile }))
  )

  return (
    <div className="flex h-full overflow-x-auto no-scrollbar">
      {openFiles.map((fileId) => (
        <div
          key={fileId}
          onClick={() => setActiveFile(fileId)}
          className={`
            group flex items-center px-3 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-white/5 select-none
            ${activeFileId === fileId ? 'bg-[#1e1e1e] text-white border-t-2' : 'text-gray-500 hover:bg-[#151515]'}
          `}
          style={{
            borderTopColor: activeFileId === fileId ? 'rgb(var(--color-primary-500))' : undefined,
          }}
        >
          <span className="mr-2">
            <TabIcon fileId={fileId} isActive={activeFileId === fileId} />
          </span>
          <span className="truncate flex-1">{getTabLabel(fileId)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeFile(fileId)
            }}
            className={`ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-white/20 ${
              activeFileId === fileId ? 'opacity-100' : ''
            }`}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  )
})

function useSplitResize(editorSplit: EditorSplitMode, setRatio: (r: number) => void) {
  const splitRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef(editorSplit)
  modeRef.current = editorSplit

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const el = splitRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const startRatio = useEditorStore.getState().editorSplitRatio

      const onMove = (ev: MouseEvent) => {
        const mode = modeRef.current
        if (mode === 'columns') {
          const delta = ev.clientX - startX
          setRatio(startRatio + delta / rect.width)
        } else if (mode === 'rows') {
          const delta = ev.clientY - startY
          setRatio(startRatio + delta / rect.height)
        }
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [setRatio]
  )

  return { splitRef, onMouseDown }
}

export function EditorArea() {
  const {
    activeFileId,
    getFileContent,
    editorFontSizePx,
    editorWordWrap,
    editorMinimap,
    editorTheme,
    editorFontFamily,
    editorSplit,
    activeEditorPane,
    editorSplitRatio,
    setEditorSplitRatio,
    terminalDock,
  } = useEditorStore(
    useShallow((s) => ({
      activeFileId: s.activeFileId,
      getFileContent: s.getFileContent,
      editorFontSizePx: s.editorFontSizePx,
      editorWordWrap: s.editorWordWrap,
      editorMinimap: s.editorMinimap,
      editorTheme: s.editorTheme,
      editorFontFamily: s.editorFontFamily,
      editorSplit: s.editorSplit,
      activeEditorPane: s.activeEditorPane,
      editorSplitRatio: s.editorSplitRatio,
      setEditorSplitRatio: s.setEditorSplitRatio,
      terminalDock: s.terminalDock,
    }))
  )

  const { bottomPanelOpen } = useRunStore(useShallow((s) => ({ bottomPanelOpen: s.bottomPanelOpen })))
  const { syncFile } = useFileSync()
  const content = activeFileId ? getFileContent(activeFileId) : '// Select a file to view content'

  const [metricsPrimary, setMetricsPrimary] = useState<EditorMetrics>(INITIAL_METRICS)
  const [metricsSecondary, setMetricsSecondary] = useState<EditorMetrics>(INITIAL_METRICS)

  useEffect(() => {
    setMetricsPrimary(INITIAL_METRICS)
    setMetricsSecondary(INITIAL_METRICS)
  }, [activeFileId])

  const handleMetricsPrimary = useCallback((m: EditorMetrics) => {
    setMetricsPrimary(m)
  }, [])
  const handleMetricsSecondary = useCallback((m: EditorMetrics) => {
    setMetricsSecondary(m)
  }, [])

  const displayedMetrics =
    editorSplit !== 'none' && activeEditorPane === 'secondary' ? metricsSecondary : metricsPrimary

  const handleEditorChange = useCallback(
    (next: string) => {
      if (!activeFileId) return
      syncFile(activeFileId, next)
    },
    [activeFileId, syncFile]
  )

  const { splitRef, onMouseDown } = useSplitResize(editorSplit, setEditorSplitRatio)

  const editorBlock = (pane: 'primary' | 'secondary', minimap: boolean) =>
    activeFileId ? (
      <CodeEditor
        fileId={activeFileId}
        value={content}
        onChange={handleEditorChange}
        onEditorMetrics={pane === 'primary' ? handleMetricsPrimary : handleMetricsSecondary}
        paneId={pane}
        fontSizePx={editorFontSizePx}
        fontFamily={editorFontFamily}
        theme={editorTheme}
        wordWrap={editorWordWrap}
        minimap={minimap}
      />
    ) : null

  const splitContent =
    editorSplit === 'none' ? (
      <div className="flex-1 min-h-0 min-w-0">{editorBlock('primary', editorMinimap)}</div>
    ) : editorSplit === 'columns' ? (
      <div ref={splitRef} className="flex flex-1 flex-row min-h-0 min-w-0">
        <div
          className="min-h-0 min-w-0 flex flex-col shrink-0"
          style={{ width: `${editorSplitRatio * 100}%` }}
        >
          {editorBlock('primary', editorMinimap)}
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          className="w-1 shrink-0 z-10 cursor-col-resize bg-white/10 hover:bg-primary-500/50"
          onMouseDown={onMouseDown}
        />
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">{editorBlock('secondary', false)}</div>
      </div>
    ) : (
      <div ref={splitRef} className="flex flex-1 flex-col min-h-0 min-w-0">
        <div
          className="min-h-0 min-w-0 flex flex-col shrink-0"
          style={{ height: `${editorSplitRatio * 100}%` }}
        >
          {editorBlock('primary', editorMinimap)}
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          className="h-1 shrink-0 z-10 cursor-row-resize bg-white/10 hover:bg-primary-500/50"
          onMouseDown={onMouseDown}
        />
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">{editorBlock('secondary', false)}</div>
      </div>
    )

  const isSpecialView = activeFileId ? isSpecialTab(activeFileId) : false
  const isSettingsTab = activeFileId === SPECIAL_TAB_SETTINGS
  const extDetailId = activeFileId?.startsWith(SPECIAL_TAB_EXT_DETAIL_PREFIX)
    ? activeFileId.slice(SPECIAL_TAB_EXT_DETAIL_PREFIX.length)
    : null
  const runConfigId = activeFileId?.startsWith(SPECIAL_TAB_RUN_CONFIG_PREFIX)
    ? activeFileId.slice(SPECIAL_TAB_RUN_CONFIG_PREFIX.length)
    : null

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] relative overflow-hidden min-h-0">
      {/* Tab bar + run toolbar */}
      <div className="flex items-stretch h-9 bg-[#0a0a0a] border-b border-white/5 overflow-hidden">
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <TabSystem />
        </div>
        <div className="shrink-0 border-l border-white/5 flex items-center">
          <RunToolbar />
        </div>
      </div>

      {activeFileId && !isSpecialView ? <EditorBreadcrumb filePath={activeFileId} /> : null}
      {activeFileId && !isSpecialView ? <WorktreeInlineBar /> : null}
      {activeFileId && !isSpecialView ? <AiQuickFixBar /> : null}
      <div className="flex-1 relative overflow-hidden min-h-0 flex flex-col">
        {isSettingsTab ? (
          <div className="absolute inset-0 flex flex-col min-h-0 overflow-hidden">
            <SettingsView />
          </div>
        ) : extDetailId ? (
          <div className="absolute inset-0 flex flex-col min-h-0 overflow-hidden">
            <ExtensionDetailView extId={extDetailId} />
          </div>
        ) : runConfigId ? (
          <div className="absolute inset-0 flex flex-col min-h-0 overflow-hidden">
            <RunConfigEditor configId={runConfigId} />
          </div>
        ) : activeFileId ? (
          <div className="absolute inset-0 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 flex flex-col">{splitContent}</div>
            <EditorPositionBar metrics={displayedMetrics} />
            {terminalDock === 'editor' && bottomPanelOpen ? (
              <RunPanel embedded />
            ) : null}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600">
            <Command size={48} className="mb-4 opacity-20" />
            <p>
              Press <kbd className="bg-white/10 px-1 rounded text-gray-400">Ctrl+K</kbd> to search files
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
