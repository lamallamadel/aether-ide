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
 * Uses `wsl.exe -d <distro> -- ls -1 <basePath>`.
 */
export async function browseFoldersInWsl(distro, basePath) {
  const raw = await execWsl(['-d', distro, '--', 'find', basePath, '-maxdepth', '1', '-type', 'd'])
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== basePath)
}

export function registerWslDetectionHandlers() {
  ipcMain.handle('aether:wsl-check-available', async () => {
    return checkWslAvailable()
  })

  ipcMain.handle('aether:wsl-list-distros', async () => {
    return listWslDistros()
  })

  ipcMain.handle('aether:wsl-browse-folders', async (_event, distro, basePath) => {
    return browseFoldersInWsl(distro, basePath || '/home')
  })
}
