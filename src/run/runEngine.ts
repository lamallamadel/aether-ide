/**
 * Run Engine — translates a RunConfiguration into PTY sessions,
 * manages instance lifecycle, and feeds output to runStore.
 */
import type { RunConfiguration, RunInstance, WindSubcommand } from './types'
import type { AetherProject } from '../config/projectConfig'
import { DEFAULT_WIND_PATH } from '../config/projectConfig'
import { useRunStore } from './runStore'

let _instanceCounter = 0

function makeInstanceId(): string {
  return `inst-${Date.now()}-${++_instanceCounter}`
}

function nowIso(): string {
  return new Date().toISOString()
}

// ---------------------------------------------------------------------------
// Shell escaping — prevents command injection via user-controlled fields
// ---------------------------------------------------------------------------

function shellEscape(s: string): string {
  if (/^[a-zA-Z0-9_.\/~$:=-]+$/.test(s)) return s
  return `'${s.replace(/'/g, "'\\''")}'`
}

function escapeArgs(args: string[] | undefined): string {
  if (!args?.length) return ''
  return ' ' + args.map(shellEscape).join(' ')
}

// ---------------------------------------------------------------------------
// Resolve the shell command from a RunConfiguration
// ---------------------------------------------------------------------------

interface ResolvedCommand {
  shell?: string
  shellArgs?: string[]
  cmd: string
  cwd?: string
  env?: Record<string, string>
}

/** Exported for unit tests (wind / aether command resolution). */
export function resolveCommand(config: RunConfiguration, workspaceRoot: string | null, project: AetherProject | null): ResolvedCommand {
  const cwd = config.cwd || workspaceRoot || undefined
  const env = config.env ?? {}
  const sdk = project?.sdk ?? null

  switch (config.type) {
    case 'npm': {
      const script = shellEscape(config.npmScript ?? 'dev')
      const argsStr = config.args?.length ? ` -- ${escapeArgs(config.args).trim()}` : ''
      return { cmd: `npm run ${script}${argsStr}`, cwd, env }
    }
    case 'node': {
      const file = shellEscape(config.nodeFile ?? 'index.js')
      return { cmd: `node ${file}${escapeArgs(config.args)}`, cwd, env }
    }
    case 'shell': {
      return { cmd: `${config.command ?? 'echo "no command"'}${escapeArgs(config.args)}`, cwd, env }
    }
    case 'wsl': {
      return {
        shell: 'wsl.exe',
        shellArgs: [],
        cmd: `${config.command ?? 'echo "no command"'}${escapeArgs(config.args)}`,
        cwd,
        env,
      }
    }
    case 'aether': {
      const file = shellEscape(config.aetherFile ?? 'main.aether')
      const baseName = shellEscape(
        (config.aetherFile ?? 'main.aether').replace(/\.aether$/, '').split('/').pop() ?? 'aether_main'
      )
      const compiler = shellEscape(sdk?.aetherccPath || 'aethercc')
      const rtLib = shellEscape(sdk?.runtimeLibPath || '$HOME/work/aether-rt/build')
      const linker = shellEscape(sdk?.clangPath || 'clang')
      const compileAndRun = [
        `${compiler} ${file} --emit-obj -o build/${baseName}.o`,
        `${linker} build/${baseName}.o -L${rtLib} -laether-rt -o build/${baseName}`,
        `./build/${baseName}${escapeArgs(config.args)}`,
      ].join(' && ')
      return { shell: 'wsl.exe', shellArgs: [], cmd: `mkdir -p build && ${compileAndRun}`, cwd, env }
    }
    case 'wind': {
      const windExe = shellEscape((project?.windPath?.trim() || DEFAULT_WIND_PATH).trim() || DEFAULT_WIND_PATH)
      const parts: string[] = [windExe]
      if (config.windRelease) parts.push('--release')
      if (config.windVerbose) parts.push('--verbose')
      const manifest = (config.windManifest?.trim() || project?.windManifestPath?.trim()) ?? ''
      if (manifest) {
        parts.push('--manifest')
        parts.push(shellEscape(manifest))
      }
      if (config.windBin?.trim()) {
        parts.push('--bin')
        parts.push(shellEscape(config.windBin.trim()))
      }
      if (config.windFilter?.trim() && config.windCommand === 'test') {
        parts.push('--filter')
        parts.push(shellEscape(config.windFilter.trim()))
      }
      const sub = config.windCommand ?? 'build'
      parts.push(sub)
      if (sub === 'run' && config.args?.length) {
        parts.push('--')
        for (const a of config.args) parts.push(shellEscape(a))
      } else if (config.args?.length) {
        for (const a of config.args) parts.push(shellEscape(a))
      }
      return { shell: 'wsl.exe', shellArgs: [], cmd: parts.join(' '), cwd, env }
    }
    case 'cmake': {
      const buildDir = shellEscape(config.cmakeBuildDir ?? 'build')
      const target = config.cmakeTarget ? ` --target ${shellEscape(config.cmakeTarget)}` : ''
      return { cmd: `cmake --build ${buildDir}${target}${escapeArgs(config.args)}`, cwd, env }
    }
    case 'python': {
      const module = config.pythonModule ?? 'main.py'
      const argsStr = config.args?.length ? ` ${config.args.join(' ')}` : ''
      return { cmd: `python3 ${module}${argsStr}`, cwd, env }
    }
    default:
      return { cmd: 'echo "unknown config type"', cwd, env }
  }
}

// ---------------------------------------------------------------------------
// PTY bridge
// ---------------------------------------------------------------------------

function getPty() {
  if (typeof window !== 'undefined' && window.aetherDesktop?.pty) {
    return window.aetherDesktop.pty
  }
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Launch a configuration. Returns the created RunInstance id.
 * Runs the optional `beforeLaunch` command synchronously (via echo) before the main process.
 */
export async function launchConfig(
  config: RunConfiguration,
  workspaceRoot: string | null
): Promise<string> {
  const store = useRunStore.getState()
  const instanceId = makeInstanceId()

  const instance: RunInstance = {
    id: instanceId,
    configId: config.id,
    configName: config.name,
    state: 'starting',
    startedAt: nowIso(),
    outputLines: [],
  }

  store.addInstance(instance)
  store.ensureRunTab(instance)

  // Update lastRunAt on the configuration
  store.updateConfig(config.id, { lastRunAt: nowIso() })

  const pty = getPty()
  if (!pty) {
    store.updateInstance(instanceId, {
      state: 'error',
      finishedAt: nowIso(),
    })
    store.appendOutput(instanceId, '[PTY unavailable — Electron required to run processes]\r\n')
    return instanceId
  }

  try {
    // Read SDK from project settings for Aether configs
    const { useEditorStore } = await import('../state/editorStore')
    const projectSettings = useEditorStore.getState().projectSettings ?? null
    const resolved = resolveCommand(config, workspaceRoot, projectSettings)

    // Determine shell and initial command to inject
    let shellExe: string | undefined = resolved.shell
    let shellArgs: string[] = resolved.shellArgs ?? []

    // For WSL and aether configs, attach the connected distro
    if (config.type === 'wsl' || config.type === 'aether' || config.type === 'wind') {
      const conn = useEditorStore.getState().remoteConnection
      if (conn?.type === 'wsl' && conn.distro) {
        shellExe = 'wsl.exe'
        shellArgs = ['-d', conn.distro]
      }
    }

    const ptyId = await pty.create({
      shell: shellExe,
      args: shellArgs,
      cwd: resolved.cwd,
      env: { ...resolved.env, TERM: 'xterm-256color' },
    })

    store.updateInstance(instanceId, { ptyId, state: 'running' })

    // Subscribe to output
    const unsubData = pty.onData(ptyId, (data: string) => {
      store.appendOutput(instanceId, data)
    })

    const unsubExit = pty.onExit(ptyId, (code: number) => {
      store.updateInstance(instanceId, {
        state: code === 0 ? 'stopped' : 'error',
        exitCode: code,
        finishedAt: nowIso(),
      })
      unsubData?.()
      unsubExit?.()
    })

    // Run beforeLaunch then the real command
    if (config.beforeLaunch) {
      pty.write(ptyId, `${config.beforeLaunch}\n`)
    }
    pty.write(ptyId, `${resolved.cmd}\n`)

    return instanceId
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    store.updateInstance(instanceId, {
      state: 'error',
      finishedAt: nowIso(),
      outputLines: [`[Launch failed: ${msg}]`],
    })
    return instanceId
  }
}

/**
 * Stop a running instance gracefully (kills the underlying PTY).
 */
export function stopInstance(instanceId: string): void {
  const store = useRunStore.getState()
  const instance = store.instances[instanceId]
  if (!instance || !instance.ptyId) return

  const pty = getPty()
  if (pty) {
    try {
      pty.kill(instance.ptyId)
    } catch {
      // ignore already-exited
    }
  }

  store.updateInstance(instanceId, {
    state: 'stopped',
    finishedAt: nowIso(),
  })
}

/**
 * Re-launch an existing instance (stop if still running, then start fresh).
 */
export async function restartInstance(instanceId: string): Promise<string> {
  const store = useRunStore.getState()
  const instance = store.instances[instanceId]
  if (!instance) return instanceId

  if (instance.state === 'running' || instance.state === 'starting') {
    stopInstance(instanceId)
  }

  const config = store.configurations.find((c) => c.id === instance.configId)
  if (!config) return instanceId

  const { useEditorStore } = await import('../state/editorStore')
  const workspaceRoot = useEditorStore.getState().workspaceRootPath
  return launchConfig(config, workspaceRoot)
}

/**
 * Launch the currently selected configuration.
 */
export async function launchSelected(): Promise<string | null> {
  const store = useRunStore.getState()
  const configId = store.selectedConfigId
  if (!configId) return null

  const config = store.configurations.find((c) => c.id === configId)
  if (!config) return null

  const { useEditorStore } = await import('../state/editorStore')
  const workspaceRoot = useEditorStore.getState().workspaceRootPath
  return launchConfig(config, workspaceRoot)
}

/**
 * Launch the currently active .aether file (compile + run).
 * Creates a temporary configuration without persisting it.
 */
export async function launchActiveFile(): Promise<string | null> {
  const { useEditorStore } = await import('../state/editorStore')
  const { activeFileId, workspaceRootPath, workspaceHasWindToml } = useEditorStore.getState()
  if (!activeFileId || !activeFileId.endsWith('.aether')) return null

  if (workspaceHasWindToml) {
    return launchWindQuick('run')
  }

  const baseName = activeFileId.replace(/\.aether$/, '').split('/').pop() ?? 'main'
  const tempConfig: RunConfiguration = {
    id: `temp-${Date.now()}`,
    name: `Run: ${baseName}.aether`,
    type: 'aether',
    aetherFile: activeFileId,
  }

  return launchConfig(tempConfig, workspaceRootPath)
}

/** One-shot `wind <command>` using project wind settings (Wind.toml workspace). */
export async function launchWindQuick(command: WindSubcommand): Promise<string | null> {
  const { useEditorStore } = await import('../state/editorStore')
  const { workspaceRootPath } = useEditorStore.getState()
  const tempConfig: RunConfiguration = {
    id: `temp-wind-${Date.now()}`,
    name: `Wind: ${command}`,
    type: 'wind',
    windCommand: command,
  }
  return launchConfig(tempConfig, workspaceRootPath)
}
