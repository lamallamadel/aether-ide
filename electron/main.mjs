/**
 * Processus principal Electron — charge l’UI Vite (dev) ou dist/index.html (prod).
 */
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {BrowserWindow | null} */
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
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
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
