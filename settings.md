# Project Settings & Configuration (settings.md)

This document enumerates **all configuration surfaces currently present in the project** (build-time, tooling, deployment, and runtime UI state) and provides guidance for adding **environment-driven configuration** safely when needed.

Important context: this repository is currently a **frontend-only Vite + React** app. There is **no backend**, and no app-defined environment variables referenced in `src/` at the moment. The project does include a **local browser database** (IndexedDB) for vectors/files metadata, but no external server database. Where the table of contents requires sections like “database configuration” or “API keys”, this file documents the current state and provides recommended placeholders/patterns for future extension.

## Table of contents
- [1. Configuration model](#1-configuration-model)
- [2. Required vs optional settings](#2-required-vs-optional-settings)
- [3. Security-sensitive configurations](#3-security-sensitive-configurations)
- [4. Application settings](#4-application-settings)
  - [4.1 Runtime UI state (Zustand store defaults)](#41-runtime-ui-state-zustand-store-defaults)
  - [4.2 Global Search settings (indexing & performance)](#42-global-search-settings-indexing--performance)
  - [4.3 Mission Control settings](#43-mission-control-settings)
  - [4.4 Tooling & system settings](#44-tooling--system-settings)
  - [4.5 Workspace project metadata (`.aether/`)](#45-workspace-project-metadata-aether)
  - [4.6 Desktop shell (Electron)](#46-desktop-shell-electron)
- [5. Database configurations](#5-database-configurations)
- [6. API keys and secrets](#6-api-keys-and-secrets)
- [7. Logging levels](#7-logging-levels)
- [8. Feature flags](#8-feature-flags)
- [9. Performance tuning parameters](#9-performance-tuning-parameters)
- [10. Deployment-specific settings](#10-deployment-specific-settings)
- [11. Setup instructions](#11-setup-instructions)
  - [11.1 Development](#111-development)
  - [11.2 Staging](#112-staging)
  - [11.3 Production](#113-production)
- [12. Configuration examples](#12-configuration-examples)
  - [12.1 Configuration files](#121-configuration-files)
  - [12.2 Environment variables](#122-environment-variables)
  - [12.3 Programmatic configuration](#123-programmatic-configuration)
- [13. Troubleshooting](#13-troubleshooting)
- [14. Validation checklist](#14-validation-checklist)
- [Appendix: Legacy prototype (not used)](#appendix-legacy-prototype-not-used)

## 1. Configuration model

### Sources & precedence
This project currently supports configuration through:
1) **Code defaults** (runtime UI state and internal constants)
2) **Tooling config files** (`vite.config.ts`, `tailwind.config.ts`, `eslint.config.js`, TypeScript configs)
3) **Deployment platform settings** (e.g. Vercel project settings, rewrites)

There are currently **no** `.env*` files and **no** `import.meta.env` / `process.env` usage in `src/`. If you introduce env-driven configuration later:
- Prefer `import.meta.env` (Vite) for client-side build-time injection.
- Use **only `VITE_`-prefixed variables** for values that are safe to expose to the client bundle.

## 2. Required vs optional settings

### Required settings (current project)
There are no required runtime environment variables for this repository at present.

### Optional settings (current project)
Most “settings” are internal defaults you can adjust by editing code/config files:
- UI state defaults in [editorStore.ts](./src/state/editorStore.ts)
- Search/index tuning in [GlobalSearch.tsx](./src/components/GlobalSearch.tsx) and [indexer.worker.ts](./src/workers/indexer.worker.ts)
- Vitest setup in [vite.config.ts](./vite.config.ts)
- Tailwind scanning in [tailwind.config.ts](./tailwind.config.ts)
- Vercel SPA rewrite in [vercel.json](./vercel.json)

## 3. Security-sensitive configurations

### Current state
- No API keys, no secrets, no server credentials are used in the app today.

### Rules to follow when adding secrets later
- Never commit secrets to Git.
- Do not put secrets in `VITE_*` variables. Anything prefixed with `VITE_` can be bundled into client code.
- If you add a backend, keep secrets server-side and expose only short-lived tokens to the frontend.

## 4. Application settings

### 4.1 Runtime UI state (Zustand store defaults)
Location: [editorStore.ts](./src/state/editorStore.ts)

These values behave like **feature flags and default preferences**. They are internal (code-level) settings.

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `activeFileId` | `string \| null` | `"App.tsx"` | Initially active file tab | Any known `FileNode.id` or `null` | `"readme.md"` |
| `openFiles` | `string[]` | `["App.tsx","main.tsx"]` | Files opened in tabs at start | Array of known `FileNode.id` | `["App.tsx"]` |
| `sidebarVisible` | `boolean` | `true` | Shows/hides file explorer sidebar | `true \| false` | `false` |
| `aiPanelVisible` | `boolean` | `true` | Shows/hides AI chat panel | `true \| false` | `false` |
| `commandPaletteOpen` | `boolean` | `false` | Opens/closes command palette modal | `true \| false` | `true` |
| `globalSearchOpen` | `boolean` | `false` | Opens/closes Global Search modal | `true \| false` | `true` |
| `settingsCategory` | `SettingsCategory` | `'editor'` | Active category in the Settings modal | `theme \| editor \| languages \| servers \| aiPrivacy \| environment \| keybindings \| workspace \| extensions` | `'servers'` |
| `missionControlOpen` | `boolean` | `false` | Opens/closes Mission Control modal | `true \| false` | `true` |
| `worktreeChanges` | `Record<string, Change>` | `{}` | Pending “worktree” changes (Mission Control) | Keys are `fileId` | `{ "App.tsx": {...} }` |
| `lspMode` | `'embedded' \| 'external' \| 'auto'` | `'embedded'` | Runtime mode for Aether LSP | embedded/external/auto | `'auto'` |
| `externalLspEndpoint` | `string` | `""` | HTTP endpoint for external Aether/YAML LSP bridge | URL string | `"http://localhost:3001/lsp"` |
| `runtimeEnvironment` | `RuntimeEnvironment` | `{ mode: "development", ... }` | Resolved runtime defaults loaded from `import.meta.env` | typed object | `{ mode: "staging", ... }` |
| `workspaceEnvironment` | `WorkspaceEnvironment \| null` | `null` | Active workspace-level overrides | typed object or null | `{ workspaceId: "my-project", overrides: { lspMode: "auto" } }` |
| `workspaceEnvironmentStatus` | `'not_loaded' \| 'loading' \| 'ready' \| 'degraded'` | `'not_loaded'` | Workspace environment lifecycle state | enum | `'ready'` |
| `resolvedEnvironment` | `ResolvedEnvironment` | derived | Final environment after priority merge | typed object | `{ aiMode: "local", sourceByField: ... }` |

`Change` structure (stored in `worktreeChanges`):
- `fileId`: `string`
- `originalContent`: `string`
- `proposedContent`: `string`

### Aether editor defaults
- New untitled files are created as `Untitled-<n>.aether`.
- File language resolution defaults to `aether` for extensionless names.
- Files ending in `.aether` are mapped to the Aether language pipeline.

### YAML editor defaults
- Files ending in `.yaml` or `.yml` are mapped to the YAML language pipeline.
- YAML LSP uses the same runtime mode settings (`embedded`, `external`, `auto`) with automatic fallback.

### Runtime + workspace resolution
- Priority order: **workspace overrides > runtime defaults > fallback values**.
- Runtime is loaded from client-safe vars (`VITE_*`) through a centralized loader.
- Workspace environment is built when a project directory is opened and can be reset from Settings.

### Settings navigation model
- Settings modal is organized by categories (Theme, Editor, Languages, Servers, AI Privacy, Environment, Keybindings, Workspace, Extensions).
- `openSettings({ open, category? })` opens/closes the modal and can target a specific category.
- Last selected category is persisted in browser storage under `aether:settingsCategory`.

### Save and Save As behavior (workspace-only)
- `Save` writes to disk only when the active file is linked to a workspace file handle.
- `Save As` creates a real file in the opened workspace from a relative project path (folders are created when needed).
- No download fallback is used for `Save` or `Save As`.
- Without an opened folder/workspace handle, saving is blocked and the user must run **Open Folder** first.

### 4.2 Global Search settings (indexing & performance)
Locations:
- UI + filters: [GlobalSearch.tsx](./src/components/GlobalSearch.tsx)
- Worker indexing/search: [indexer.worker.ts](./src/workers/indexer.worker.ts)
- Index implementation: [tfidfIndex.ts](./src/services/indexing/tfidfIndex.ts)

These settings are currently **internal constants** (changed by code edits). They affect performance on large file sets.

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `search.debounceMs` | `number` | `150` | Debounce delay before issuing a search | `0..2000` | `300` |
| `search.topK` | `number` | `50` | Maximum results returned from TF‑IDF search | `1..500` | `100` |
| `index.maxLinesPerChunk` | `number` | `50` | Chunk size (in lines) for indexing long files | `10..500` | `100` |
| `filters.scope` | `'all' \| 'open'` | `'all'` | Search across all files or only open tabs | `'all' \| 'open'` | `'open'` |
| `filters.types` | `Record<string, boolean>` | `{ts:true,tsx:true,json:true,md:true}` | File extension filters | Any extension keys | `{ ts:true }` |
| `worker.enabled` | `boolean` | `true` (if supported) | Uses Web Worker for indexing/search | `true \| false` | `false` |

Examples:
- To reduce CPU usage on big projects: increase debounce and decrease `topK`.
- To improve relevance on long files: reduce `maxLinesPerChunk` for more granular chunks.

### 4.3 Mission Control settings
Location: [MissionControl.tsx](./src/components/MissionControl.tsx)

Mission Control currently operates on **in-memory mock files** stored in the Zustand tree.

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `worktreeChanges[fileId].originalContent` | `string` | derived | Baseline content for diff | Any string | file contents |
| `worktreeChanges[fileId].proposedContent` | `string` | derived | Suggested updated content | Any string | file contents |

### 4.4 Tooling & system settings
These settings control build, linting, styling, and testing behavior. They are configured in repository-level files.

#### NPM scripts
Location: [package.json](./package.json)

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `scripts.dev` | `string` | `"vite"` | Starts Vite dev server | Any valid npm script command | `"vite --host"` |
| `scripts.build` | `string` | `"tsc -b && vite build"` | Type-check + production build | Any valid npm script command | `"vite build"` |
| `scripts.preview` | `string` | `"vite preview"` | Serves `dist/` locally | Any valid npm script command | `"vite preview --port 4173"` |
| `scripts.test` | `string` | `"vitest run"` | Runs test suite (CI-friendly) | Any valid npm script command | `"vitest run --coverage"` |
| `scripts.lint` | `string` | `"eslint ."` | Runs ESLint | Any valid npm script command | `"eslint src"` |

#### Vite + Vitest
Location: [vite.config.ts](./vite.config.ts)

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `plugins` | `unknown[]` | `[react(), tailwindcss()]` | Build/runtime plugins | Vite plugin array | add more plugins |
| `test.environment` | `string` | `"jsdom"` | Test DOM environment | `jsdom \| node` | `"node"` |
| `test.globals` | `boolean` | `true` | Enables globals like `describe/it/expect` | `true \| false` | `false` |
| `test.setupFiles` | `string[]` | `["./src/test/setup.ts"]` | Test setup entrypoints | file paths | add more files |

#### Tailwind CSS
Location: [tailwind.config.ts](./tailwind.config.ts)

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `content` | `string[]` | `["./index.html","./src/**/*.{ts,tsx}"]` | Files scanned for class names | glob patterns | add `mdx` globs |
| `theme.extend` | `object` | `{}` | Theme overrides/extensions | Tailwind theme object | add colors, spacing |
| `plugins` | `unknown[]` | `[]` | Tailwind plugins | Tailwind plugin array | add forms/typography |

#### ESLint
Location: [eslint.config.js](./eslint.config.js)

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `globalIgnores` | `string[]` | `["dist"]` | Paths ignored by ESLint | globs | add `coverage` |
| `languageOptions.ecmaVersion` | `number` | `2020` | JS syntax level | valid ECMAScript year | `2022` |
| `languageOptions.globals` | `object` | `globals.browser` | Global variables allowed | ESLint globals map | add `node` globals |

### 4.5 Workspace project metadata (`.aether/`)
When a project folder is opened via the File System Access API, the app reads and may create/update a small JSON file at the workspace root:

| Path | Role |
|------|------|
| `.aether/workspace.json` | Persists **workspace-level environment overrides** (`aiMode`, `lspMode`, `externalLspEndpoint`) merged on top of Vite/runtime defaults (see [workspaceProjectConfig.ts](./src/config/workspaceProjectConfig.ts)). |

Details:

- **Format**: `{ "version": 1, "overrides": { ... } }`. Unknown `version` values are rejected on read; invalid override fields are ignored.
- **Write triggers**: changing AI mode, LSP mode, or external LSP endpoint while a folder is open; using **Reset workspace environment** writes empty overrides and restores resolved values from runtime defaults.
- **File tree**: `.aether` is excluded from the recursive workspace scan (same category as `.git` / `node_modules`) so the explorer stays focused on source; the file is still accessed through the directory handle.
- **Runtime `mode`**: `development` / `staging` / `production` remains defined at **build time** (`import.meta.env`); it is not stored in `workspace.json`.
- **Git**: Add `.aether/` to `.gitignore` if overrides must stay machine-local; commit `.aether/workspace.json` if the team should share the same defaults (see comment in [.gitignore](./.gitignore)).

### 4.6 Desktop shell (Electron)
Optional **desktop** build wraps the same Vite UI in Chromium (see [`electron/main.mjs`](./electron/main.mjs)):

| Piece | Role |
|-------|------|
| `npm run desktop:dev` | Dev server + Electron window loading `http://127.0.0.1:5173`. |
| `npm run build:electron` / `npm run desktop:build` | Sets `VITE_DESKTOP=1` so Vite `base` is `./`; packaged app loads `dist/index.html` via `loadFile`. |
| [`electron/preload.mjs`](./electron/preload.mjs) | Exposes `window.aetherDesktop` (`kind`, `platform`, `pickWorkspaceRoot`, `loadWorkspace`, `writeFileRelative`, `readTextRelative`). |
| [`electron/workspaceNative.mjs`](./electron/workspaceNative.mjs) | Main-process helpers: recursive tree (same ignore rules as browser), safe path resolution under workspace root. |
| [`workspaceBackend.ts`](./src/services/fileSystem/workspaceBackend.ts) | Detects `browser` vs `electron` for UI (e.g. Settings → Environment → Host shell). |

Workspace overrides in `.aether/workspace.json` use the same schema in the browser (File System Access handles) and in Electron (native read/write under the opened absolute path). **Open Folder** in Electron prefers the native folder picker and IPC-backed load/save instead of relying on `FileSystemDirectoryHandle` in the renderer.

## 5. Database configurations

### Current state
This project has **no server-side database** and no DB environment variables. It does use a **local IndexedDB layer** in the browser (e.g. `AetherDB` / `VectorStore`) for client-side persistence.

### If you add a backend later (recommended placeholders)
Use server-side env vars (not `VITE_*`):

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `DATABASE_URL` | `string` | none | Database connection string | Provider-specific | `postgres://user:pass@host:5432/db` |
| `DB_POOL_SIZE` | `number` | `10` | Max DB connections | `1..50` | `20` |
| `DB_SSL` | `boolean` | `true` | Enables TLS/SSL to DB | `true \| false` | `true` |

## 6. API keys and secrets

### Current state
No API keys are used. AI features are mocked locally.

### If you add external APIs later
Client-exposed keys (only if safe and intended to be public):

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `VITE_PUBLIC_API_BASE_URL` | `string` | none | Base URL for a public API | URL | `https://api.example.com` |
| `VITE_PUBLIC_SENTRY_DSN` | `string` | none | Frontend error reporting DSN | vendor-specific | `https://...` |

Secrets (must never be shipped to the client bundle):
- Keep them server-side (not in `VITE_*`).
- Rotate regularly and scope permissions.

## 7. Logging levels

### App logging (current state)
No app-level logging configuration exists (no loggers, no log-level switches).

### Tooling logging (optional)
If needed, you can configure Vite logging level in `vite.config.ts`:
- `logLevel`: `'info' | 'warn' | 'error' | 'silent'`

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `vite.logLevel` | `string` | `"info"` | Vite console verbosity | `info \| warn \| error \| silent` | `"warn"` |

## 8. Feature flags

### Current state
Feature gating is implemented via **local UI booleans** in the Zustand store (see [4.1](#41-runtime-ui-state-zustand-store-defaults)).

### Recommended pattern if you need environment-based flags later
Expose only non-sensitive flags to the client:
- `VITE_FEATURE_GLOBAL_SEARCH=true`

## 9. Performance tuning parameters

Primary knobs (see [4.2](#42-global-search-settings-indexing--performance)):
- Debounce delay
- Result `topK`
- Index chunk size (`maxLinesPerChunk`)
- Worker usage

Build-time performance knobs (optional, Vite):
- Use Vite’s default code-splitting and caching
- Ensure `dist/` is clean between builds

## 10. Deployment-specific settings

### Vercel
Location: [vercel.json](./vercel.json)

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `rewrites[0].source` | `string` | `"/(.*)"` | SPA catch-all route | Regex-like path | `"/app/(.*)"` |
| `rewrites[0].destination` | `string` | `"/index.html"` | Route target | File path | `"/index.html"` |

### Build outputs
- Build output folder: `dist/` (Vite default)
- Preview: `npm run preview` serves `dist/`

## 11. Setup instructions

### 11.1 Development
1) Install dependencies
```bash
npm install
```
2) Start dev server
```bash
npm run dev
```
3) Run tests
```bash
npm test
```

### 11.2 Staging
Recommended approach for a frontend-only app:
1) Create a separate deployment target (e.g. a Vercel “Preview” environment).
2) Configure any staging-only non-sensitive settings as `VITE_*` env vars in the platform UI.
3) Build and deploy:
```bash
npm run build
```

### 11.3 Production
1) Configure production environment variables in your deployment platform (Vercel project settings).
2) Build:
```bash
npm run build
```
3) Serve `dist/` with SPA routing (the `vercel.json` rewrite already covers this on Vercel).

## 12. Configuration examples

### 12.1 Configuration files
Vitest configuration lives in [vite.config.ts](./vite.config.ts):

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

### 12.2 Environment variables
Not currently used in this repo, but Vite supports `.env` files and `import.meta.env`.

Example `.env.local`:
```bash
VITE_FEATURE_GLOBAL_SEARCH=true
VITE_SEARCH_TOPK=50
```

Built-in Vite env values available in client code:

| Setting name | Type | Default | Description | Valid values / range | Example |
|---|---|---:|---|---|---|
| `import.meta.env.MODE` | `string` | `"development"` (dev) | Current Vite mode | any mode name | `"production"` |
| `import.meta.env.DEV` | `boolean` | `true` (dev) | True in dev | `true \| false` | `false` |
| `import.meta.env.PROD` | `boolean` | `false` (dev) | True in prod build | `true \| false` | `true` |
| `import.meta.env.BASE_URL` | `string` | `"/"` | Base public path | valid URL path | `"/myapp/"` |

### 12.3 Programmatic configuration
If you decide to centralize config, add a module (example pattern):

```ts
export type AppConfig = {
  featureGlobalSearch: boolean
  searchTopK: number
}
```

export function loadConfig(): AppConfig {
  return {
    featureGlobalSearch: String(import.meta.env.VITE_FEATURE_GLOBAL_SEARCH ?? 'true') === 'true',
    searchTopK: Number(import.meta.env.VITE_SEARCH_TOPK ?? 50),
  }
}
```

## 13. Troubleshooting

### Build fails with “`test` does not exist in type `UserConfigExport`”
Cause: using `defineConfig` from `vite` while also providing a `test` section.
Fix: import `defineConfig` from `vitest/config` (already applied in this repo). See [vite.config.ts](./vite.config.ts).

### Environment variable is undefined in the app
Common causes:
- Variable is not prefixed with `VITE_` (Vite won’t expose it to client code).
- Dev server was not restarted after adding `.env*`.
- Variable is defined only in your shell but not in the environment used by the deployment platform.

### Search feels slow on large file sets
Mitigations:
- Increase debounce (e.g. 300ms)
- Reduce `topK`
- Keep worker enabled (default when supported)

## 14. Validation checklist
- `npm test` passes locally
- `npm run build` succeeds and produces `dist/`
- No secrets committed (scan for tokens/keys before pushing)
- Any `VITE_*` variables are safe to expose publicly
- Deployment includes SPA rewrites (Vercel `vercel.json` or equivalent)

---

## Appendix: Legacy prototype (not used)
The remainder of this file contains an older, prototype-only React implementation that is not imported by the current application. It is kept here for reference.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { 
  Folder, FileCode, FileJson, File, Search, X, 
  Menu, Bot, Settings, Command, ChevronRight, 
  ChevronDown, LayoutTemplate, Play, Terminal, 
  Sparkles, Hash, CornerDownLeft, Split, Maximize2,
  Eye, EyeOff, MessageSquare, ToggleLeft, ToggleRight,
  Monitor, Type, Check
} from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * 1. TYPES & MOCK DATA
 * ------------------------------------------------------------------
 */

// --- 3.1 File Explorer ---

const FileIcon = ({ name, type }: { name: string, type: FileType }) => {
  if (type === 'folder') return <Folder size={16} className="text-blue-400" />;
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode size={16} className="text-cyan-400" />;
  if (name.endsWith('.json')) return <FileJson size={16} className="text-yellow-400" />;
  return <File size={16} className="text-gray-400" />;
};

const FileTreeItem = ({ node, level = 0 }: { node: FileNode, level?: number }) => {
  const { toggleFolder, openFile, activeFileId } = useEditorStore();
  const isActive = activeFileId === node.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      openFile(node.id);
    }
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleClick}
        className={`
          flex items-center py-1 px-2 cursor-pointer text-sm transition-colors duration-100
          ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}
        `}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        <span className="mr-1.5 opacity-70">
          {node.type === 'folder' && (
            node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          )}
          {node.type === 'file' && <span className="w-3" />}
        </span>
        <span className="mr-2"><FileIcon name={node.name} type={node.type} /></span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && node.isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const { files, sidebarVisible } = useEditorStore();
  if (!sidebarVisible) return null;

  return (
    <div className="w-64 h-full bg-[#111111] border-r border-white/5 flex flex-col shrink-0">
      <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-gray-500 uppercase border-b border-white/5">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {files.map(node => <FileTreeItem key={node.id} node={node} />)}
      </div>
    </div>
  );
};

// --- 3.2 Editor Area (Custom Implementation) ---

const SimpleCodeEditor = ({ value }: { value: string }) => {
  const { fontSize } = useEditorStore();
  const lineCount = value.split('\n').length;
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex w-full h-full bg-[#1e1e1e] overflow-hidden">
      <div 
        className="bg-[#1e1e1e] text-gray-600 text-right pr-3 pt-4 font-mono select-none border-r border-white/5"
        style={{ width: `${Math.max(3, lineCount.toString().length) * 0.8}rem`, fontSize: `${fontSize}px`, lineHeight: '1.5em' }}
      >
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <textarea
        className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono p-4 pt-4 resize-none focus:outline-none border-none whitespace-pre"
        value={value}
        readOnly
        spellCheck={false}
        style={{ 
          fontFamily: '"JetBrains Mono", "Fira Code", monospace', 
          fontSize: `${fontSize}px`,
          lineHeight: '1.5em',
          tabSize: 2 
        }}
      />
    </div>
  );
};

const TabSystem = () => {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useEditorStore();

  return (
    <div className="flex h-9 bg-[#0a0a0a] border-b border-white/5 overflow-x-auto no-scrollbar">
      {openFiles.map(fileId => (
        <div 
          key={fileId}
          onClick={() => setActiveFile(fileId)}
          className={`
            group flex items-center px-3 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-white/5 select-none
            ${activeFileId === fileId ? 'bg-[#1e1e1e] text-white border-t-2 border-t-purple-500' : 'text-gray-500 hover:bg-[#151515]'}
          `}
        >
          <span className="mr-2"><FileCode size={12} className={activeFileId === fileId ? 'text-cyan-400' : 'grayscale opacity-50'} /></span>
          <span className="truncate flex-1">{fileId}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); closeFile(fileId); }}
            className={`ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-white/20 ${activeFileId === fileId ? 'opacity-100' : ''}`}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
};

const EditorArea = () => {
  const { activeFileId, getFileContent } = useEditorStore();
  const content = activeFileId ? getFileContent(activeFileId) : '// Select a file to view content';

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] relative overflow-hidden">
      <TabSystem />
      <div className="flex-1 relative overflow-auto custom-scrollbar">
        {activeFileId ? (
          <SimpleCodeEditor value={content} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600">
            <Command size={48} className="mb-4 opacity-20" />
            <p>Press <kbd className="bg-white/10 px-1 rounded text-gray-400">Ctrl+K</kbd> to search files & commands</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 3.3 AI Chat Panel ---

const AIChatPanel = () => {
  const { aiPanelVisible, toggleAiPanel } = useEditorStore();
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: 'Hello! I am Aether AI. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: `Analyzing your code... I suggest reviewing the logic in your current file.` }]);
      setIsTyping(false);
    }, 1000);
  };

  if (!aiPanelVisible) return null;

  return (
    <div className="w-80 h-full bg-[#0c0c0c] border-l border-white/5 flex flex-col shrink-0 transition-all">
      <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Aether AI</span>
        </div>
        <button onClick={toggleAiPanel} className="text-gray-500 hover:text-white">
          <Maximize2 size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-purple-900/20 text-purple-100 border border-purple-500/20' : 'bg-[#1a1a1a] text-gray-300 border border-white/5'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-gray-500 ml-2 animate-pulse">Thinking...</div>}
      </div>
      <div className="p-3 bg-[#111111] border-t border-white/5">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask anything..."
          className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-md p-3 border border-white/5 focus:outline-none resize-none h-20"
        />
      </div>
    </div>
  );
};

// --- 3.4 Command Palette ---

const CommandPalette = () => {
  const { 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    files, 
    openFile, 
    toggleSidebar, 
    toggleAiPanel, 
    toggleSettings,
    sidebarVisible, 
    aiPanelVisible 
  } = useEditorStore();
  
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const systemCommands = [
    { 
      id: 'cmd-sidebar', 
      name: sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar', 
      type: 'command', 
      icon: sidebarVisible ? <EyeOff size={14}/> : <Eye size={14}/>,
      action: () => toggleSidebar() 
    },
    { 
      id: 'cmd-ai', 
      name: aiPanelVisible ? 'Close AI Assistant' : 'Open AI Assistant', 
      type: 'command', 
      icon: <Bot size={14}/>,
      action: () => toggleAiPanel() 
    },
    { 
      id: 'cmd-settings', 
      name: 'Open Settings', 
      type: 'command', 
      icon: <Settings size={14}/>,
      action: () => toggleSettings()
    }
  ];

  const getAllFiles = (nodes: FileNode[]): FileNode[] => {
    let result: FileNode[] = [];
    for (const node of nodes) {
      if (node.type === 'file') result.push(node);
      if (node.children) result = [...result, ...getAllFiles(node.children)];
    }
    return result;
  };

  const fileResults = getAllFiles(files).filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const commandResults = systemCommands.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  
  const combinedResults = [...commandResults, ...fileResults];

  useEffect(() => {
    if (commandPaletteOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [commandPaletteOpen]);

  const handleSelect = (item: any) => {
    if (item.type === 'command') {
      item.action();
    } else {
      openFile(item.id);
    }
    setCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % combinedResults.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + combinedResults.length) % combinedResults.length);
    } else if (e.key === 'Enter') {
      if (combinedResults[selectedIndex]) {
        handleSelect(combinedResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)}>
      <div 
        className="w-[600px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <Search size={18} className="text-gray-500 mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            className="flex-1 bg-transparent text-white text-lg placeholder-gray-600 focus:outline-none"
            placeholder="Type a command or file name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-gray-500 font-mono">ESC</div>
        </div>
        <div className="max-h-[400px] overflow-y-auto py-2 custom-scrollbar">
          {combinedResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No results found for "{search}"</div>
          ) : (
            combinedResults.map((item: any, idx) => (
              <div 
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`
                  flex items-center px-4 py-2 cursor-pointer transition-colors
                  ${idx === selectedIndex ? 'bg-purple-600/20 text-white' : 'text-gray-400 hover:bg-white/5'}
                `}
              >
                <div className="mr-3 opacity-60">
                  {item.type === 'command' ? item.icon : <FileCode size={14} />}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  {item.type !== 'command' && <span className="text-[10px] text-gray-600 truncate">{item.parentId}</span>}
                </div>
                {idx === selectedIndex && <CornerDownLeft size={12} className="text-purple-400 opacity-50" />}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 bg-[#151515] border-t border-white/5 flex justify-between items-center text-[10px] text-gray-600 uppercase tracking-widest font-bold">
          <span>{combinedResults.length} Results</span>
          <div className="flex gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 3.5 Settings Modal ---

const SettingsModal = () => {
  const { 
    settingsVisible, toggleSettings, 
    fontSize, setFontSize, 
    showMinimap, toggleMinimap,
    wordWrap, toggleWordWrap
  } = useEditorStore();

  if (!settingsVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={toggleSettings}>
      <div 
        className="w-[500px] bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#151515]">
          <div className="flex items-center gap-2 font-medium">
            <Settings size={18} className="text-purple-400" />
            <span>Settings</span>
          </div>
          <button onClick={toggleSettings} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Section: Editor */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Editor</h3>
            
            {/* Font Size */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400"><Type size={16} /></div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Font Size</div>
                  <div className="text-xs text-gray-500">Controls the font size in pixels.</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/20 rounded p-1 border border-white/5">
                <button onClick={() => setFontSize(Math.max(10, fontSize - 1))} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm">-</button>
                <span className="w-8 text-center text-sm font-mono">{fontSize}</span>
                <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm">+</button>
              </div>
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between" onClick={toggleMinimap}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400"><Monitor size={16} /></div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Minimap</div>
                  <div className="text-xs text-gray-500">Controls whether the minimap is shown.</div>
                </div>
              </div>
              <button className={`w-10 h-6 rounded-full p-1 transition-colors ${showMinimap ? 'bg-purple-600' : 'bg-white/10'}`}>
                 <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${showMinimap ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

             {/* Word Wrap */}
             <div className="flex items-center justify-between" onClick={toggleWordWrap}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400"><Check size={16} /></div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Word Wrap</div>
                  <div className="text-xs text-gray-500">Wrap lines that exceed viewport width.</div>
                </div>
              </div>
              <button className={`w-10 h-6 rounded-full p-1 transition-colors ${wordWrap ? 'bg-purple-600' : 'bg-white/10'}`}>
                 <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${wordWrap ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          
          <div className="h-px bg-white/5" />

          {/* Section: About */}
          <div className="text-center pt-2">
            <div className="text-xs text-gray-600">Aether Code v0.1.0 (Alpha)</div>
            <div className="text-[10px] text-gray-700 mt-1">Inspired by Cursor & Sublime Text</div>
          </div>

        </div>
      </div>
    </div>
  );
}
```

// --- 3.6 Status Bar ---

const StatusBar = () => {
  const { fontSize } = useEditorStore();
  return (
    <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-xs select-none z-10 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <Split size={12} />
          <span>master*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <X size={12} className="rounded-full bg-white/20 p-0.5" />
          <span>0 errors</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="opacity-80 hover:bg-white/10 px-1 rounded cursor-pointer">Size: {fontSize}px</span>
        <span className="opacity-80 hover:bg-white/10 px-1 rounded cursor-pointer">UTF-8</span>
        <span className="opacity-80 hover:bg-white/10 px-1 rounded cursor-pointer">TypeScript React</span>
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <Bot size={12} />
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
};

/**
 * ------------------------------------------------------------------
 * 4. MAIN LAYOUT
 * ------------------------------------------------------------------
 */

export default function App() {
  const { setCommandPaletteOpen, toggleSidebar, toggleAiPanel, toggleSettings } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        toggleAiPanel();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        toggleSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen, toggleSidebar, toggleAiPanel, toggleSettings]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#111111] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg cursor-pointer"><Menu size={20} /></div>
          <div className="w-6 h-[1px] bg-white/10 my-1"></div>
          <div 
            className="p-2 text-white border-l-2 border-white cursor-pointer"
            onClick={() => {}} // Could trigger File Explorer view
          >
            <File size={20} />
          </div>
          <div 
            className="p-2 text-gray-500 hover:text-white transition-colors cursor-pointer"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search size={20} />
          </div>
          <div 
            className="p-2 text-gray-500 hover:text-white transition-colors cursor-pointer"
            onClick={toggleAiPanel}
          >
            <Bot size={20} />
          </div>
          <div className="flex-1"></div>
          <div 
            className="p-2 text-gray-500 hover:text-white transition-colors cursor-pointer"
            onClick={toggleSettings}
          >
            <Settings size={20} />
          </div>
        </div>

        {/* Sidebar + Editor + AI */}
        <Sidebar />
        <EditorArea />
        <AIChatPanel />
      </div>

      <StatusBar />
      <CommandPalette />
      <SettingsModal />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 5px; border: 2px solid #111; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        ::selection { background: rgba(147, 51, 234, 0.4); color: white; }
        
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation: fadeIn 0.1s ease-out forwards; }
      `}</style>
    </div>
  );
}
