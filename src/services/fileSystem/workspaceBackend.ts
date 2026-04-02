/**
 * Détecte le shell hébergeur (navigateur vs Electron) et expose des points d’accroche
 * pour une future intégration FS native (chemins disque + IPC).
 */

export type WorkspaceShellKind = 'browser' | 'electron'

export function getWorkspaceShellKind(): WorkspaceShellKind {
  if (typeof window !== 'undefined' && window.aetherDesktop?.kind === 'electron') {
    return 'electron'
  }
  return 'browser'
}

export function getDesktopMeta(): { platform: string } | null {
  if (typeof window === 'undefined' || window.aetherDesktop?.kind !== 'electron') return null
  return { platform: window.aetherDesktop.platform }
}

/**
 * Ouvre un dialogue « dossier » côté process principal (Electron uniquement).
 * Retourne un chemin absolu ou `null`. Dans le navigateur, retourne toujours `null`
 * (utiliser `pickDirectory` + File System Access API).
 */
export async function pickNativeWorkspaceRootPath(): Promise<string | null> {
  const bridge = typeof window !== 'undefined' ? window.aetherDesktop : undefined
  if (bridge?.kind !== 'electron' || typeof bridge.pickWorkspaceRoot !== 'function') {
    return null
  }
  return bridge.pickWorkspaceRoot()
}
