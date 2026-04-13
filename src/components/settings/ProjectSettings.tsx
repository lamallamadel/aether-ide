/**
 * Project settings panel — configure project identity, type, and Aether SDK paths.
 * Inspired by JetBrains Project Structure / SDK selection.
 */
import { FolderOpen, Cpu, Wrench, RefreshCw, CheckCircle } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../../state/editorStore'
import { SettingRow, ToggleRow, InfoCard } from './primitives'
import type { ProjectType, AetherSdk } from '../../config/projectConfig'
import { DEFAULT_SDK } from '../../config/projectConfig'

const inputCls =
  'w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-[12px] text-gray-200 focus:outline-none focus:border-primary-500/50 placeholder-gray-600 font-mono'

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; description: string }[] = [
  { value: 'aether-app', label: 'Aether Application', description: 'Compile & run .aether source files' },
  { value: 'aether-compiler', label: 'Aether Compiler', description: 'C++/CMake compiler project (LLVM/MLIR)' },
  { value: 'aether-runtime', label: 'Aether Runtime', description: 'C/CMake runtime library' },
  { value: 'node-service', label: 'Node.js Service', description: 'Node.js backend (server, CLI, etc.)' },
  { value: 'python-ml', label: 'Python ML', description: 'Python ML project (inference, training)' },
  { value: 'generic', label: 'Generic', description: 'General-purpose workspace' },
]

function SdkField({
  label,
  hint,
  value,
  defaultValue,
  onChange,
  placeholder,
}: {
  label: string
  hint: string
  value: string
  defaultValue: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const isDefault = value === defaultValue
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</label>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="text-[9px] text-gray-600 hover:text-gray-400 flex items-center gap-0.5"
            title="Reset to default"
          >
            <RefreshCw size={8} /> reset
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-600 -mt-0.5">{hint}</p>
      <input
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? defaultValue}
      />
    </div>
  )
}

export function ProjectSettings() {
  const { projectSettings, setProjectSettings, updateProjectSdk, initProjectIfNeeded, activeWorkspaceId } = useEditorStore(
    useShallow((s) => ({
      projectSettings: s.projectSettings,
      setProjectSettings: s.setProjectSettings,
      updateProjectSdk: s.updateProjectSdk,
      initProjectIfNeeded: s.initProjectIfNeeded,
      activeWorkspaceId: s.activeWorkspaceId,
    }))
  )

  if (!activeWorkspaceId) {
    return (
      <div className="space-y-4">
        <h2 id="settings-panel-project" className="text-lg font-semibold text-gray-200">Project</h2>
        <div className="text-sm text-gray-600 bg-black/20 rounded border border-white/10 p-4">
          Open a workspace folder to configure project settings.
        </div>
      </div>
    )
  }

  if (!projectSettings) {
    return (
      <div className="space-y-4">
        <h2 id="settings-panel-project" className="text-lg font-semibold text-gray-200">Project</h2>
        <div className="text-sm text-gray-600 bg-black/20 rounded border border-white/10 p-4">
          <p className="mb-3">No project configuration found. Initialize a new project?</p>
          <button
            type="button"
            onClick={() => void initProjectIfNeeded()}
            className="px-4 py-2 rounded bg-primary-600/20 border border-primary-500/30 text-primary-300 text-[12px] hover:bg-primary-600/30 transition-colors"
          >
            Initialize Project (.aetheride/project.json)
          </button>
        </div>
      </div>
    )
  }

  const patchProject = (patch: Partial<typeof projectSettings>) => {
    setProjectSettings({ ...projectSettings, ...patch })
  }

  const patchSdk = (patch: Partial<AetherSdk>) => {
    updateProjectSdk(patch)
  }

  const showSdk = projectSettings.type === 'aether-app' || projectSettings.type === 'aether-compiler' || projectSettings.type === 'aether-runtime'

  return (
    <div className="space-y-6">
      <h2 id="settings-panel-project" className="text-lg font-semibold text-gray-200">Project</h2>

      {/* Project identity */}
      <div className="space-y-4">
        <SettingRow
          icon={<FolderOpen size={16} />}
          title="Project Name"
          description="Display name for this project"
        >
          <input
            className={inputCls}
            value={projectSettings.name}
            onChange={(e) => patchProject({ name: e.target.value })}
            placeholder="my-project"
          />
        </SettingRow>

        <SettingRow
          icon={<Cpu size={16} />}
          title="Project Type"
          description="Determines available tooling and run configurations"
        >
          <select
            className={`${inputCls} cursor-pointer`}
            value={projectSettings.type}
            onChange={(e) => patchProject({ type: e.target.value as ProjectType })}
          >
            {PROJECT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </SettingRow>

        <div className="text-[10px] text-gray-600 px-1">
          {PROJECT_TYPE_OPTIONS.find((o) => o.value === projectSettings.type)?.description}
        </div>
      </div>

      {/* SDK Configuration */}
      {showSdk && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <Wrench size={14} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-300">Aether SDK</h3>
          </div>

          <SdkField
            label="Compiler (aethercc)"
            hint="Path to aethercc or aether-compile binary"
            value={projectSettings.sdk.aetherccPath}
            defaultValue={DEFAULT_SDK.aetherccPath}
            onChange={(v) => patchSdk({ aetherccPath: v })}
            placeholder="/home/user/work/aether-core/build/aethercc"
          />

          <SdkField
            label="Runtime Library"
            hint="Directory containing libaether-rt (for linking)"
            value={projectSettings.sdk.runtimeLibPath}
            defaultValue={DEFAULT_SDK.runtimeLibPath}
            onChange={(v) => patchSdk({ runtimeLibPath: v })}
            placeholder="/home/user/work/aether-rt/build"
          />

          <SdkField
            label="Clang / Linker"
            hint="Path to clang for linking Aether object files"
            value={projectSettings.sdk.clangPath}
            defaultValue={DEFAULT_SDK.clangPath}
            onChange={(v) => patchSdk({ clangPath: v })}
          />

          <SdkField
            label="Runtime Include Path"
            hint="Path to aether-rt headers (optional)"
            value={projectSettings.sdk.runtimeIncludePath ?? ''}
            defaultValue={DEFAULT_SDK.runtimeIncludePath ?? ''}
            onChange={(v) => patchSdk({ runtimeIncludePath: v || undefined })}
            placeholder="/home/user/work/aether-rt/include"
          />
        </div>
      )}

      {/* Compile on save */}
      {showSdk && (
        <div className="pt-2">
          <ToggleRow
            icon={<CheckCircle size={16} />}
            title="Compile on Save"
            description="Run aether-compile --check when saving .aether files to get real compiler diagnostics"
            enabled={projectSettings.compileOnSave ?? false}
            onClick={() => patchProject({ compileOnSave: !(projectSettings.compileOnSave ?? false) })}
          />
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <InfoCard title="Config file" value=".aetheride/project.json" />
        <InfoCard title="Project type" value={projectSettings.type} />
      </div>
    </div>
  )
}
