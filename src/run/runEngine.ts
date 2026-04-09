/**
 * Run Engine — translates a RunConfiguration into PTY sessions,
 * manages instance lifecycle, and feeds output to runStore.
 */
import type { RunConfiguration, RunInstance } from './types'
import { useRunStore } from './runStore'

let _instanceCounter = 0

function makeInstanceId(): string {
  return `inst-${Date.now()}-${++_instanceCounter}`
}

function nowIso(): string {
  return new Date().toISOString()
}

// ---------------------------------------------------------------------------
// Resolve the shell command from a RunConfiguration
// ---------------------------------------------------------------------------

interface ResolvedCommand {
  shell?: string
  shellArgs?: string[]
  /** Command injected into the shell */
  cmd: string
  cwd?: string
  env?: Record<string, string>
}

function resolveCommand(config: RunConfiguration, workspaceRoot: string | null): ResolvedCommand {
  const cwd = config.cwd || workspaceRoot || undefined
  const env = config.env ?? {}

  switch (config.type) {
    case 'npm': {
      const script = config.npmScript ?? 'dev'
      const argsStr = config.args?.length ? ` -- ${config.args.join(' ')}` : ''
      return { cmd: `npm run ${script}${argsStr}`, cwd, env }
    }
    case 'node': {
      const file = config.nodeFile ?? 'index.js'
      const argsStr = config.args?.length ? ` ${config.args.join(' ')}` : ''
      return { cmd: `node ${file}${argsStr}`, cwd, env }
    }
    case 'shell': {
      const argsStr = config.args?.length ? ` ${config.args.join(' ')}` : ''
      return { cmd: `${config.command ?? 'echo "no command"'}${argsStr}`, cwd, env }
    }
    case 'wsl': {
      const argsStr = config.args?.length ? ` ${config.args.join(' ')}` : ''
      return {
        shell: 'wsl.exe',
        shellArgs: [],
        cmd: `${config.command ?? 'echo "no command"'}${argsStr}`,
        cwd,
        env,
      }
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
      outputLines: ['[PTY unavailable — Electron required to run processes]'],
    })
    store.appendOutput(instanceId, '[PTY unavailable — Electron required to run processes]\r\n')
    return instanceId
  }

  try {
    const resolved = resolveCommand(config, workspaceRoot)

    // Determine shell and initial command to inject
    let shellExe: string | undefined = resolved.shell
    let shellArgs: string[] = resolved.shellArgs ?? []

    // For WSL configs use wsl.exe; otherwise default shell
    if (config.type === 'wsl') {
      const { useEditorStore } = await import('../state/editorStore')
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
