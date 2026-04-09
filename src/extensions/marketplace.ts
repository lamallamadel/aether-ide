import type { MarketplaceExtension } from './types'

const INSTALLED_KEY = 'aether:installed-extensions'

export const BUILTIN_CATALOG: MarketplaceExtension[] = [
  {
    id: 'aether.native',
    name: 'Aether Native',
    version: '0.1.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup', 'onLanguage:aether'],
    permissions: ['workspace.read', 'workspace.search'],
    description: 'Core Aether language support with syntax highlighting, completions, and diagnostics.',
    author: 'Aether IDE',
    readme: '# Aether Native\n\nProvides core language intelligence for `.aether` files including syntax highlighting, auto-completion, and inline diagnostics.\n\n## Features\n- Syntax-aware highlighting\n- Symbol outline\n- Mission Control integration',
    downloadCount: 15200,
    rating: 4.8,
    category: 'Languages',
    contributes: {
      commands: [{ id: 'aether.openMissionControl', title: 'Aether: Open Mission Control' }],
      languages: [{ id: 'aether', extensions: ['.aether'] }],
    },
  },
  {
    id: 'yaml.native',
    name: 'YAML Native',
    version: '0.1.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup', 'onLanguage:yaml'],
    permissions: ['workspace.read', 'workspace.search'],
    description: 'YAML language support with validation, schema detection, and formatting.',
    author: 'Aether IDE',
    readme: '# YAML Native\n\nProvides language support for YAML files.\n\n## Features\n- Syntax highlighting\n- Validation\n- Schema auto-detection',
    downloadCount: 12800,
    rating: 4.6,
    category: 'Languages',
    contributes: {
      commands: [{ id: 'yaml.validate.active', title: 'YAML: Validate Active File' }],
      languages: [{ id: 'yaml', extensions: ['.yaml', '.yml'] }],
    },
  },
  {
    id: 'markdown.preview',
    name: 'Markdown Preview',
    version: '0.2.0',
    runtime: 'sandbox',
    trusted: false,
    activationEvents: ['onLanguage:markdown'],
    permissions: ['workspace.read'],
    description: 'Live preview for Markdown files with GitHub-flavored syntax support.',
    author: 'Community',
    readme: '# Markdown Preview\n\nRender Markdown files with live preview side-by-side.\n\n## Features\n- GFM support\n- Mermaid diagrams\n- LaTeX math rendering',
    downloadCount: 8400,
    rating: 4.3,
    category: 'Formatting',
  },
  {
    id: 'git.integration',
    name: 'Git Integration',
    version: '0.3.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup'],
    permissions: ['workspace.read', 'workspace.search'],
    description: 'Git source control integration with diff view, blame, and commit history.',
    author: 'Aether IDE',
    readme: '# Git Integration\n\nFull Git support inside Aether IDE.\n\n## Features\n- Inline diff gutters\n- Branch management\n- Commit history viewer\n- Blame annotations',
    downloadCount: 11200,
    rating: 4.5,
    category: 'Source Control',
  },
  {
    id: 'docker.tools',
    name: 'Docker Tools',
    version: '0.1.0',
    runtime: 'sandbox',
    trusted: false,
    activationEvents: ['onLanguage:dockerfile'],
    permissions: ['workspace.read', 'network'],
    description: 'Dockerfile support with syntax highlighting, linting, and container management.',
    author: 'Community',
    readme: '# Docker Tools\n\nDocker support for Aether IDE.\n\n## Features\n- Dockerfile syntax highlighting\n- Docker Compose support\n- Container management panel',
    downloadCount: 5600,
    rating: 4.1,
    category: 'DevOps',
  },
  {
    id: 'prettier.formatter',
    name: 'Prettier',
    version: '1.0.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup'],
    permissions: ['workspace.read'],
    description: 'Code formatter using Prettier. Supports JavaScript, TypeScript, CSS, and more.',
    author: 'Community',
    readme: '# Prettier\n\nAutomatic code formatting powered by Prettier.\n\n## Supported Languages\n- JavaScript / TypeScript\n- CSS / SCSS\n- HTML\n- JSON\n- Markdown',
    downloadCount: 22000,
    rating: 4.7,
    category: 'Formatting',
  },
  {
    id: 'python.language',
    name: 'Python',
    version: '0.4.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onLanguage:python'],
    permissions: ['workspace.read', 'workspace.search'],
    description: 'Python language support with IntelliSense, linting, and debugging.',
    author: 'Aether IDE',
    readme: '# Python\n\nRich Python language support.\n\n## Features\n- Auto-completion\n- Linting (pylint, flake8)\n- Virtual environment detection\n- Debugging support',
    downloadCount: 18500,
    rating: 4.4,
    category: 'Languages',
  },
  {
    id: 'tailwind.intellisense',
    name: 'Tailwind CSS IntelliSense',
    version: '0.5.0',
    runtime: 'in-process',
    trusted: true,
    activationEvents: ['onStartup'],
    permissions: ['workspace.read'],
    description: 'Intelligent Tailwind CSS class name completion, hover previews, and linting.',
    author: 'Community',
    readme: '# Tailwind CSS IntelliSense\n\nEnhanced Tailwind CSS tooling.\n\n## Features\n- Class name completion\n- Color preview on hover\n- CSS-in-JS support\n- Custom configuration detection',
    downloadCount: 14300,
    rating: 4.6,
    category: 'Styling',
  },
]

export function getInstalledIds(): Set<string> {
  try {
    const raw = localStorage.getItem(INSTALLED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set(['aether.native', 'yaml.native'])
  } catch {
    return new Set(['aether.native', 'yaml.native'])
  }
}

function saveInstalledIds(ids: Set<string>) {
  try {
    localStorage.setItem(INSTALLED_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

export function fetchMarketplace(query?: string): MarketplaceExtension[] {
  const installed = getInstalledIds()
  let results = BUILTIN_CATALOG.map((ext) => ({ ...ext, installed: installed.has(ext.id) }))
  if (query) {
    const q = query.toLowerCase()
    results = results.filter(
      (ext) =>
        ext.name.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q) ||
        ext.id.toLowerCase().includes(q) ||
        ext.author.toLowerCase().includes(q) ||
        ext.category?.toLowerCase().includes(q)
    )
  }
  return results
}

export function installExtension(id: string) {
  const ids = getInstalledIds()
  ids.add(id)
  saveInstalledIds(ids)
}

export function uninstallExtension(id: string) {
  if (id === 'aether.native' || id === 'yaml.native') return
  const ids = getInstalledIds()
  ids.delete(id)
  saveInstalledIds(ids)
}

export function isInstalled(id: string): boolean {
  return getInstalledIds().has(id)
}
