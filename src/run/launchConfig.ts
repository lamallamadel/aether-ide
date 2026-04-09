/**
 * Reads and writes `.aether/launch.json` from/to the active workspace.
 * Also provides auto-detection of npm scripts from package.json.
 */
import type { RunConfiguration, LaunchFileV1 } from './types'
import { nativeReadTextRelative, nativeWriteFileRelative } from '../services/fileSystem/electronNativeWorkspace'

export const AETHER_PROJECT_DIR = '.aether'
export const LAUNCH_CONFIG_FILE = 'launch.json'
const LAUNCH_CONFIG_PATH = `${AETHER_PROJECT_DIR}/${LAUNCH_CONFIG_FILE}`

// ---------------------------------------------------------------------------
// Parse / serialize
// ---------------------------------------------------------------------------

function isValidConfig(v: unknown): v is RunConfiguration {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const r = v as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.type === 'string'
}

export function parseLaunchJson(text: string): RunConfiguration[] {
  try {
    const data = JSON.parse(text) as unknown
    if (!data || typeof data !== 'object' || Array.isArray(data)) return []
    const file = data as Record<string, unknown>
    if (!Array.isArray(file.configurations)) return []
    return (file.configurations as unknown[]).filter(isValidConfig)
  } catch {
    return []
  }
}

export function serializeLaunchJson(configurations: RunConfiguration[]): string {
  const file: LaunchFileV1 = { version: 1, configurations }
  return `${JSON.stringify(file, null, 2)}\n`
}

// ---------------------------------------------------------------------------
// Native workspace (Electron) read/write
// ---------------------------------------------------------------------------

export async function readLaunchConfigs(workspaceRootPath: string): Promise<RunConfiguration[]> {
  try {
    const text = await nativeReadTextRelative(workspaceRootPath, LAUNCH_CONFIG_PATH)
    if (text === null) return []
    return parseLaunchJson(text)
  } catch {
    return []
  }
}

export async function writeLaunchConfigs(
  workspaceRootPath: string,
  configurations: RunConfiguration[]
): Promise<void> {
  await nativeWriteFileRelative(workspaceRootPath, LAUNCH_CONFIG_PATH, serializeLaunchJson(configurations))
}

// ---------------------------------------------------------------------------
// FSA (browser) read/write
// ---------------------------------------------------------------------------

export async function readLaunchConfigsFsa(
  rootHandle: FileSystemDirectoryHandle
): Promise<RunConfiguration[]> {
  try {
    const dir = await rootHandle.getDirectoryHandle(AETHER_PROJECT_DIR)
    const fileHandle = await dir.getFileHandle(LAUNCH_CONFIG_FILE)
    const file = await fileHandle.getFile()
    const text = await file.text()
    return parseLaunchJson(text)
  } catch {
    return []
  }
}

export async function writeLaunchConfigsFsa(
  rootHandle: FileSystemDirectoryHandle,
  configurations: RunConfiguration[]
): Promise<void> {
  const dir = await rootHandle.getDirectoryHandle(AETHER_PROJECT_DIR, { create: true })
  const fileHandle = await dir.getFileHandle(LAUNCH_CONFIG_FILE, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(serializeLaunchJson(configurations))
  await writable.close()
}

// ---------------------------------------------------------------------------
// Auto-detection of npm scripts from package.json
// ---------------------------------------------------------------------------

const COMMON_SCRIPTS = ['dev', 'start', 'build', 'test', 'lint', 'preview', 'serve']

export interface DetectedScript {
  script: string
  /** true if it was found in package.json scripts, false if it's a common suggestion */
  fromPackage: boolean
}

export async function detectNpmScripts(workspaceRootPath: string): Promise<DetectedScript[]> {
  try {
    const text = await nativeReadTextRelative(workspaceRootPath, 'package.json')
    if (!text) return COMMON_SCRIPTS.map((s) => ({ script: s, fromPackage: false }))
    const pkg = JSON.parse(text) as Record<string, unknown>
    const scripts = pkg.scripts
    if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) {
      return COMMON_SCRIPTS.map((s) => ({ script: s, fromPackage: false }))
    }
    return Object.keys(scripts as Record<string, unknown>).map((s) => ({ script: s, fromPackage: true }))
  } catch {
    return COMMON_SCRIPTS.map((s) => ({ script: s, fromPackage: false }))
  }
}

export async function detectNpmScriptsFsa(
  rootHandle: FileSystemDirectoryHandle
): Promise<DetectedScript[]> {
  try {
    const fileHandle = await rootHandle.getFileHandle('package.json')
    const file = await fileHandle.getFile()
    const text = await file.text()
    const pkg = JSON.parse(text) as Record<string, unknown>
    const scripts = pkg.scripts
    if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) {
      return COMMON_SCRIPTS.map((s) => ({ script: s, fromPackage: false }))
    }
    return Object.keys(scripts as Record<string, unknown>).map((s) => ({ script: s, fromPackage: true }))
  } catch {
    return COMMON_SCRIPTS.map((s) => ({ script: s, fromPackage: false }))
  }
}

// ---------------------------------------------------------------------------
// Generate a default configuration from a detected npm script
// ---------------------------------------------------------------------------

let _idCounter = 0
export function generateConfigId(): string {
  return `run-${Date.now()}-${++_idCounter}`
}

export function makeNpmConfig(script: string, workspaceRootPath?: string): RunConfiguration {
  return {
    id: generateConfigId(),
    name: `npm run ${script}`,
    type: 'npm',
    npmScript: script,
    cwd: workspaceRootPath,
    pinned: ['dev', 'start', 'build', 'test'].includes(script),
  }
}

export function makeShellConfig(command: string, name?: string): RunConfiguration {
  return {
    id: generateConfigId(),
    name: name ?? command,
    type: 'shell',
    command,
  }
}
