import type { WorkspaceEnvironment } from './environment'
import { readFileContent, writeFileContent } from '../services/fileSystem/fileSystemAccess'

/** Répertoire des métadonnées projet (à la racine du workspace ouvert). */
export const AETHER_PROJECT_DIR = '.aether'

/** Fichier JSON des overrides d’environnement workspace. */
export const WORKSPACE_PROJECT_CONFIG_FILE = 'workspace.json'

const LSP_MODES = new Set(['embedded', 'external', 'auto'])
const AI_MODES = new Set(['cloud', 'local'])

export type WorkspaceProjectConfigFileV1 = {
  version: 1
  overrides: WorkspaceEnvironment['overrides']
}

/**
 * Parse le contenu de `workspace.json`. Retourne des overrides validés ou `null` si JSON invalide / version non supportée.
 */
export function parseWorkspaceProjectConfigJson(jsonText: string): WorkspaceEnvironment['overrides'] | null {
  try {
    const data = JSON.parse(jsonText) as unknown
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return null
    const rec = data as Record<string, unknown>
    if (rec.version !== undefined && rec.version !== 1) return null
    const rawOverrides = rec.overrides
    const o =
      rawOverrides !== undefined && rawOverrides !== null && typeof rawOverrides === 'object' && !Array.isArray(rawOverrides)
        ? (rawOverrides as Record<string, unknown>)
        : {}
    const out: WorkspaceEnvironment['overrides'] = {}
    if (typeof o.aiMode === 'string' && AI_MODES.has(o.aiMode)) {
      out.aiMode = o.aiMode as WorkspaceEnvironment['overrides']['aiMode']
    }
    if (typeof o.lspMode === 'string' && LSP_MODES.has(o.lspMode)) {
      out.lspMode = o.lspMode as WorkspaceEnvironment['overrides']['lspMode']
    }
    if (typeof o.externalLspEndpoint === 'string') {
      out.externalLspEndpoint = o.externalLspEndpoint
    }
    return out
  } catch {
    return null
  }
}

/**
 * Sérialise les overrides pour écriture disque (clés absentes si `undefined`).
 */
export function serializeWorkspaceProjectConfig(overrides: WorkspaceEnvironment['overrides']): string {
  const clean: WorkspaceEnvironment['overrides'] = {}
  if (overrides.aiMode !== undefined) clean.aiMode = overrides.aiMode
  if (overrides.lspMode !== undefined) clean.lspMode = overrides.lspMode
  if (overrides.externalLspEndpoint !== undefined) clean.externalLspEndpoint = overrides.externalLspEndpoint
  const body: WorkspaceProjectConfigFileV1 = { version: 1, overrides: clean }
  return `${JSON.stringify(body, null, 2)}\n`
}

/**
 * Lit `.aether/workspace.json` à la racine du handle. Retourne `{}` si absent ou illisible.
 */
export async function readWorkspaceOverridesFromRoot(
  rootHandle: FileSystemDirectoryHandle
): Promise<WorkspaceEnvironment['overrides']> {
  try {
    const dir = await rootHandle.getDirectoryHandle(AETHER_PROJECT_DIR)
    const fileHandle = await dir.getFileHandle(WORKSPACE_PROJECT_CONFIG_FILE)
    const text = await readFileContent(fileHandle)
    return parseWorkspaceProjectConfigJson(text) ?? {}
  } catch {
    return {}
  }
}

/**
 * Crée `.aether/` si besoin et écrit `workspace.json`.
 */
export async function writeWorkspaceProjectConfig(
  rootHandle: FileSystemDirectoryHandle,
  overrides: WorkspaceEnvironment['overrides']
): Promise<void> {
  const dir = await rootHandle.getDirectoryHandle(AETHER_PROJECT_DIR, { create: true })
  const fileHandle = await dir.getFileHandle(WORKSPACE_PROJECT_CONFIG_FILE, { create: true })
  await writeFileContent(fileHandle, serializeWorkspaceProjectConfig(overrides))
}
