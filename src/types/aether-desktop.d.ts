import type { FileNode } from '../domain/fileNode'

/** Pont preload Electron (voir `electron/preload.mjs`). */
export interface AetherDesktopBridge {
  kind: 'electron'
  platform: string
  versions: { electron: string; chrome: string }
  pickWorkspaceRoot: () => Promise<string | null>
  loadWorkspace: (rootPath: string) => Promise<{ files: FileNode[]; rootPath: string; workspaceLabel: string }>
  writeFileRelative: (rootPath: string, relativePath: string, content: string) => Promise<void>
  readTextRelative: (rootPath: string, relativePath: string) => Promise<string | null>
  runNpmScript: (rootPath: string, script: string) => Promise<{ ok?: boolean; message?: string }>
  onTerminalStream: (handler: (data: { text: string; stream?: string; code?: number }) => void) => () => void
}

declare global {
  interface Window {
    aetherDesktop?: AetherDesktopBridge
  }
}

export {}
