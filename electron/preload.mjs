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
  /** Chemin absolu du dossier choisi (pour une future couche FS native). */
  pickWorkspaceRoot: () => ipcRenderer.invoke('aether:pick-directory'),
})
