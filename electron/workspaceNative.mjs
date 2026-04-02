/**
 * Lecture / écriture de workspace sur disque (même logique d’exclusion que le renderer).
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.aether',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '__pycache__',
  '.venv',
  'venv',
])

const MAX_FILES = 1000
const MAX_DEPTH = 10

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
  return undefined
}

/**
 * Vérifie que `resolvedFile` reste sous `resolvedRoot` (chemins absolus).
 */
export function isPathInsideWorkspace(resolvedRoot, resolvedFile) {
  const rel = path.relative(resolvedRoot, resolvedFile)
  if (rel === '') return true
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

export function resolveSafeUnderRoot(rootPath, relativePosix) {
  const root = path.resolve(rootPath)
  const rel = String(relativePosix).replaceAll('\\', '/')
  if (!rel || rel.includes('..')) throw new Error('Invalid path')
  const full = path.join(root, ...rel.split('/').filter(Boolean))
  const resolved = path.resolve(full)
  if (!isPathInsideWorkspace(root, resolved)) throw new Error('Path outside workspace')
  return resolved
}

/** @returns {Promise<{ files: unknown[], rootPath: string, workspaceLabel: string }>} */
export async function readWorkspaceTreeNative(absRoot) {
  const rootResolved = path.resolve(absRoot)
  let st
  try {
    st = await fs.stat(rootResolved)
  } catch {
    throw new Error('Cannot access directory')
  }
  if (!st.isDirectory()) throw new Error('Not a directory')

  const rootName = path.basename(rootResolved)
  let fileCount = 0

  async function walk(dirAbs, pathPrefix, depth) {
    if (depth > MAX_DEPTH || fileCount >= MAX_FILES) return []
    const entries = await fs.readdir(dirAbs, { withFileTypes: true })
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
        let content = ''
        try {
          content = await fs.readFile(path.join(dirAbs, name), 'utf8')
        } catch {
          content = `// Error reading ${name}`
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

  const children = await walk(rootResolved, '', 0)
  const files = [
    {
      id: 'root',
      name: rootName,
      type: 'folder',
      isOpen: true,
      children,
    },
  ]

  return {
    files,
    rootPath: rootResolved,
    workspaceLabel: rootName,
  }
}

export async function writeFileUnderRoot(rootPath, relativePosix, content) {
  const full = resolveSafeUnderRoot(rootPath, relativePosix)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, content, 'utf8')
}

export async function readTextUnderRoot(rootPath, relativePosix) {
  const full = resolveSafeUnderRoot(rootPath, relativePosix)
  try {
    return await fs.readFile(full, 'utf8')
  } catch {
    return null
  }
}
