/**
 * Manages multiple PTY sessions in the Electron main process.
 * Each session is identified by a unique `ptyId`.
 */
import { ipcMain } from 'electron'
import os from 'node:os'

/** @type {Map<string, import('@lydell/node-pty').IPty>} */
const sessions = new Map()
let counter = 0

function defaultShell() {
  if (process.platform === 'win32') return process.env.COMSPEC || 'cmd.exe'
  return process.env.SHELL || '/bin/bash'
}

/**
 * Register all PTY-related IPC handlers.
 * @param {() => import('electron').BrowserWindow | null} getWindow
 */
export function registerPtyHandlers(getWindow) {
  ipcMain.handle('aether:pty-create', async (_event, options) => {
    const pty = await import('@lydell/node-pty')
    const id = `pty-${++counter}`
    const shell = (typeof options?.shell === 'string' && options.shell) ? options.shell : defaultShell()
    const args = Array.isArray(options?.args) ? options.args.filter((a) => typeof a === 'string') : []
    const cwd = (typeof options?.cwd === 'string' && options.cwd) ? options.cwd : os.homedir()
    const env = { ...process.env, ...(options?.env && typeof options.env === 'object' ? options.env : {}), TERM: 'xterm-256color' }

    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env,
    })

    sessions.set(id, proc)

    proc.onData((data) => {
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('aether:pty-data', { ptyId: id, data })
      }
    })

    proc.onExit(({ exitCode }) => {
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('aether:pty-exit', { ptyId: id, code: exitCode })
      }
      sessions.delete(id)
    })

    return id
  })

  ipcMain.on('aether:pty-write', (_event, ptyId, data) => {
    if (typeof ptyId !== 'string' || typeof data !== 'string') return
    sessions.get(ptyId)?.write(data)
  })

  ipcMain.on('aether:pty-resize', (_event, ptyId, cols, rows) => {
    try {
      sessions.get(ptyId)?.resize(cols, rows)
    } catch {
      // resize can fail if process already exited
    }
  })

  ipcMain.on('aether:pty-kill', (_event, ptyId) => {
    const proc = sessions.get(ptyId)
    if (proc) {
      proc.kill()
      sessions.delete(ptyId)
    }
  })
}

export function killAllPtySessions() {
  for (const [id, proc] of sessions) {
    try { proc.kill() } catch { /* ignore */ }
    sessions.delete(id)
  }
}
