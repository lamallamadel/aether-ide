import type { FileNode } from '../../domain/fileNode'

/** Appels IPC vers le processus principal (fs natif). */

export async function nativeLoadWorkspace(rootPath: string): Promise<{
  files: FileNode[]
  rootPath: string
  workspaceLabel: string
}> {
  const d = window.aetherDesktop
  if (!d?.loadWorkspace) throw new Error('Electron workspace API unavailable')
  return d.loadWorkspace(rootPath) as Promise<{
    files: FileNode[]
    rootPath: string
    workspaceLabel: string
  }>
}

export async function nativeWriteFileRelative(rootPath: string, relativePath: string, content: string): Promise<void> {
  const d = window.aetherDesktop
  if (!d?.writeFileRelative) throw new Error('Electron workspace API unavailable')
  await d.writeFileRelative(rootPath, relativePath, content)
}

export async function nativeReadTextRelative(rootPath: string, relativePath: string): Promise<string | null> {
  const d = window.aetherDesktop
  if (!d?.readTextRelative) return null
  const t = await d.readTextRelative(rootPath, relativePath)
  return typeof t === 'string' ? t : null
}
