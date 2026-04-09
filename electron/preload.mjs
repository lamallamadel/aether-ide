/**
 * Preload — expose une surface minimale au renderer (pas de Node direct).
 */
import { contextBridge, ipcRenderer } from 'electron'

const runtimePlatform = typeof process !== 'undefined' ? process.platform : 'unknown'
const runtimeVersions =
  typeof process !== 'undefined'
    ? {
        electron: process.versions?.electron ?? 'unknown',
        chrome: process.versions?.chrome ?? 'unknown',
      }
    : { electron: 'unknown', chrome: 'unknown' }

// Raw IPC bridge for LSP stdio relay (needed by WslStdioTransport)
const ALLOWED_IPC_CHANNELS = new Set([
  'aether:lsp-spawn', 'aether:lsp-send', 'aether:lsp-kill',
  'aether:lsp-message', 'aether:lsp-stderr', 'aether:lsp-exit',
])
contextBridge.exposeInMainWorld('__aetherIpc', {
  invoke: (channel, ...args) => {
    if (!ALLOWED_IPC_CHANNELS.has(channel)) throw new Error(`IPC channel not allowed: ${channel}`)
    return ipcRenderer.invoke(channel, ...args)
  },
  send: (channel, ...args) => {
    if (!ALLOWED_IPC_CHANNELS.has(channel)) throw new Error(`IPC channel not allowed: ${channel}`)
    ipcRenderer.send(channel, ...args)
  },
  on: (channel, fn) => {
    if (!ALLOWED_IPC_CHANNELS.has(channel)) throw new Error(`IPC channel not allowed: ${channel}`)
    const handler = (_event, ...args) => fn(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
})

contextBridge.exposeInMainWorld('aetherDesktop', {
  kind: 'electron',
  platform: runtimePlatform,
  versions: runtimeVersions,
  pickWorkspaceRoot: () => ipcRenderer.invoke('aether:pick-directory'),
  loadWorkspace: (rootPath) => ipcRenderer.invoke('aether:load-workspace', rootPath),
  writeFileRelative: (rootPath, relativePath, content) =>
    ipcRenderer.invoke('aether:write-file-relative', rootPath, relativePath, content),
  readTextRelative: (rootPath, relativePath) =>
    ipcRenderer.invoke('aether:read-text-relative', rootPath, relativePath),
  runNpmScript: (rootPath, script) => ipcRenderer.invoke('aether:run-npm-script', rootPath, script),
  onTerminalStream: (handler) => {
    const fn = (_event, data) => handler(data)
    ipcRenderer.on('aether:terminal-stream', fn)
    return () => ipcRenderer.removeListener('aether:terminal-stream', fn)
  },

  pty: {
    create: (options) => ipcRenderer.invoke('aether:pty-create', options),
    write: (ptyId, data) => ipcRenderer.send('aether:pty-write', ptyId, data),
    resize: (ptyId, cols, rows) => ipcRenderer.send('aether:pty-resize', ptyId, cols, rows),
    kill: (ptyId) => ipcRenderer.send('aether:pty-kill', ptyId),
    onData: (ptyId, handler) => {
      const fn = (_event, msg) => { if (msg.ptyId === ptyId) handler(msg.data) }
      ipcRenderer.on('aether:pty-data', fn)
      return () => ipcRenderer.removeListener('aether:pty-data', fn)
    },
    onExit: (ptyId, handler) => {
      const fn = (_event, msg) => { if (msg.ptyId === ptyId) handler(msg.code) }
      ipcRenderer.on('aether:pty-exit', fn)
      return () => ipcRenderer.removeListener('aether:pty-exit', fn)
    },
  },

  wsl: {
    checkAvailable: () => ipcRenderer.invoke('aether:wsl-check-available'),
    listDistros: () => ipcRenderer.invoke('aether:wsl-list-distros'),
    loadWorkspace: (distro, linuxPath) => ipcRenderer.invoke('aether:wsl-load-workspace', distro, linuxPath),
    writeFileRelative: (distro, rootPath, relativePath, content) =>
      ipcRenderer.invoke('aether:wsl-write-file-relative', distro, rootPath, relativePath, content),
    readTextRelative: (distro, rootPath, relativePath) =>
      ipcRenderer.invoke('aether:wsl-read-text-relative', distro, rootPath, relativePath),
    browseFolders: (distro, basePath) => ipcRenderer.invoke('aether:wsl-browse-folders', distro, basePath),
    getHomePath: (distro) => ipcRenderer.invoke('aether:wsl-get-home', distro),
  },
})
