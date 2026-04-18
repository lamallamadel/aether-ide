/**
 * Reads and writes `.aether/launch.json` from/to the active workspace.
 * Also provides auto-detection of npm scripts from package.json.
 */
import type { RunConfiguration, LaunchFileV1, WindSubcommand } from './types'
import { WIND_MANIFEST_FILE } from '../config/projectConfig'
import { nativeReadTextRelative, nativeWriteFileRelative } from '../services/fileSystem/electronNativeWorkspace'

export const AETHER_PROJECT_DIR = '.aetheride'
export const LAUNCH_CONFIG_FILE = 'launch.json'
const LAUNCH_CONFIG_PATH = `${AETHER_PROJECT_DIR}/${LAUNCH_CONFIG_FILE}`

const LEGACY_PROJECT_DIR = '.aether'
const LEGACY_LAUNCH_CONFIG_PATH = `${LEGACY_PROJECT_DIR}/${LAUNCH_CONFIG_FILE}`

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
  for (const path of [LAUNCH_CONFIG_PATH, LEGACY_LAUNCH_CONFIG_PATH]) {
    try {
      const text = await nativeReadTextRelative(workspaceRootPath, path)
      if (text === null) continue
      const configs = parseLaunchJson(text)
      if (configs.length > 0) return configs
    } catch { /* try next */ }
  }
  return []
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
  for (const dirName of [AETHER_PROJECT_DIR, LEGACY_PROJECT_DIR]) {
    try {
      const dir = await rootHandle.getDirectoryHandle(dirName)
      const fileHandle = await dir.getFileHandle(LAUNCH_CONFIG_FILE)
      const file = await fileHandle.getFile()
      const text = await file.text()
      const configs = parseLaunchJson(text)
      if (configs.length > 0) return configs
    } catch { /* try next */ }
  }
  return []
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

// ---------------------------------------------------------------------------
// Aether ecosystem configuration helpers
// ---------------------------------------------------------------------------

export function makeAetherConfig(aetherFile: string, cwd?: string): RunConfiguration {
  const baseName = aetherFile.replace(/\.aether$/, '').split('/').pop() ?? 'main'
  return {
    id: generateConfigId(),
    name: `Aether: ${baseName}`,
    type: 'aether',
    aetherFile,
    cwd,
    pinned: true,
  }
}

export function makeCmakeConfig(target?: string, buildDir?: string, cwd?: string, name?: string): RunConfiguration {
  return {
    id: generateConfigId(),
    name: name ?? `CMake: ${target ?? 'all'}`,
    type: 'cmake',
    cmakeTarget: target,
    cmakeBuildDir: buildDir ?? 'build',
    cwd,
  }
}

export function makePythonConfig(module: string, cwd?: string, name?: string): RunConfiguration {
  return {
    id: generateConfigId(),
    name: name ?? `Python: ${module}`,
    type: 'python',
    pythonModule: module,
    cwd,
  }
}

export function makeWindConfig(
  command: WindSubcommand,
  name?: string,
  opts?: { windRelease?: boolean; windBin?: string; windFilter?: string; cwd?: string },
): RunConfiguration {
  return {
    id: generateConfigId(),
    name: name ?? `Wind: ${command}`,
    type: 'wind',
    windCommand: command,
    cwd: opts?.cwd,
    windRelease: opts?.windRelease,
    windBin: opts?.windBin,
    windFilter: opts?.windFilter,
    pinned: command === 'run',
  }
}

// ---------------------------------------------------------------------------
// Multi-project detection for Aether ecosystem
// ---------------------------------------------------------------------------

export interface DetectedProject {
  type: 'npm' | 'aether' | 'cmake' | 'python' | 'wind'
  label: string
  config: Partial<RunConfiguration>
}

export async function detectAetherProjects(workspaceRootPath: string): Promise<DetectedProject[]> {
  const projects: DetectedProject[] = []

  // Wind.toml → aether-wind (cargo-style)
  const windToml = await nativeReadTextRelative(workspaceRootPath, WIND_MANIFEST_FILE).catch(() => null)
  if (windToml) {
    const windCommands: WindSubcommand[] = ['build', 'run', 'check', 'test']
    for (const cmd of windCommands) {
      projects.push({
        type: 'wind',
        label: `wind ${cmd}`,
        config: {
          type: 'wind',
          windCommand: cmd,
          name: `Wind: ${cmd}`,
          pinned: cmd === 'run',
        },
      })
    }
  }

  // Check for CMakeLists.txt → cmake build
  const cmakeContent = await nativeReadTextRelative(workspaceRootPath, 'CMakeLists.txt').catch(() => null)
  if (cmakeContent) {
    const projectMatch = cmakeContent.match(/project\s*\(\s*([^\s)]+)/i)
    const projectName = projectMatch?.[1] ?? 'project'
    projects.push({
      type: 'cmake',
      label: `CMake: build ${projectName}`,
      config: { type: 'cmake', cmakeBuildDir: 'build', name: `CMake: ${projectName}` },
    })
  }

  // Check for Makefile → shell make (possibly aethercc)
  const makeContent = await nativeReadTextRelative(workspaceRootPath, 'Makefile').catch(() => null)
  if (makeContent) {
    if (makeContent.includes('aethercc') || makeContent.includes('aether-compile')) {
      projects.push({
        type: 'aether',
        label: 'Make: build Aether examples',
        config: { type: 'shell', command: 'make', name: 'Make: build Aether' },
      })
    } else {
      projects.push({
        type: 'cmake',
        label: 'Make: build',
        config: { type: 'shell', command: 'make', name: 'Make: build' },
      })
    }
  }

  // Check for pyproject.toml → python
  const pyprojectContent = await nativeReadTextRelative(workspaceRootPath, 'pyproject.toml').catch(() => null)
  if (pyprojectContent) {
    const nameMatch = pyprojectContent.match(/name\s*=\s*"([^"]+)"/)
    const pyName = nameMatch?.[1] ?? 'app'
    projects.push({
      type: 'python',
      label: `Python: ${pyName}`,
      config: { type: 'python', pythonModule: `${pyName.replace(/-/g, '_')}`, name: `Python: ${pyName}` },
    })
    // Also suggest pip install -e
    projects.push({
      type: 'python',
      label: `pip install -e . (${pyName})`,
      config: { type: 'shell', command: 'pip install -e .[dev]', name: `pip install ${pyName}` },
    })
  }

  // Check for package.json → npm (already handled, but detect project name)
  const pkgContent = await nativeReadTextRelative(workspaceRootPath, 'package.json').catch(() => null)
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent) as Record<string, unknown>
      const scripts = pkg.scripts
      if (scripts && typeof scripts === 'object' && !Array.isArray(scripts)) {
        const scriptNames = Object.keys(scripts as Record<string, unknown>)
        for (const s of scriptNames.slice(0, 8)) {
          projects.push({
            type: 'npm',
            label: `npm run ${s}`,
            config: { type: 'npm', npmScript: s, name: `npm run ${s}` },
          })
        }
      }
    } catch { /* ignore parse errors */ }
  }

  return projects
}

/** Detect .aether files in the workspace for compile-and-run configs */
export async function detectAetherFiles(_workspaceRootPath: string): Promise<string[]> {
  // Directory listing via nativeReadTextRelative is not supported;
  // file discovery relies on the workspace file tree in editorStore.
  return []
}
