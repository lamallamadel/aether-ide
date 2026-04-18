/**
 * Types for Run/Debug Management system.
 * Inspired by IntelliJ IDEA run configuration architecture.
 */

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

/** Type of run configuration */
export type RunConfigType =
  | 'npm'       // npm run <script>
  | 'node'      // node <file>
  | 'shell'     // shell command
  | 'wsl'       // shell command inside connected WSL distro
  | 'aether'    // compile + run .aether file via aethercc in WSL
  | 'wind'      // aether-wind (cargo-like): build, run, check, test, …
  | 'cmake'     // cmake --build (for aether-lang/core/rt)
  | 'python'    // python3 script or module

/** wind CLI subcommands supported in run configurations */
export type WindSubcommand = 'build' | 'run' | 'check' | 'test' | 'verify' | 'doc' | 'update'

/** Environment variable overrides for a run configuration */
export type EnvVars = Record<string, string>

/** A single run/debug configuration (persistent, stored in .aether/launch.json) */
export interface RunConfiguration {
  id: string
  name: string
  type: RunConfigType
  /** Working directory (absolute or relative to workspace root). Defaults to workspace root. */
  cwd?: string
  /** For type=npm: script name (e.g. "dev", "build", "test") */
  npmScript?: string
  /** For type=node: relative path to entry file */
  nodeFile?: string
  /** For type=shell | wsl: command string */
  command?: string
  /** For type=aether: path to .aether source file (relative to workspace) */
  aetherFile?: string
  /** For type=cmake: build target (default: all) */
  cmakeTarget?: string
  /** For type=cmake: build directory (default: build) */
  cmakeBuildDir?: string
  /** For type=python: module or script path */
  pythonModule?: string
  /** For type=wind: subcommand (default build) */
  windCommand?: WindSubcommand
  /** For type=wind: --release */
  windRelease?: boolean
  /** For type=wind: --verbose */
  windVerbose?: boolean
  /** For type=wind: --bin <name> */
  windBin?: string
  /** For type=wind: --filter <pat> (wind test) */
  windFilter?: string
  /** For type=wind: override --manifest (relative path); else project windManifestPath */
  windManifest?: string
  /** Extra environment variables merged over process.env */
  env?: EnvVars
  /** Arguments appended after the main command */
  args?: string[]
  /** Optional command to run before the main process (e.g. build step) */
  beforeLaunch?: string
  /** Show in toolbar quick-run selector */
  pinned?: boolean
  /** ISO timestamp of last run */
  lastRunAt?: string
}

/** Lifecycle state of a running process */
export type RunInstanceState = 'starting' | 'running' | 'stopping' | 'stopped' | 'error'

/** A live (or recently terminated) execution of a RunConfiguration */
export interface RunInstance {
  id: string
  configId: string
  configName: string
  state: RunInstanceState
  startedAt: string
  finishedAt?: string
  exitCode?: number | null
  /** PTY session id assigned by ptyManager */
  ptyId?: string
  /** Output lines buffer (used when no dedicated xterm panel is open) */
  outputLines: string[]
}

// ---------------------------------------------------------------------------
// Bottom panel tabs
// ---------------------------------------------------------------------------

export type BottomPanelTabKind = 'terminal' | 'run'

/** A tab in the bottom multi-tab panel */
export interface BottomPanelTab {
  id: string
  kind: BottomPanelTabKind
  /** Display label */
  label: string
  /** For kind=run: the RunInstance id */
  instanceId?: string
  /** For kind=terminal: the terminalSessionId */
  terminalSessionId?: number
}

// ---------------------------------------------------------------------------
// launch.json file format
// ---------------------------------------------------------------------------

export type LaunchFileV1 = {
  version: 1
  configurations: RunConfiguration[]
}
