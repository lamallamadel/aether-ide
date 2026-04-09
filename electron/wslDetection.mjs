/**
 * Detects WSL availability and enumerates installed distributions.
 * Works by invoking `wsl.exe` and parsing its output.
 */
import { execFile } from 'node:child_process'
import { ipcMain } from 'electron'

/**
 * Run a command and collect stdout as UTF-16LE (wsl.exe on Windows outputs UTF-16).
 * Falls back to UTF-8 if decoding fails.
 */
function execWsl(args) {
  return new Promise((resolve, reject) => {
    execFile('wsl.exe', args, { encoding: 'buffer', timeout: 10_000 }, (err, stdout) => {
      if (err) return reject(err)
      let text
      try {
        text = Buffer.from(stdout).toString('utf16le')
      } catch {
        text = stdout.toString('utf8')
      }
      resolve(text.replace(/\0/g, ''))
    })
  })
}

/**
 * Parse `wsl --list --verbose` output.
 * Expected lines (after header):
 *   * Ubuntu      Running    2
 *     Debian      Stopped    1
 */
function parseDistroList(raw) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const distros = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const isDefault = line.trimStart().startsWith('*')
    const cleaned = line.replace(/^\s*\*?\s*/, '')
    const parts = cleaned.split(/\s{2,}/).filter(Boolean)
    if (parts.length < 3) continue
    const name = parts[0].trim()
    const rawState = parts[1].trim()
    const version = parseInt(parts[2].trim(), 10)
    let state = 'Unknown'
    if (/running/i.test(rawState)) state = 'Running'
    else if (/stopped/i.test(rawState)) state = 'Stopped'
    else if (/installing/i.test(rawState)) state = 'Installing'
    distros.push({ name, state, version: version === 1 ? 1 : 2, isDefault })
  }
  return distros
}

export async function checkWslAvailable() {
  try {
    const output = await execWsl(['--status'])
    return { available: true, wslVersion: output.includes('2') ? '2' : '1' }
  } catch {
    return { available: false }
  }
}

export async function listWslDistros() {
  const raw = await execWsl(['--list', '--verbose'])
  return parseDistroList(raw)
}

/**
 * Browse top-level folders inside a WSL distro at `basePath`.
 * Uses `ls -1 -p` which is more portable than `find` and filters for directories.
 * Longer timeout (30s) because the distro may need to start first.
 */
export async function browseFoldersInWsl(distro, basePath) {
  const safePath = basePath || '/home'
  try {
    const raw = await execWslLong(['-d', distro, '--', 'ls', '-1', '-p', '--', safePath])
    const lines = raw.split(/\r?\n/).map((l) => l.trim())
    const dirLines = lines.filter((l) => l.endsWith('/'))
    return dirLines
      .map((l) => {
        const name = l.slice(0, -1)
        const base = safePath.endsWith('/') ? safePath : safePath + '/'
        return base + name
      })
  } catch (err) {
    console.error('browseFoldersInWsl failed:', err?.message ?? err)
    return []
  }
}

function execWslLong(args) {
  return new Promise((resolve, reject) => {
    execFile('wsl.exe', args, { encoding: 'buffer', timeout: 30_000 }, (err, stdout) => {
      if (err) return reject(err)
      const text = stdout.toString('utf8')
      resolve(text.replace(/\0/g, ''))
    })
  })
}

/**
 * Get the default home directory for the current user in a WSL distro.
 */
export async function getWslHomePath(distro) {
  try {
    const raw = await execWslLong(['-d', distro, '--', 'sh', '-c', 'echo $HOME'])
    const home = raw.trim().split(/\r?\n/).pop()?.trim()
    return home && home.startsWith('/') ? home : '/home'
  } catch {
    return '/home'
  }
}

export function registerWslDetectionHandlers() {
  ipcMain.handle('aether:wsl-check-available', async () => {
    return checkWslAvailable()
  })

  ipcMain.handle('aether:wsl-list-distros', async () => {
    return listWslDistros()
  })

  ipcMain.handle('aether:wsl-browse-folders', async (_event, distro, basePath) => {
    if (typeof distro !== 'string' || !distro) throw new Error('Invalid distro')
    return browseFoldersInWsl(distro, typeof basePath === 'string' ? basePath : '/home')
  })

  ipcMain.handle('aether:wsl-get-home', async (_event, distro) => {
    if (typeof distro !== 'string' || !distro) throw new Error('Invalid distro')
    return getWslHomePath(distro)
  })
}
