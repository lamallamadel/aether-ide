import type { FileNode } from '../../domain/fileNode'

export type FsEvent = {
  type: 'create' | 'change' | 'delete'
  relativePath: string
}

export type WorkspaceProviderKind = 'local' | 'wsl'

export interface WorkspaceProvider {
  kind: WorkspaceProviderKind
  label: string
  loadTree(rootPath: string): Promise<{ files: FileNode[]; rootPath: string; workspaceLabel: string }>
  readFile(rootPath: string, relativePath: string): Promise<string | null>
  writeFile(rootPath: string, relativePath: string, content: string): Promise<void>
  watchChanges?(rootPath: string, cb: (events: FsEvent[]) => void): () => void
}

/**
 * Wraps the existing Electron IPC calls into a WorkspaceProvider.
 * Delegates to `window.aetherDesktop.*` via the preload bridge.
 */
export class LocalElectronProvider implements WorkspaceProvider {
  kind = 'local' as const
  label = 'Local'

  async loadTree(rootPath: string) {
    const d = window.aetherDesktop
    if (!d?.loadWorkspace) throw new Error('Electron workspace API unavailable')
    return d.loadWorkspace(rootPath) as Promise<{ files: FileNode[]; rootPath: string; workspaceLabel: string }>
  }

  async readFile(rootPath: string, relativePath: string) {
    const d = window.aetherDesktop
    if (!d?.readTextRelative) return null
    const t = await d.readTextRelative(rootPath, relativePath)
    return typeof t === 'string' ? t : null
  }

  async writeFile(rootPath: string, relativePath: string, content: string) {
    const d = window.aetherDesktop
    if (!d?.writeFileRelative) throw new Error('Electron workspace API unavailable')
    await d.writeFileRelative(rootPath, relativePath, content)
  }
}

/**
 * Delegates FS operations to the WSL backend in the Electron main process.
 * Uses IPC channels `aether:wsl-*`.
 */
export class WslProvider implements WorkspaceProvider {
  kind = 'wsl' as const
  label: string
  private distro: string

  constructor(distro: string) {
    this.distro = distro
    this.label = `WSL: ${distro}`
  }

  async loadTree(rootPath: string) {
    const d = window.aetherDesktop
    if (!d?.wsl?.loadWorkspace) throw new Error('WSL workspace API unavailable')
    return d.wsl.loadWorkspace(this.distro, rootPath)
  }

  async readFile(rootPath: string, relativePath: string) {
    const d = window.aetherDesktop
    if (!d?.wsl?.readTextRelative) return null
    const t = await d.wsl.readTextRelative(this.distro, rootPath, relativePath)
    return typeof t === 'string' ? t : null
  }

  async writeFile(rootPath: string, relativePath: string, content: string) {
    const d = window.aetherDesktop
    if (!d?.wsl?.writeFileRelative) throw new Error('WSL workspace API unavailable')
    await d.wsl.writeFileRelative(this.distro, rootPath, relativePath, content)
  }
}
