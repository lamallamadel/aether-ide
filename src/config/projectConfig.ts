/**
 * Aether IDE project configuration.
 *
 * Stored in `.aetheride/project.json` at the workspace root.
 * Defines the project identity, type, SDK paths, and modules.
 */
import { nativeReadTextRelative, nativeWriteFileRelative } from '../services/fileSystem/electronNativeWorkspace'
import type { FileNode } from '../domain/fileNode'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AETHERIDE_DIR = '.aetheride'
export const PROJECT_CONFIG_FILE = 'project.json'
const PROJECT_CONFIG_PATH = `${AETHERIDE_DIR}/${PROJECT_CONFIG_FILE}`

/** Manifest for the wind (aether-wind) build tool — cargo equivalent for Aether. */
export const WIND_MANIFEST_FILE = 'Wind.toml'

export const DEFAULT_WIND_PATH = 'wind'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectType =
  | 'aether-app'       // .aether source → compile + run
  | 'aether-compiler'  // C++/CMake compiler frontend or backend
  | 'aether-runtime'   // C/CMake runtime
  | 'node-service'     // Node.js service (cli, server, governor, judge, etc.)
  | 'python-ml'        // Python ML project (infer, train)
  | 'generic'          // Unknown / generic workspace

export interface AetherSdk {
  /** Path to the aethercc compiler driver */
  aetherccPath: string
  /** Path to the directory containing libaether-rt */
  runtimeLibPath: string
  /** Path to clang (or clang++) for linking */
  clangPath: string
  /** Path to aether-rt include directory (optional) */
  runtimeIncludePath?: string
}

export interface AetherProject {
  version: 1
  /** Human-readable project name */
  name: string
  /** Project type determines available run configurations and tooling */
  type: ProjectType
  /** SDK paths for Aether compilation (used when type includes aether compilation) */
  sdk: AetherSdk
  /** Module paths (future: multi-module projects) */
  modules: string[]
  /** When true, refresh embedded LSP diagnostics when saving .aether files (not the external compiler). */
  compileOnSave?: boolean
  /** Path to the `wind` CLI in WSL (default: on PATH as `wind`). */
  windPath?: string
  /** If set, relative path to Wind.toml passed as `wind --manifest <path>` (when not at workspace root). */
  windManifestPath?: string
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SDK: AetherSdk = {
  aetherccPath: 'aethercc',
  runtimeLibPath: '$HOME/work/aether-rt/build',
  clangPath: 'clang',
  runtimeIncludePath: '',
}

export function createDefaultProject(name: string, type: ProjectType = 'generic'): AetherProject {
  return {
    version: 1,
    name,
    type,
    sdk: { ...DEFAULT_SDK },
    modules: [],
    windPath: DEFAULT_WIND_PATH,
  }
}

// ---------------------------------------------------------------------------
// Auto-detect project type from files present in workspace
// ---------------------------------------------------------------------------

export async function detectProjectType(workspaceRootPath: string): Promise<ProjectType> {
  const exists = async (rel: string) => {
    try {
      const content = await nativeReadTextRelative(workspaceRootPath, rel)
      return content !== null
    } catch {
      return false
    }
  }

  const hasContent = async (rel: string, needle: string) => {
    try {
      const content = await nativeReadTextRelative(workspaceRootPath, rel)
      return content !== null && content.includes(needle)
    } catch {
      return false
    }
  }

  // Check for Aether compiler project (CMake + MLIR/LLVM deps)
  if (await hasContent('CMakeLists.txt', 'MLIR') || await hasContent('CMakeLists.txt', 'AetherFrontend') || await hasContent('CMakeLists.txt', 'AetherCore')) {
    return 'aether-compiler'
  }

  // Check for Aether runtime (CMake + C source with aether-rt markers)
  if (await hasContent('CMakeLists.txt', 'aether-rt') || await hasContent('CMakeLists.txt', 'blocklace')) {
    return 'aether-runtime'
  }

  // Wind / Aether package (cargo-style manifest)
  if (await exists(WIND_MANIFEST_FILE)) {
    return 'aether-app'
  }

  // Check for Aether app (Makefile with aethercc, or .aether files)
  if (await hasContent('Makefile', 'aethercc') || await hasContent('Makefile', 'aether-compile')) {
    return 'aether-app'
  }

  // Check for Python project
  if (await exists('pyproject.toml') || await exists('requirements.txt')) {
    return 'python-ml'
  }

  // Check for Node.js project
  if (await exists('package.json')) {
    return 'node-service'
  }

  return 'generic'
}

// ---------------------------------------------------------------------------
// Parse / serialize
// ---------------------------------------------------------------------------

const PROJECT_TYPES = new Set<string>([
  'aether-app', 'aether-compiler', 'aether-runtime', 'node-service', 'python-ml', 'generic',
])

export function parseProjectJson(text: string): AetherProject | null {
  try {
    const data = JSON.parse(text) as unknown
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    const rec = data as Record<string, unknown>

    if (rec.version !== undefined && rec.version !== 1) return null

    const name = typeof rec.name === 'string' ? rec.name : 'Unnamed'
    const type = typeof rec.type === 'string' && PROJECT_TYPES.has(rec.type)
      ? (rec.type as ProjectType)
      : 'generic'

    const rawSdk = rec.sdk
    const sdkObj = rawSdk && typeof rawSdk === 'object' && !Array.isArray(rawSdk)
      ? (rawSdk as Record<string, unknown>)
      : {}

    const sdk: AetherSdk = {
      aetherccPath: typeof sdkObj.aetherccPath === 'string' ? sdkObj.aetherccPath : DEFAULT_SDK.aetherccPath,
      runtimeLibPath: typeof sdkObj.runtimeLibPath === 'string' ? sdkObj.runtimeLibPath : DEFAULT_SDK.runtimeLibPath,
      clangPath: typeof sdkObj.clangPath === 'string' ? sdkObj.clangPath : DEFAULT_SDK.clangPath,
      runtimeIncludePath: typeof sdkObj.runtimeIncludePath === 'string' ? sdkObj.runtimeIncludePath : DEFAULT_SDK.runtimeIncludePath,
    }

    const modules = Array.isArray(rec.modules)
      ? (rec.modules as unknown[]).filter((m): m is string => typeof m === 'string')
      : []

    const compileOnSave = typeof rec.compileOnSave === 'boolean' ? rec.compileOnSave : undefined

    const windPath = typeof rec.windPath === 'string' ? rec.windPath : undefined
    const windManifestPath = typeof rec.windManifestPath === 'string' ? rec.windManifestPath : undefined

    return { version: 1, name, type, sdk, modules, compileOnSave, windPath, windManifestPath }
  } catch {
    return null
  }
}

export function serializeProjectJson(project: AetherProject): string {
  return `${JSON.stringify(project, null, 2)}\n`
}

// ---------------------------------------------------------------------------
// Read / Write (native Electron path)
// ---------------------------------------------------------------------------

export async function readProjectConfig(workspaceRootPath: string): Promise<AetherProject | null> {
  try {
    const text = await nativeReadTextRelative(workspaceRootPath, PROJECT_CONFIG_PATH)
    if (text === null) return null
    return parseProjectJson(text)
  } catch {
    return null
  }
}

export async function writeProjectConfig(workspaceRootPath: string, project: AetherProject): Promise<void> {
  await nativeWriteFileRelative(workspaceRootPath, PROJECT_CONFIG_PATH, serializeProjectJson(project))
}

// ---------------------------------------------------------------------------
// Read / Write (FSA browser path)
// ---------------------------------------------------------------------------

export async function readProjectConfigFsa(rootHandle: FileSystemDirectoryHandle): Promise<AetherProject | null> {
  try {
    const dir = await rootHandle.getDirectoryHandle(AETHERIDE_DIR)
    const fileHandle = await dir.getFileHandle(PROJECT_CONFIG_FILE)
    const file = await fileHandle.getFile()
    const text = await file.text()
    return parseProjectJson(text)
  } catch {
    return null
  }
}

export async function writeProjectConfigFsa(
  rootHandle: FileSystemDirectoryHandle,
  project: AetherProject
): Promise<void> {
  const dir = await rootHandle.getDirectoryHandle(AETHERIDE_DIR, { create: true })
  const fileHandle = await dir.getFileHandle(PROJECT_CONFIG_FILE, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(serializeProjectJson(project))
  await writable.close()
}

// ---------------------------------------------------------------------------
// Wind.toml presence (file tree)
// ---------------------------------------------------------------------------

/** True if the loaded workspace tree contains a `Wind.toml` file. */
export function treeHasWindToml(files: FileNode[]): boolean {
  const visit = (n: FileNode): boolean => {
    if (n.type === 'file' && (n.name === WIND_MANIFEST_FILE || n.id === WIND_MANIFEST_FILE || n.id.endsWith(`/${WIND_MANIFEST_FILE}`))) {
      return true
    }
    if (n.children?.length) return n.children.some(visit)
    return false
  }
  return files.some(visit)
}
