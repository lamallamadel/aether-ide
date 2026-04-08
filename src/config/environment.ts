export type RuntimeEnvironmentName = 'development' | 'staging' | 'production'
export type EnvironmentValueSource = 'runtime' | 'workspace' | 'fallback'
export type WorkspaceEnvironmentStatus = 'not_loaded' | 'loading' | 'ready' | 'degraded'
export type LspMode = 'embedded' | 'external' | 'wsl' | 'auto'
export type AiMode = 'cloud' | 'local'

export type RuntimeEnvironment = {
  mode: RuntimeEnvironmentName
  aiMode: AiMode
  lspMode: LspMode
  externalLspEndpoint: string
}

export type WorkspaceEnvironment = {
  workspaceId: string
  overrides: Partial<Pick<RuntimeEnvironment, 'aiMode' | 'lspMode' | 'externalLspEndpoint'>>
}

export type ResolvedEnvironment = RuntimeEnvironment & {
  sourceByField: {
    aiMode: EnvironmentValueSource
    lspMode: EnvironmentValueSource
    externalLspEndpoint: EnvironmentValueSource
  }
}

const parseMode = (value: string | undefined): RuntimeEnvironmentName => {
  if (value === 'production' || value === 'staging' || value === 'development') return value
  return 'development'
}

const parseAiMode = (value: string | undefined): AiMode => (value === 'local' ? 'local' : 'cloud')
const parseLspMode = (value: string | undefined): LspMode =>
  value === 'external' || value === 'auto' || value === 'embedded' || value === 'wsl' ? value : 'embedded'

export const loadRuntimeEnvironment = (): RuntimeEnvironment => ({
  mode: parseMode(import.meta.env.MODE),
  aiMode: parseAiMode(import.meta.env.VITE_AI_MODE),
  lspMode: parseLspMode(import.meta.env.VITE_LSP_MODE),
  externalLspEndpoint: typeof import.meta.env.VITE_EXTERNAL_LSP_ENDPOINT === 'string' ? import.meta.env.VITE_EXTERNAL_LSP_ENDPOINT : '',
})

export const resolveEnvironment = (
  runtimeEnv: RuntimeEnvironment,
  workspaceEnv: WorkspaceEnvironment | null
): ResolvedEnvironment => {
  const overrides = workspaceEnv?.overrides ?? {}
  const aiMode = overrides.aiMode ?? runtimeEnv.aiMode
  const lspMode = overrides.lspMode ?? runtimeEnv.lspMode
  const externalLspEndpoint = overrides.externalLspEndpoint ?? runtimeEnv.externalLspEndpoint

  return {
    mode: runtimeEnv.mode,
    aiMode,
    lspMode,
    externalLspEndpoint,
    sourceByField: {
      aiMode: overrides.aiMode ? 'workspace' : runtimeEnv.aiMode ? 'runtime' : 'fallback',
      lspMode: overrides.lspMode ? 'workspace' : runtimeEnv.lspMode ? 'runtime' : 'fallback',
      externalLspEndpoint: overrides.externalLspEndpoint ? 'workspace' : runtimeEnv.externalLspEndpoint ? 'runtime' : 'fallback',
    },
  }
}
