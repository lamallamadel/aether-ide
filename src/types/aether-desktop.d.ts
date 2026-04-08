import type { FileNode } from '../domain/fileNode'

/** WSL distribution info returned by `wsl.exe --list --verbose`. */
export interface WslDistro {
  name: string
  state: 'Running' | 'Stopped' | 'Installing' | 'Unknown'
  version: 1 | 2
  isDefault: boolean
}

/** Remote connection status. */
export type RemoteConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/** PTY session surface exposed by preload. */
export interface PtyBridge {
  create: (options: { shell: string; args?: string[]; cwd?: string; env?: Record<string, string> }) => Promise<string>
  write: (ptyId: string, data: string) => void
  resize: (ptyId: string, cols: number, rows: number) => void
  kill: (ptyId: string) => void
  onData: (ptyId: string, handler: (data: string) => void) => () => void
  onExit: (ptyId: string, handler: (code: number) => void) => () => void
}

/** WSL-specific surface exposed by preload. */
export interface WslBridge {
  checkAvailable: () => Promise<{ available: boolean; wslVersion?: string }>
  listDistros: () => Promise<WslDistro[]>
  loadWorkspace: (distro: string, linuxPath: string) => Promise<{ files: FileNode[]; rootPath: string; workspaceLabel: string }>
  writeFileRelative: (distro: string, rootPath: string, relativePath: string, content: string) => Promise<void>
  readTextRelative: (distro: string, rootPath: string, relativePath: string) => Promise<string | null>
  browseFolders: (distro: string, basePath: string) => Promise<string[]>
}

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
  pty?: PtyBridge
  wsl?: WslBridge
}

declare global {
  interface Window {
    aetherDesktop?: AetherDesktopBridge
  }
}

export {}
