/**
 * npm n'installe qu'un seul paquet optionnel @lydell/node-pty-* (celui de l'hôte).
 * Les builds Linux/macOS packagés depuis Windows n'embarquent alors pas le binaire cible.
 * `npm pack` récupère l'archive sans filtre os/cpu ; on extrait dans node_modules/@lydell/.
 */
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mainPty = join(root, 'node_modules', '@lydell', 'node-pty', 'package.json')
const lydellDir = join(root, 'node_modules', '@lydell')

const PLATFORM_PACKAGES = [
  '@lydell/node-pty-darwin-arm64',
  '@lydell/node-pty-darwin-x64',
  '@lydell/node-pty-linux-arm64',
  '@lydell/node-pty-linux-x64',
  '@lydell/node-pty-win32-arm64',
  '@lydell/node-pty-win32-x64',
]

function mainPtyVersion() {
  if (!existsSync(mainPty)) return null
  return JSON.parse(readFileSync(mainPty, 'utf8')).version
}

function ensurePackage(name, version) {
  const shortName = name.split('/')[1]
  const dest = join(lydellDir, shortName)
  if (existsSync(join(dest, 'package.json'))) return

  mkdirSync(lydellDir, { recursive: true })
  const packDest = join(lydellDir, `.pack-${shortName}`)
  rmSync(packDest, { recursive: true, force: true })
  mkdirSync(packDest, { recursive: true })

  const spec = `${name}@${version}`
  try {
    // Windows : `npm` est souvent un shim .cmd — execFileSync('npm') peut échouer (ENOENT).
    execSync(
      `npm pack ${JSON.stringify(spec)} --pack-destination ${JSON.stringify(packDest)} --silent`,
      { cwd: root, stdio: 'inherit', shell: true },
    )
  } catch (e) {
    console.warn('[ensure-node-pty-platforms] npm pack failed:', spec, e?.message || e)
    rmSync(packDest, { recursive: true, force: true })
    return
  }

  const tgzFiles = readdirSync(packDest).filter((f) => f.endsWith('.tgz'))
  if (tgzFiles.length !== 1) {
    console.warn('[ensure-node-pty-platforms] expected one .tgz in', packDest, 'got', tgzFiles)
    rmSync(packDest, { recursive: true, force: true })
    return
  }

  const tgzPath = join(packDest, tgzFiles[0])
  const staging = join(packDest, 'extract')
  mkdirSync(staging, { recursive: true })

  try {
    execFileSync('tar', ['-xzf', tgzPath, '-C', staging], { cwd: root, stdio: 'inherit' })
  } catch (e) {
    console.warn('[ensure-node-pty-platforms] tar extract failed:', spec, e?.message || e)
    rmSync(packDest, { recursive: true, force: true })
    return
  }

  const unpacked = join(staging, 'package')
  if (!existsSync(join(unpacked, 'package.json'))) {
    console.warn('[ensure-node-pty-platforms] missing package/ after tar:', spec)
    rmSync(packDest, { recursive: true, force: true })
    return
  }

  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true })
  renameSync(unpacked, dest)
  rmSync(packDest, { recursive: true, force: true })
}

const version = mainPtyVersion()
if (!version) {
  process.exit(0)
}

for (const name of PLATFORM_PACKAGES) {
  ensurePackage(name, version)
}
