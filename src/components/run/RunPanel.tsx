/**
 * Bottom multi-tab panel replacing the standalone TerminalPanel.
 * Tabs: Terminal (xterm PTY) + one per RunInstance.
 */
import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { X, Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { useRunStore } from '../../run/runStore'
import { RunOutputPane } from './RunOutputPane'
import type { BottomPanelTab } from '../../run/types'

// ---------------------------------------------------------------------------
// Helpers (mirrored from legacy TerminalPanel)
// ---------------------------------------------------------------------------

import type { FileNode } from '../../domain/fileNode'

const PROMPT = 'user@aether ~ % '

function flattenFiles(nodes: FileNode[], prefix = ''): string[] {
  const out: string[] = []
  for (const node of nodes) {
    if (node.type === 'file') out.push(prefix ? `${prefix}/${node.name}` : node.name)
    else if (node.type === 'folder' && node.children) {
      const p = prefix ? `${prefix}/${node.name}` : node.name
      out.push(p + '/')
      out.push(...flattenFiles(node.children, p))
    }
  }
  return out
}

function attachSimulatedShell(terminal: Terminal): () => void {
  let currentLine = ''
  terminal.writeln('Aether Terminal (simulated shell)')
  terminal.writeln('Type `help` for available commands.')
  terminal.write(PROMPT)

  const runCommand = (line: string) => {
    const cmd = line.trim()
    if (!cmd) { terminal.write('\r\n' + PROMPT); return }
    const [name, ...args] = cmd.split(/\s+/)
    const rest = args.join(' ')
    switch (name) {
      case 'clear': terminal.clear(); terminal.write(PROMPT); return
      case 'echo': terminal.writeln(rest); break
      case 'ls': flattenFiles(useEditorStore.getState().files).forEach((f) => terminal.writeln(f)); break
      case 'pwd': terminal.writeln(useEditorStore.getState().files[0]?.name ?? '~'); break
      case 'help': terminal.writeln('clear, echo, ls, pwd, help'); break
      default: terminal.writeln(`Command not found: ${name}`)
    }
    terminal.write(PROMPT)
  }

  const disposable = terminal.onData((data) => {
    if (data === '\r' || data === '\n') { runCommand(currentLine); currentLine = ''; return }
    if (data === '\u007F' || data === '\b') {
      if (currentLine.length > 0) { currentLine = currentLine.slice(0, -1); terminal.write('\b \b') }
      return
    }
    currentLine += data
    terminal.write(data)
  })

  let unsubStream: (() => void) | undefined
  if (typeof window !== 'undefined' && window.aetherDesktop?.onTerminalStream) {
    unsubStream = window.aetherDesktop.onTerminalStream((d: { text?: string }) => {
      if (d?.text) terminal.write(d.text)
    })
  }

  return () => { disposable.dispose(); unsubStream?.() }
}

function attachPtyShell(terminal: Terminal): () => void {
  const pty = window.aetherDesktop?.pty
  if (!pty) return attachSimulatedShell(terminal)

  let disposed = false
  let ptyId: string | null = null
  let unsubData: (() => void) | undefined
  let unsubExit: (() => void) | undefined
  let inputDisposable: { dispose(): void } | undefined
  let resizeDisposable: { dispose(): void } | undefined

  const remoteConn = useEditorStore.getState().remoteConnection
  const rootPath = useEditorStore.getState().workspaceRootPath
  const isWsl = remoteConn?.type === 'wsl' && remoteConn.status === 'connected'

  const shellOpts = isWsl
    ? { shell: 'wsl.exe', args: ['-d', remoteConn!.distro, ...(remoteConn!.linuxRootPath ? ['--cd', remoteConn!.linuxRootPath] : [])], env: { TERM: 'xterm-256color' } }
    : { cwd: rootPath || undefined, env: { TERM: 'xterm-256color' } }

  pty.create(shellOpts).then((id: string) => {
    if (disposed) { pty.kill(id); return }
    ptyId = id
    unsubData = pty.onData(id, (data: string) => terminal.write(data))
    unsubExit = pty.onExit(id, (code: number) => {
      terminal.writeln(`\r\n[Process exited with code ${code}]`)
    })
    inputDisposable = terminal.onData((data) => pty.write(id, data))
    resizeDisposable = terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => pty.resize(id, cols, rows))
    if (terminal.cols && terminal.rows) pty.resize(id, terminal.cols, terminal.rows)
  }).catch((err: unknown) => {
    terminal.writeln(`\r\n[PTY unavailable: ${String(err)}]\r\n`)
    const cleanup = attachSimulatedShell(terminal)
    if (!disposed) unsubData = cleanup
  })

  return () => {
    disposed = true
    inputDisposable?.dispose()
    resizeDisposable?.dispose()
    unsubData?.()
    unsubExit?.()
    if (ptyId) { try { pty.kill(ptyId) } catch { /* already exited */ } }
  }
}

// ---------------------------------------------------------------------------
// Terminal tab content
// ---------------------------------------------------------------------------

function TerminalContent({ sessionId }: { sessionId: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { remoteDistro, workspaceRootPath } = useEditorStore(
    useShallow((s) => ({
      remoteDistro: s.remoteConnection?.distro ?? null,
      workspaceRootPath: s.workspaceRootPath,
    }))
  )
  const hasPty = typeof window !== 'undefined' && !!window.aetherDesktop?.pty

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const terminal = new Terminal({
      theme: { background: '#0a0a0a', foreground: '#e5e5e5', cursor: '#e5e5e5', cursorAccent: '#0a0a0a' },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(el)

    const detach = hasPty ? attachPtyShell(terminal) : attachSimulatedShell(terminal)

    const observer = new ResizeObserver(() => {
      try { if (el.offsetWidth > 0 && el.offsetHeight > 0) fitAddon.fit() } catch { /* ignore */ }
    })
    observer.observe(el)
    requestAnimationFrame(() => fitAddon.fit())

    return () => { detach(); observer.disconnect(); terminal.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, hasPty, remoteDistro, workspaceRootPath])

  return <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden p-2" />
}

// ---------------------------------------------------------------------------
// Tab pill
// ---------------------------------------------------------------------------

function TabPill({
  tab,
  isActive,
  onActivate,
  onClose,
}: {
  tab: BottomPanelTab
  isActive: boolean
  onActivate: () => void
  onClose: () => void
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`group flex items-center gap-1.5 px-3 h-full text-[11px] border-r border-white/5 cursor-pointer select-none whitespace-nowrap ${
        isActive ? 'bg-[#1e1e1e] text-white border-t-2 border-t-primary-500' : 'text-gray-500 hover:bg-[#151515] hover:text-gray-300'
      }`}
    >
      <span className="truncate max-w-[120px]">{tab.label}</span>
      <span
        role="button"
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="opacity-0 group-hover:opacity-100 hover:text-white ml-0.5 rounded-sm hover:bg-white/20 p-0.5"
        aria-label={`Close ${tab.label}`}
      >
        <X size={9} />
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Resize handle
// ---------------------------------------------------------------------------

function useResizeHandle(onHeight: (h: number) => void) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startH = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      startY.current = e.clientY
      startH.current = useRunStore.getState().bottomPanelHeight
      e.preventDefault()

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const delta = startY.current - ev.clientY
        onHeight(startH.current + delta)
      }
      const onUp = () => {
        dragging.current = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [onHeight]
  )

  return onMouseDown
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function RunPanel({ embedded = false }: { embedded?: boolean }) {
  const { bottomPanelOpen, bottomTabs, activeBottomTabId, bottomPanelHeight, setActiveBottomTab, removeBottomTab, closeBottomPanel, setBottomPanelHeight, ensureTerminalTab } =
    useRunStore(
      useShallow((s) => ({
        bottomPanelOpen: s.bottomPanelOpen,
        bottomTabs: s.bottomTabs,
        activeBottomTabId: s.activeBottomTabId,
        bottomPanelHeight: s.bottomPanelHeight,
        setActiveBottomTab: s.setActiveBottomTab,
        removeBottomTab: s.removeBottomTab,
        closeBottomPanel: s.closeBottomPanel,
        setBottomPanelHeight: s.setBottomPanelHeight,
        ensureTerminalTab: s.ensureTerminalTab,
      }))
    )

  const { terminalSessionId, newTerminal: editorNewTerminal } = useEditorStore(
    useShallow((s) => ({ terminalSessionId: s.terminalSessionId, newTerminal: s.newTerminal }))
  )

  // Keep terminal tab in sync with editorStore terminalSessionId
  useEffect(() => {
    ensureTerminalTab(terminalSessionId)
  }, [terminalSessionId, ensureTerminalTab])

  const handleNewTerminal = useCallback(() => {
    editorNewTerminal()
  }, [editorNewTerminal])

  const onResizeMouseDown = useResizeHandle(setBottomPanelHeight)
  const activeTab = bottomTabs.find((t) => t.id === activeBottomTabId)

  if (!bottomPanelOpen) return null

  return (
    <div
      className={`flex flex-col bg-[#0a0a0a] shrink-0 min-h-0 ${embedded ? 'h-full border-t border-white/10' : 'border-t border-white/5'}`}
      style={embedded ? undefined : { height: bottomPanelHeight }}
    >
      {/* Resize handle */}
      {!embedded && (
        <div
          className="h-1 w-full cursor-ns-resize bg-transparent hover:bg-primary-500/20 shrink-0"
          onMouseDown={onResizeMouseDown}
        />
      )}

      {/* Tab bar */}
      <div className="h-8 flex items-stretch bg-[#111] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">
        {bottomTabs.map((tab) => (
          <TabPill
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeBottomTabId}
            onActivate={() => setActiveBottomTab(tab.id)}
            onClose={() => removeBottomTab(tab.id)}
          />
        ))}
        <div className="flex items-center px-1 ml-auto gap-1 border-l border-white/5">
          <button
            type="button"
            title="New Terminal"
            className="p-1 text-gray-500 hover:text-white transition-colors"
            onClick={handleNewTerminal}
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            title="Close panel"
            className="p-1 text-gray-500 hover:text-white transition-colors"
            onClick={closeBottomPanel}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!activeTab ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            No tab selected
          </div>
        ) : activeTab.kind === 'terminal' ? (
          <TerminalContent sessionId={activeTab.terminalSessionId ?? 0} />
        ) : activeTab.kind === 'run' && activeTab.instanceId ? (
          <RunOutputPane instanceId={activeTab.instanceId} />
        ) : null}
      </div>
    </div>
  )
}
