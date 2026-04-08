/**
 * Spawns LSP server processes inside WSL and relays JSON-RPC over stdin/stdout.
 * Each LSP session gets a unique ID. The renderer sends requests via IPC,
 * and responses are forwarded back.
 */
import { spawn } from 'node:child_process'
import { ipcMain } from 'electron'

/** @type {Map<string, { process: import('node:child_process').ChildProcess, buffer: string }>} */
const sessions = new Map()
let counter = 0

function parseContentLength(header) {
  const match = /Content-Length:\s*(\d+)/i.exec(header)
  return match ? parseInt(match[1], 10) : -1
}

/**
 * Register IPC handlers for LSP-over-WSL.
 * @param {() => import('electron').BrowserWindow | null} getWindow
 */
export function registerLspSpawnerHandlers(getWindow) {
  ipcMain.handle('aether:lsp-spawn', async (_event, options) => {
    const { distro, command, args = [], cwd } = options
    const id = `lsp-${++counter}`

    const wslArgs = ['-d', distro, '--']
    if (cwd) wslArgs.push('cd', cwd, '&&')
    wslArgs.push(command, ...args)

    const proc = spawn('wsl.exe', wslArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, TERM: 'dumb' },
    })

    const session = { process: proc, buffer: '' }
    sessions.set(id, session)

    proc.stdout.on('data', (chunk) => {
      session.buffer += chunk.toString('utf8')
      drainMessages(id, session, getWindow)
    })

    proc.stderr.on('data', (chunk) => {
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('aether:lsp-stderr', { lspId: id, text: chunk.toString('utf8') })
      }
    })

    proc.on('exit', (code) => {
      sessions.delete(id)
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('aether:lsp-exit', { lspId: id, code })
      }
    })

    return id
  })

  ipcMain.on('aether:lsp-send', (_event, lspId, jsonRpcMessage) => {
    const session = sessions.get(lspId)
    if (!session) return
    const body = JSON.stringify(jsonRpcMessage)
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`
    session.process.stdin.write(header + body)
  })

  ipcMain.on('aether:lsp-kill', (_event, lspId) => {
    const session = sessions.get(lspId)
    if (session) {
      session.process.kill()
      sessions.delete(lspId)
    }
  })
}

function drainMessages(id, session, getWindow) {
  while (true) {
    const headerEnd = session.buffer.indexOf('\r\n\r\n')
    if (headerEnd === -1) break
    const header = session.buffer.slice(0, headerEnd)
    const contentLength = parseContentLength(header)
    if (contentLength < 0) break
    const bodyStart = headerEnd + 4
    if (session.buffer.length < bodyStart + contentLength) break
    const body = session.buffer.slice(bodyStart, bodyStart + contentLength)
    session.buffer = session.buffer.slice(bodyStart + contentLength)
    try {
      const msg = JSON.parse(body)
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('aether:lsp-message', { lspId: id, message: msg })
      }
    } catch {
      // malformed JSON — skip
    }
  }
}

export function killAllLspSessions() {
  for (const [, session] of sessions) {
    try { session.process.kill() } catch { /* ignore */ }
  }
  sessions.clear()
}
