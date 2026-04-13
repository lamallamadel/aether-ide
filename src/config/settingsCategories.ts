export type SettingsCategory =
  | 'project'
  | 'theme'
  | 'editor'
  | 'languages'
  | 'servers'
  | 'aiPrivacy'
  | 'environment'
  | 'keybindings'
  | 'workspace'
  | 'extensions'

export interface SettingsCategoryMeta {
  id: SettingsCategory
  label: string
  keywords: string[]
}

export const SETTINGS_CATEGORY_STORAGE_KEY = 'aether:settingsCategory'
export const DEFAULT_SETTINGS_CATEGORY: SettingsCategory = 'editor'

export const SETTINGS_CATEGORIES: SettingsCategoryMeta[] = [
  { id: 'project', label: 'Project', keywords: ['project', 'sdk', 'aether', 'compiler', 'toolchain', 'aethercc', 'runtime'] },
  { id: 'theme', label: 'Theme', keywords: ['theme', 'appearance', 'accent', 'color'] },
  { id: 'editor', label: 'Editor', keywords: ['editor', 'font', 'minimap', 'wrap'] },
  { id: 'languages', label: 'Languages', keywords: ['language', 'aether', 'yaml', 'extensions'] },
  { id: 'servers', label: 'Servers', keywords: ['server', 'lsp', 'endpoint'] },
  { id: 'aiPrivacy', label: 'AI Privacy', keywords: ['ai', 'privacy', 'cloud', 'local', 'egress'] },
  { id: 'environment', label: 'Environment', keywords: ['environment', 'runtime', 'workspace'] },
  { id: 'keybindings', label: 'Keybindings', keywords: ['shortcut', 'keybinding', 'hotkey'] },
  { id: 'workspace', label: 'Workspace', keywords: ['workspace', 'project', 'folder'] },
  { id: 'extensions', label: 'Extensions', keywords: ['extension', 'native', 'runtime'] },
]

export const isSettingsCategory = (value: string): value is SettingsCategory =>
  SETTINGS_CATEGORIES.some((category) => category.id === value)
