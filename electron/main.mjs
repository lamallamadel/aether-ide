/**
 * Processus principal Electron — charge l’UI Vite (dev) ou dist/index.html (prod).
 */
import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  readWorkspaceTreeNative,
  readTextUnderRoot,
  writeFileUnderRoot,
} from './workspaceNative.mjs'
import { registerPtyHandlers, killAllPtySessions } from './ptyManager.mjs'
import { registerWslDetectionHandlers } from './wslDetection.mjs'
import { registerWslFileSystemHandlers } from './wslFileSystem.mjs'
import { registerLspSpawnerHandlers, killAllLspSessions } from './lspSpawner.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {BrowserWindow | null} */
let mainWindow = null

/** @type {Set<import('node:child_process').ChildProcess>} */
const npmChildren = new Set()

function createWindow() {
  Menu.setApplicationMenu(null)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'

  if (!app.isPackaged) {
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('Failed to load dev server:', err)
    })
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    mainWindow.loadFile(indexHtml).catch((err) => {
      console.error('Failed to load index.html:', err)
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers() {
  ipcMain.handle('aether:pick-directory', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const r = await dialog.showOpenDialog(win ?? undefined, {
      properties: ['openDirectory', 'createDirectory'],
    })
    if (r.canceled || r.filePaths.length === 0) return null
    return r.filePaths[0]
  })

  ipcMain.handle('aether:load-workspace', async (_event, rootPath) => {
    if (typeof rootPath !== 'string' || !rootPath.trim()) throw new Error('Invalid root path')
    return readWorkspaceTreeNative(rootPath)
  })

  ipcMain.handle('aether:write-file-relative', async (_event, rootPath, relativePath, content) => {
    if (typeof rootPath !== 'string' || !rootPath.trim()) throw new Error('Invalid root path')
    if (typeof relativePath !== 'string' || !relativePath.trim()) throw new Error('Invalid relative path')
    if (typeof content !== 'string') throw new Error('Invalid content')
    await writeFileUnderRoot(rootPath, relativePath, content)
  })

  ipcMain.handle('aether:read-text-relative', async (_event, rootPath, relativePath) => {
    if (typeof rootPath !== 'string' || !rootPath.trim()) throw new Error('Invalid root path')
    if (typeof relativePath !== 'string' || !relativePath.trim()) throw new Error('Invalid relative path')
    return readTextUnderRoot(rootPath, relativePath)
  })

  ipcMain.handle('aether:run-npm-script', async (event, rootPath, script) => {
    if (typeof rootPath !== 'string' || typeof script !== 'string' || !rootPath.trim() || !script.trim()) {
      throw new Error('Invalid workspace or script name')
    }
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const child = spawn(npm, ['run', script], {
      cwd: rootPath,
      shell: process.platform === 'win32',
      env: process.env,
    })
    npmChildren.add(child)
    const sender = event.sender
    const safeSend = (ch, data) => { try { if (!sender.isDestroyed()) sender.send(ch, data) } catch { /* ignore */ } }
    child.stdout?.on('data', (d) => {
      safeSend('aether:terminal-stream', { text: d.toString(), stream: 'stdout' })
    })
    child.stderr?.on('data', (d) => {
      safeSend('aether:terminal-stream', { text: d.toString(), stream: 'stderr' })
    })
    child.on('close', (code) => {
      npmChildren.delete(child)
      safeSend('aether:terminal-stream', { text: `\r\n[process exited with code ${code}]\r\n`, stream: 'exit', code })
    })
    child.on('error', (err) => {
      npmChildren.delete(child)
      safeSend('aether:terminal-stream', { text: `${err.message}\r\n`, stream: 'error' })
    })
    return { ok: true, message: `Started: npm run ${script}` }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    registerIpcHandlers()
    registerPtyHandlers(() => mainWindow)
    registerWslDetectionHandlers()
    registerWslFileSystemHandlers()
    registerLspSpawnerHandlers(() => mainWindow)
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    killAllPtySessions()
    killAllLspSessions()
    for (const child of npmChildren) { try { child.kill() } catch { /* ignore */ } }
    npmChildren.clear()
    if (process.platform !== 'darwin') app.quit()
  })
}
