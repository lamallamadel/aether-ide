/**
 * WSL file system backend — reads/writes files inside a WSL distribution
 * via the `\\wsl$\<distro>\...` UNC path (accessible from Windows host).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { ipcMain } from 'electron'

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.aether', 'dist', 'build',
  '.next', '.nuxt', '__pycache__', '.venv', 'venv',
])

const MAX_FILES = 500
const MAX_DEPTH = 8
const MAX_FILE_SIZE = 256 * 1024

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.gz', '.tar', '.7z', '.rar', '.bz2',
  '.exe', '.dll', '.so', '.dylib', '.o', '.a',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
  '.wasm', '.pyc', '.class',
])

function getLanguageFromExtension(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.tsx')) return 'typescript'
  if (lower.endsWith('.ts') || lower.endsWith('.mts') || lower.endsWith('.cts')) return 'typescript'
  if (lower.endsWith('.jsx') || lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'javascript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'markdown'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.py')) return 'python'
  if (lower.endsWith('.rs')) return 'rust'
  if (lower.endsWith('.go')) return 'go'
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml'
  return undefined
}

/**
 * Convert a WSL linux path to a Windows UNC path.
 * E.g. `toUncPath('Ubuntu', '/home/user/proj')` → `\\wsl$\Ubuntu\home\user\proj`
 */
export function toUncPath(distro, linuxPath) {
  if (!linuxPath.startsWith('/')) throw new Error(`WSL path must be absolute (got "${linuxPath}")`)
  const normalized = linuxPath.replace(/\//g, '\\')
  return `\\\\wsl$\\${distro}${normalized}`
}

function isPathInsideRoot(root, target) {
  const rel = path.relative(root, target)
  if (rel === '') return true
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

function resolveSafe(uncRoot, relativePosix) {
  const rel = String(relativePosix).replace(/\\/g, '/')
  if (!rel || rel.includes('..')) throw new Error('Invalid path')
  const full = path.join(uncRoot, ...rel.split('/').filter(Boolean))
  const resolved = path.resolve(full)
  if (!isPathInsideRoot(path.resolve(uncRoot), resolved)) throw new Error('Path outside workspace')
  return resolved
}

export async function readWorkspaceTreeWsl(distro, linuxPath) {
  const uncRoot = toUncPath(distro, linuxPath)
  let st
  try {
    st = await fs.stat(uncRoot)
  } catch {
    throw new Error(`Cannot access WSL directory: ${linuxPath} (UNC: ${uncRoot})`)
  }
  if (!st.isDirectory()) throw new Error('Not a directory')

  const rootName = path.basename(linuxPath) || distro
  let fileCount = 0

  async function walk(dirAbs, pathPrefix, depth) {
    if (depth > MAX_DEPTH || fileCount >= MAX_FILES) return []
    let entries
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true })
    } catch {
      return []
    }
    const children = []
    for (const ent of entries) {
      if (fileCount >= MAX_FILES) break
      const name = ent.name
      if (ent.isDirectory()) {
        if (EXCLUDED_DIRS.has(name)) continue
        const folderPath = pathPrefix ? `${pathPrefix}/${name}` : name
        const sub = await walk(path.join(dirAbs, name), folderPath, depth + 1)
        children.push({
          id: folderPath,
          name,
          type: 'folder',
          isOpen: depth < 2,
          parentId: pathPrefix || 'root',
          children: sub,
        })
      } else if (ent.isFile()) {
        fileCount++
        const filePath = pathPrefix ? `${pathPrefix}/${name}` : name
        const ext = path.extname(name).toLowerCase()
        let content = ''
        if (!BINARY_EXTENSIONS.has(ext)) {
          try {
            const fullPath = path.join(dirAbs, name)
            const stat = await fs.stat(fullPath)
            if (stat.size <= MAX_FILE_SIZE) {
              content = await fs.readFile(fullPath, 'utf8')
            } else {
              content = `// File too large (${Math.round(stat.size / 1024)}KB)`
            }
          } catch {
            content = `// Error reading ${name}`
          }
        }
        children.push({
          id: filePath,
          name,
          type: 'file',
          language: getLanguageFromExtension(name),
          parentId: pathPrefix || 'root',
          content,
        })
      }
    }
    return children
  }

  const children = await walk(uncRoot, '', 0)
  const files = [{
    id: 'root',
    name: rootName,
    type: 'folder',
    isOpen: true,
    children,
  }]

  return { files, rootPath: linuxPath, workspaceLabel: `${rootName} [WSL: ${distro}]` }
}

export async function writeFileInWsl(distro, rootLinuxPath, relativePosix, content) {
  const uncRoot = toUncPath(distro, rootLinuxPath)
  const full = resolveSafe(uncRoot, relativePosix)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, content, 'utf8')
}

export async function readTextInWsl(distro, rootLinuxPath, relativePosix) {
  const uncRoot = toUncPath(distro, rootLinuxPath)
  const full = resolveSafe(uncRoot, relativePosix)
  try {
    return await fs.readFile(full, 'utf8')
  } catch {
    return null
  }
}

export function registerWslFileSystemHandlers() {
  ipcMain.handle('aether:wsl-load-workspace', async (_event, distro, linuxPath) => {
    if (typeof distro !== 'string' || typeof linuxPath !== 'string') {
      throw new Error('Invalid distro or path')
    }
    return readWorkspaceTreeWsl(distro, linuxPath)
  })

  ipcMain.handle('aether:wsl-write-file-relative', async (_event, distro, rootPath, relativePath, content) => {
    if (typeof distro !== 'string' || !distro) throw new Error('Invalid distro')
    if (typeof rootPath !== 'string' || !rootPath) throw new Error('Invalid rootPath')
    if (typeof relativePath !== 'string' || !relativePath) throw new Error('Invalid relativePath')
    if (typeof content !== 'string') throw new Error('Invalid content')
    await writeFileInWsl(distro, rootPath, relativePath, content)
  })

  ipcMain.handle('aether:wsl-read-text-relative', async (_event, distro, rootPath, relativePath) => {
    if (typeof distro !== 'string' || !distro) throw new Error('Invalid distro')
    if (typeof rootPath !== 'string' || !rootPath) throw new Error('Invalid rootPath')
    if (typeof relativePath !== 'string' || !relativePath) throw new Error('Invalid relativePath')
    return readTextInWsl(distro, rootPath, relativePath)
  })
}
