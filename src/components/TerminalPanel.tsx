import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import type { FileNode } from '../domain/fileNode'

const PROMPT = 'user@aether ~ % '
const DOC_URL = 'https://github.com/xtermjs/xterm.js'
const HELP_TEXT = `Available commands: clear, echo, ls, pwd, help
For full shell support, see ${DOC_URL}`

function flattenFiles(nodes: FileNode[], prefix = ''): string[] {
  const out: string[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      out.push(prefix ? `${prefix}/${node.name}` : node.name)
    } else if (node.type === 'folder' && node.children) {
      const p = prefix ? `${prefix}/${node.name}` : node.name
      out.push(p + '/')
      out.push(...flattenFiles(node.children, p))
    }
  }
  return out
}

function getRootName(files: FileNode[]): string {
  const root = files.find((f) => f.id === 'root') ?? files[0]
  return root?.name ?? '~'
}

function attachSimulatedShell(terminal: Terminal): () => void {
  let currentLine = ''

  terminal.writeln('Aether Terminal (simulated shell)')
  terminal.writeln('Type `help` for available commands.')
  terminal.write(PROMPT)

  const runCommand = (line: string) => {
    const cmd = line.trim()
    if (!cmd) {
      terminal.write('\r\n' + PROMPT)
      return
    }
    const [name, ...args] = cmd.split(/\s+/)
    const rest = args.join(' ')
    switch (name) {
      case 'clear':
        terminal.clear()
        terminal.write(PROMPT)
        return
      case 'echo':
        terminal.writeln(rest)
        break
      case 'ls':
        flattenFiles(useEditorStore.getState().files).forEach((f) => terminal.writeln(f))
        break
      case 'pwd':
        terminal.writeln(getRootName(useEditorStore.getState().files))
        break
      case 'help':
        terminal.writeln(HELP_TEXT)
        break
      default:
        terminal.writeln(`Command not found: ${name}. For full shell, see ${DOC_URL}`)
    }
    terminal.write(PROMPT)
  }

  const disposable = terminal.onData((data) => {
    if (data === '\r' || data === '\n') {
      runCommand(currentLine)
      currentLine = ''
      return
    }
    if (data === '\u007F' || data === '\b') {
      if (currentLine.length > 0) {
        currentLine = currentLine.slice(0, -1)
        terminal.write('\b \b')
      }
      return
    }
    currentLine += data
    terminal.write(data)
  })

  let unsubStream: (() => void) | undefined
  if (typeof window !== 'undefined' && window.aetherDesktop?.onTerminalStream) {
    unsubStream = window.aetherDesktop.onTerminalStream((d) => {
      if (d?.text) terminal.write(d.text)
    })
  }

  return () => {
    disposable.dispose()
    unsubStream?.()
  }
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
    ? {
        shell: 'wsl.exe',
        args: ['-d', remoteConn.distro, ...(remoteConn.linuxRootPath ? ['--cd', remoteConn.linuxRootPath] : [])],
        env: { TERM: 'xterm-256color' },
      }
    : {
        cwd: rootPath || undefined,
        env: { TERM: 'xterm-256color' },
      }

  pty.create(shellOpts).then((id) => {
    if (disposed) { pty.kill(id); return }
    ptyId = id

    unsubData = pty.onData(id, (data) => terminal.write(data))
    unsubExit = pty.onExit(id, (code) => {
      terminal.writeln(`\r\n[Process exited with code ${code}]`)
    })

    inputDisposable = terminal.onData((data) => pty.write(id, data))
    resizeDisposable = terminal.onResize(({ cols, rows }) => pty.resize(id, cols, rows))

    if (terminal.cols && terminal.rows) {
      pty.resize(id, terminal.cols, terminal.rows)
    }
  }).catch((err) => {
    console.error('PTY creation failed, falling back to simulated shell', err)
    terminal.writeln(`\r\n[PTY unavailable: ${String(err)}]`)
    terminal.writeln('[Falling back to simulated shell]\r\n')
    const cleanup = attachSimulatedShell(terminal)
    if (!disposed) {
      unsubData = cleanup
    }
  })

  return () => {
    disposed = true
    inputDisposable?.dispose()
    resizeDisposable?.dispose()
    unsubData?.()
    unsubExit?.()
    if (ptyId) {
      try { pty.kill(ptyId) } catch { /* process may have already exited */ }
    }
  }
}

export function TerminalPanel({ embedded = false }: { embedded?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { terminalPanelOpen, setTerminalPanelOpen, terminalPanelHeight, remoteDistro, terminalSessionId, workspaceRootPath } = useEditorStore(
    useShallow((s) => ({
      terminalPanelOpen: s.terminalPanelOpen,
      setTerminalPanelOpen: s.setTerminalPanelOpen,
      terminalPanelHeight: s.terminalPanelHeight,
      remoteDistro: s.remoteConnection?.distro ?? null,
      terminalSessionId: s.terminalSessionId,
      workspaceRootPath: s.workspaceRootPath,
    }))
  )
  const hasPty = typeof window !== 'undefined' && !!window.aetherDesktop?.pty

  useEffect(() => {
    if (!terminalPanelOpen || !containerRef.current) return
    const el = containerRef.current
    const terminal = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
        cursor: '#e5e5e5',
        cursorAccent: '#0a0a0a',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(el)

    const detachShell = hasPty ? attachPtyShell(terminal) : attachSimulatedShell(terminal)

    const resizeObserver = new ResizeObserver(() => {
      try {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) fitAddon.fit()
      } catch {
        // ignore fit errors when container is hidden
      }
    })
    resizeObserver.observe(el)
    requestAnimationFrame(() => fitAddon.fit())

    return () => {
      detachShell()
      resizeObserver.disconnect()
      terminal.dispose()
    }
  }, [terminalPanelOpen, embedded, hasPty, remoteDistro, terminalSessionId, workspaceRootPath])

  if (!terminalPanelOpen) return null

  return (
    <div
      className={`flex flex-col bg-[#0a0a0a] shrink-0 min-h-0 ${embedded ? 'h-full border-t border-white/10' : 'border-t border-white/5'}`}
      style={embedded ? undefined : { height: terminalPanelHeight }}
    >
      <div className="h-8 flex items-center justify-between px-2 border-b border-white/5 bg-[#111111] shrink-0">
        <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
          Terminal {hasPty ? '' : '(simulated)'}
        </span>
        <button
          type="button"
          className="p-1 text-gray-500 hover:text-white"
          onClick={() => setTerminalPanelOpen(false)}
          aria-label="Close terminal"
        >
          <X size={14} />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden p-2" />
    </div>
  )
}
