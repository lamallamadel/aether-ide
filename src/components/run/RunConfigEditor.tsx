/**
 * Full-page run configuration editor.
 * Opened as a special tab (__run_config__:<configId>).
 */
import { useState, useEffect } from 'react'
import { Play, Trash2, Save } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useRunStore } from '../../run/runStore'
import { launchConfig } from '../../run/runEngine'
import { useEditorStore } from '../../state/editorStore'
import type { RunConfiguration, RunConfigType, WindSubcommand } from '../../run/types'

const WIND_COMMANDS: WindSubcommand[] = ['build', 'run', 'check', 'test', 'verify', 'doc', 'update']

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</label>
      {hint && <p className="text-[10px] text-gray-600 -mt-0.5">{hint}</p>}
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-[12px] text-gray-200 focus:outline-none focus:border-primary-500/50 focus:bg-white/8 placeholder-gray-600'


// ---------------------------------------------------------------------------
// Type-specific fields
// ---------------------------------------------------------------------------

function NpmFields({
  config,
  onChange,
}: {
  config: RunConfiguration
  onChange: (patch: Partial<RunConfiguration>) => void
}) {
  return (
    <Field label="npm script" hint="Script name from package.json (e.g. dev, build, test)">
      <input
        className={inputCls}
        value={config.npmScript ?? ''}
        onChange={(e) => onChange({ npmScript: e.target.value })}
        placeholder="dev"
      />
    </Field>
  )
}

function NodeFields({
  config,
  onChange,
}: {
  config: RunConfiguration
  onChange: (patch: Partial<RunConfiguration>) => void
}) {
  return (
    <Field label="Entry file" hint="Path relative to workspace root (e.g. src/index.js)">
      <input
        className={inputCls}
        value={config.nodeFile ?? ''}
        onChange={(e) => onChange({ nodeFile: e.target.value })}
        placeholder="src/index.js"
      />
    </Field>
  )
}

function ShellFields({
  config,
  onChange,
}: {
  config: RunConfiguration
  onChange: (patch: Partial<RunConfiguration>) => void
}) {
  return (
    <Field label="Command" hint="Shell command to execute">
      <input
        className={inputCls}
        value={config.command ?? ''}
        onChange={(e) => onChange({ command: e.target.value })}
        placeholder="echo hello"
      />
    </Field>
  )
}

function AetherFields({
  config,
  onChange,
}: {
  config: RunConfiguration
  onChange: (patch: Partial<RunConfiguration>) => void
}) {
  return (
    <>
      <Field label="Aether source file" hint="Path to .aether file relative to workspace root">
        <input
          className={inputCls}
          value={config.aetherFile ?? ''}
          onChange={(e) => onChange({ aetherFile: e.target.value })}
          placeholder="main.aether"
        />
      </Field>
      <div className="px-3 py-2 bg-white/3 rounded border border-white/5 text-[10px] text-gray-600 leading-relaxed">
        Compiles via <span className="text-purple-400 font-mono">aethercc</span> in WSL, links with
        <span className="text-cyan-400 font-mono"> libaether-rt</span>, then executes the binary.
      </div>
    </>
  )
}

function WindFields({
  config,
  onChange,
}: {
  config: RunConfiguration
  onChange: (patch: Partial<RunConfiguration>) => void
}) {
  return (
    <>
      <Field label="wind subcommand" hint="Same as cargo: build, run, check, test, …">
        <select
          className={inputCls}
          value={config.windCommand ?? 'build'}
          onChange={(e) => onChange({ windCommand: e.target.value as WindSubcommand })}
        >
          {WIND_COMMANDS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={config.windRelease ?? false}
            onChange={(e) => onChange({ windRelease: e.target.checked })}
            className="accent-primary-500"
          />
          --release
        </label>
        <label className="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={config.windVerbose ?? false}
            onChange={(e) => onChange({ windVerbose: e.target.checked })}
            className="accent-primary-500"
          />
          --verbose
        </label>
      </div>
      <Field label="--bin" hint="[[bin]] target name (optional)">
        <input
          className={inputCls}
          value={config.windBin ?? ''}
          onChange={(e) => onChange({ windBin: e.target.value || undefined })}
          placeholder="my_agent"
        />
      </Field>
      <Field label="--filter" hint="For wind test: substring filter">
        <input
          className={inputCls}
          value={config.windFilter ?? ''}
          onChange={(e) => onChange({ windFilter: e.target.value || undefined })}
          placeholder="smoke"
        />
      </Field>
      <Field
        label="--manifest"
        hint="Relative Wind.toml if not using project default (overrides .aetheride/project.json windManifestPath)"
      >
        <input
          className={inputCls}
          value={config.windManifest ?? ''}
          onChange={(e) => onChange({ windManifest: e.target.value || undefined })}
          placeholder="Wind.toml"
        />
      </Field>
      <div className="px-3 py-2 bg-white/3 rounded border border-white/5 text-[10px] text-gray-600 leading-relaxed">
        Runs <span className="text-sky-400 font-mono">wind</span> in WSL (see Project settings for executable path). For{' '}
        <span className="font-mono">run</span>, use Arguments as program args after <span className="font-mono">--</span>.
      </div>
    </>
  )
}

function CmakeFields({
  config,
  onChange,
}: {
  config: RunConfiguration
  onChange: (patch: Partial<RunConfiguration>) => void
}) {
  return (
    <>
      <Field label="Build directory" hint="Path to cmake build directory (default: build)">
        <input
          className={inputCls}
          value={config.cmakeBuildDir ?? ''}
          onChange={(e) => onChange({ cmakeBuildDir: e.target.value || undefined })}
          placeholder="build"
        />
      </Field>
      <Field label="Target" hint="CMake target to build (leave blank for all)">
        <input
          className={inputCls}
          value={config.cmakeTarget ?? ''}
          onChange={(e) => onChange({ cmakeTarget: e.target.value || undefined })}
          placeholder="all"
        />
      </Field>
    </>
  )
}

function PythonFields({
  config,
  onChange,
}: {
  config: RunConfiguration
  onChange: (patch: Partial<RunConfiguration>) => void
}) {
  return (
    <Field label="Module or script" hint="Python module (-m) or script path (e.g. main.py, -m uvicorn app:main)">
      <input
        className={inputCls}
        value={config.pythonModule ?? ''}
        onChange={(e) => onChange({ pythonModule: e.target.value })}
        placeholder="main.py"
      />
    </Field>
  )
}

// ---------------------------------------------------------------------------
// Env editor
// ---------------------------------------------------------------------------

function EnvEditor({
  env,
  onChange,
}: {
  env: Record<string, string>
  onChange: (env: Record<string, string>) => void
}) {
  const entries = Object.entries(env)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const remove = (key: string) => {
    const next = { ...env }
    delete next[key]
    onChange(next)
  }

  const add = () => {
    if (!newKey.trim()) return
    onChange({ ...env, [newKey.trim()]: newVal })
    setNewKey('')
    setNewVal('')
  }

  return (
    <div className="flex flex-col gap-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={k}
            readOnly
          />
          <span className="text-gray-600">=</span>
          <input
            className={`${inputCls} flex-1`}
            value={v}
            onChange={(e) => onChange({ ...env, [k]: e.target.value })}
          />
          <button
            type="button"
            onClick={() => remove(k)}
            className="p-1 text-gray-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <input
          className={`${inputCls} flex-1`}
          placeholder="KEY"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        />
        <span className="text-gray-600">=</span>
        <input
          className={`${inputCls} flex-1`}
          placeholder="value"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        />
        <button
          type="button"
          onClick={add}
          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-gray-400 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

interface Props {
  configId: string
}

export function RunConfigEditor({ configId }: Props) {
  const { configurations, updateConfig, removeConfig } = useRunStore(
    useShallow((s) => ({
      configurations: s.configurations,
      updateConfig: s.updateConfig,
      removeConfig: s.removeConfig,
    }))
  )

  const { workspaceRootPath, closeFile } = useEditorStore(
    useShallow((s) => ({
      workspaceRootPath: s.workspaceRootPath,
      closeFile: s.closeFile,
    }))
  )

  const saved = configurations.find((c) => c.id === configId) ?? null
  const [draft, setDraft] = useState<RunConfiguration | null>(saved)
  const [dirty, setDirty] = useState(false)
  const [saved_, setSaved_] = useState(false)

  // Reset draft when switching to a different config
  useEffect(() => {
    setDraft(saved)
    setDirty(false)
    setSaved_(false)
  }, [configId])

  // Sync when the store changes externally (e.g. initial load)
  useEffect(() => {
    if (!dirty) setDraft(saved)
  }, [saved, dirty])

  if (!draft) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Configuration not found.
      </div>
    )
  }

  const patch = (p: Partial<RunConfiguration>) => {
    setDraft((prev) => prev ? { ...prev, ...p } : prev)
    setDirty(true)
    setSaved_(false)
  }

  const handleSave = () => {
    if (!draft) return
    updateConfig(configId, draft)
    setDirty(false)
    setSaved_(true)
    setTimeout(() => setSaved_(false), 2000)
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${draft.name}"?`)) {
      removeConfig(configId)
      closeFile(`__run_config__:${configId}`)
    }
  }

  const handleRun = () => {
    if (dirty) handleSave()
    void launchConfig(draft, workspaceRootPath)
  }

  const TYPE_OPTIONS: { value: RunConfigType; label: string }[] = [
    { value: 'aether', label: 'Aether (.aether)' },
    { value: 'wind', label: 'wind (Wind.toml)' },
    { value: 'cmake', label: 'CMake build' },
    { value: 'python', label: 'Python' },
    { value: 'npm', label: 'npm run' },
    { value: 'node', label: 'Node.js' },
    { value: 'shell', label: 'Shell command' },
    { value: 'wsl', label: 'WSL command' },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 shrink-0 bg-[#111]">
        <div className="flex-1 min-w-0">
          <input
            className="w-full bg-transparent text-lg font-semibold text-white focus:outline-none border-b border-transparent focus:border-white/20 pb-0.5"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Configuration name"
          />
          <div className="text-[11px] text-gray-600 mt-0.5">Run / Debug Configuration</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <span className="text-[10px] text-yellow-400 uppercase tracking-wider">Unsaved</span>
          )}
          {saved_ && (
            <span className="text-[10px] text-green-400 uppercase tracking-wider">Saved</span>
          )}
          <button
            type="button"
            title="Delete configuration"
            onClick={handleDelete}
            className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-[12px] text-gray-300 hover:bg-white/10 transition-colors"
          >
            <Save size={12} />
            Save
          </button>
          <button
            type="button"
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-600/20 border border-green-500/20 text-[12px] text-green-300 hover:bg-green-600/30 transition-colors"
          >
            <Play size={12} />
            Run
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 max-w-2xl">
        {/* Type */}
        <Field label="Configuration type">
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => patch({ type: opt.value })}
                className={`px-3 py-1.5 rounded border text-[11px] transition-colors ${
                  draft.type === opt.value
                    ? 'border-primary-500/50 bg-primary-500/10 text-primary-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Type-specific fields */}
        {draft.type === 'aether' && <AetherFields config={draft} onChange={patch} />}
        {draft.type === 'wind' && <WindFields config={draft} onChange={patch} />}
        {draft.type === 'cmake' && <CmakeFields config={draft} onChange={patch} />}
        {draft.type === 'python' && <PythonFields config={draft} onChange={patch} />}
        {draft.type === 'npm' && <NpmFields config={draft} onChange={patch} />}
        {draft.type === 'node' && <NodeFields config={draft} onChange={patch} />}
        {(draft.type === 'shell' || draft.type === 'wsl') && <ShellFields config={draft} onChange={patch} />}

        {/* Working directory */}
        <Field label="Working directory" hint="Leave blank to use workspace root">
          <input
            className={inputCls}
            value={draft.cwd ?? ''}
            onChange={(e) => patch({ cwd: e.target.value || undefined })}
            placeholder={workspaceRootPath ?? 'workspace root'}
          />
        </Field>

        {/* Arguments */}
        <Field
          label="Arguments"
          hint={
            draft.type === 'wind' && draft.windCommand === 'run'
              ? 'Program arguments after wind run … -- (one token per word when split on spaces)'
              : draft.type === 'wind'
              ? 'Extra tokens after the wind subcommand'
              : 'Extra args appended after the command, space-separated'
          }
        >
          <input
            className={inputCls}
            value={draft.args?.join(' ') ?? ''}
            onChange={(e) =>
              patch({ args: e.target.value.trim() ? e.target.value.trim().split(/\s+/) : undefined })
            }
            placeholder={draft.type === 'wind' && draft.windCommand === 'run' ? 'arg1 arg2' : '--flag value'}
          />
        </Field>

        {/* Before launch */}
        <Field label="Before launch" hint="Optional command to run before starting the main process">
          <input
            className={inputCls}
            value={draft.beforeLaunch ?? ''}
            onChange={(e) => patch({ beforeLaunch: e.target.value || undefined })}
            placeholder="npm run build"
          />
        </Field>

        {/* Environment variables */}
        <Field label="Environment variables">
          <EnvEditor
            env={draft.env ?? {}}
            onChange={(env) => patch({ env: Object.keys(env).length ? env : undefined })}
          />
        </Field>

        {/* Pinned */}
        <div className="flex items-center gap-3">
          <input
            id="pin-config"
            type="checkbox"
            checked={draft.pinned ?? false}
            onChange={(e) => patch({ pinned: e.target.checked })}
            className="accent-primary-500 w-3.5 h-3.5 cursor-pointer"
          />
          <label htmlFor="pin-config" className="text-[12px] text-gray-400 cursor-pointer">
            Show in toolbar quick-select
          </label>
        </div>
      </div>
    </div>
  )
}
