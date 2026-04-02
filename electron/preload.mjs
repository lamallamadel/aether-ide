/**
 * Preload — expose une surface minimale au renderer (pas de Node direct).
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('aetherDesktop', {
  kind: 'electron',
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
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
})
