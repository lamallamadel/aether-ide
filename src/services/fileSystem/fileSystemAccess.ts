import type { FileNode } from '../../domain/fileNode'

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '__pycache__', '.venv', 'venv'])

const MAX_FILES = 1000
const MAX_DEPTH = 10

function getLanguageFromExtension(name: string): string | undefined {
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

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isSupported()) return null
  try {
    const handle = await window.showDirectoryPicker!({ mode: 'readwrite' })
    return handle
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return null
    throw err
  }
}

export async function readFileContent(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile()
  return file.text()
}

export async function writeFileContent(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

export interface ReadDirectoryOptions {
  maxDepth?: number
  maxFiles?: number
  excludedDirs?: Set<string>
}

export interface ReadDirectoryResult {
  files: FileNode[]
  fileHandles: Record<string, FileSystemFileHandle>
}

/**
 * Parcourt récursivement un dossier et construit un arbre FileNode.
 * Les ids des fichiers = chemin relatif (ex. src/App.tsx).
 */
export async function readDirectoryRecursive(
  handle: FileSystemDirectoryHandle,
  options?: ReadDirectoryOptions
): Promise<ReadDirectoryResult> {
  const maxDepth = options?.maxDepth ?? MAX_DEPTH
  const maxFiles = options?.maxFiles ?? MAX_FILES
  const excluded = options?.excludedDirs ?? EXCLUDED_DIRS

  let fileCount = 0
  const rootName = handle.name
  const fileHandles: Record<string, FileSystemFileHandle> = {}

  async function walk(
    dirHandle: FileSystemDirectoryHandle,
    pathPrefix: string,
    depth: number
  ): Promise<FileNode[]> {
    if (depth > maxDepth || fileCount >= maxFiles) return []
    const children: FileNode[] = []
    for await (const entry of dirHandle.values()) {
      if (fileCount >= maxFiles) break
      const name = entry.name
      if (entry.kind === 'directory') {
        if (excluded.has(name)) continue
        const folderPath = pathPrefix ? `${pathPrefix}/${name}` : name
        const subChildren = await walk(entry as FileSystemDirectoryHandle, folderPath, depth + 1)
        children.push({
          id: folderPath,
          name,
          type: 'folder',
          isOpen: depth < 2,
          parentId: pathPrefix || 'root',
          children: subChildren,
        })
      } else if (entry.kind === 'file') {
        fileCount++
        const filePath = pathPrefix ? `${pathPrefix}/${name}` : name
        const fileHandle = entry as FileSystemFileHandle
        fileHandles[filePath] = fileHandle
        let content = ''
        try {
          content = await readFileContent(fileHandle)
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

  const children = await walk(handle, '', 0)
  const files: FileNode[] = [
    {
      id: 'root',
      name: rootName,
      type: 'folder',
      isOpen: true,
      children,
    },
  ]
  return { files, fileHandles }
}
