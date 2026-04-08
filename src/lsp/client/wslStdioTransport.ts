import type { ExternalLspTransport } from './externalTransport'

type JsonRpcResponse<T> = { id?: string | number; result?: T; error?: { message?: string } }

/**
 * LSP transport that communicates with a language server running inside WSL
 * via stdin/stdout, relayed through the Electron main process IPC.
 *
 * Flow: renderer → IPC → main → wsl.exe stdin → LSP server
 *       renderer ← IPC ← main ← wsl.exe stdout ← LSP server
 */
export class WslStdioTransport implements ExternalLspTransport {
  private lspId: string | null = null
  private distro: string
  private command: string
  private args: string[]
  private cwd?: string
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private unsubMessage?: () => void
  private unsubExit?: () => void

  constructor(options: { distro: string; command: string; args?: string[]; cwd?: string }) {
    this.distro = options.distro
    this.command = options.command
    this.args = options.args ?? []
    this.cwd = options.cwd
  }

  async start(): Promise<void> {
    const bridge = window.aetherDesktop
    if (!bridge) throw new Error('Electron bridge not available')

    // We need raw IPC for the lsp-spawn channel.
    // The preload doesn't expose it yet; we'll use the pty-like pattern
    // with ipcRenderer if available. For now, use a simplified invoke approach.
    const ipc = (window as unknown as { __aetherIpc?: {
      invoke: (ch: string, ...a: unknown[]) => Promise<unknown>
      send: (ch: string, ...a: unknown[]) => void
      on: (ch: string, fn: (...a: unknown[]) => void) => () => void
    } }).__aetherIpc

    if (!ipc) {
      throw new Error('LSP IPC bridge not available. Ensure preload exposes __aetherIpc.')
    }

    this.lspId = await ipc.invoke('aether:lsp-spawn', {
      distro: this.distro,
      command: this.command,
      args: this.args,
      cwd: this.cwd,
    }) as string

    this.unsubMessage = ipc.on('aether:lsp-message', (...args: unknown[]) => {
      const msg = (args[1] ?? args[0]) as { lspId: string; message: JsonRpcResponse<unknown> }
      if (msg.lspId !== this.lspId) return
      const { id, result, error } = msg.message
      if (id != null) {
        const p = this.pending.get(String(id))
        if (p) {
          this.pending.delete(String(id))
          if (error) p.reject(new Error(error.message ?? 'LSP error'))
          else p.resolve(result)
        }
      }
    })

    this.unsubExit = ipc.on('aether:lsp-exit', (...args: unknown[]) => {
      const msg = (args[1] ?? args[0]) as { lspId: string; code: number }
      if (msg.lspId !== this.lspId) return
      for (const [, p] of this.pending) {
        p.reject(new Error(`LSP process exited with code ${msg.code}`))
      }
      this.pending.clear()
    })
  }

  async request<T>(method: string, params: unknown): Promise<T> {
    if (!this.lspId) throw new Error('WSL LSP transport not started')

    const ipc = (window as unknown as { __aetherIpc?: {
      send: (ch: string, ...a: unknown[]) => void
    } }).__aetherIpc

    if (!ipc) throw new Error('LSP IPC bridge not available')

    const id = crypto.randomUUID()
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      ipc.send('aether:lsp-send', this.lspId, { jsonrpc: '2.0', id, method, params })
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`LSP request timeout: ${method}`))
        }
      }, 30_000)
    })
  }

  dispose() {
    const ipc = (window as unknown as { __aetherIpc?: {
      send: (ch: string, ...a: unknown[]) => void
    } }).__aetherIpc
    if (ipc && this.lspId) {
      ipc.send('aether:lsp-kill', this.lspId)
    }
    this.unsubMessage?.()
    this.unsubExit?.()
    this.pending.clear()
    this.lspId = null
  }
}
