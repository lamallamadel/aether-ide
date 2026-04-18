import { describe, expect, it } from 'vitest'
import {
  parseLaunchJson,
  serializeLaunchJson,
  makeNpmConfig,
  makeShellConfig,
  makeAetherConfig,
  makeCmakeConfig,
  makePythonConfig,
  makeWindConfig,
} from './launchConfig'

describe('launchConfig', () => {
  describe('parseLaunchJson', () => {
    it('parse un fichier valide', () => {
      const json = JSON.stringify({
        version: 1,
        configurations: [
          { id: 'c1', name: 'Dev', type: 'npm', npmScript: 'dev' },
        ],
      })
      const result = parseLaunchJson(json)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Dev')
    })

    it('retourne [] sur JSON invalide', () => {
      expect(parseLaunchJson('not json')).toEqual([])
    })

    it('retourne [] si pas de configurations', () => {
      expect(parseLaunchJson('{}')).toEqual([])
    })

    it('filtre les entrées invalides', () => {
      const json = JSON.stringify({
        version: 1,
        configurations: [
          { id: 'c1', name: 'Dev', type: 'npm' },
          { notValid: true },
          null,
        ],
      })
      expect(parseLaunchJson(json)).toHaveLength(1)
    })
  })

  describe('serializeLaunchJson', () => {
    it('produit un JSON parseable', () => {
      const configs = [{ id: 'c1', name: 'Dev', type: 'npm' as const, npmScript: 'dev' }]
      const json = serializeLaunchJson(configs)
      const parsed = JSON.parse(json)
      expect(parsed.version).toBe(1)
      expect(parsed.configurations).toHaveLength(1)
    })
  })

  describe('makeNpmConfig', () => {
    it('crée une configuration npm valide', () => {
      const cfg = makeNpmConfig('test')
      expect(cfg.type).toBe('npm')
      expect(cfg.npmScript).toBe('test')
      expect(cfg.name).toBe('npm run test')
    })

    it('pin dev et start', () => {
      expect(makeNpmConfig('dev').pinned).toBe(true)
      expect(makeNpmConfig('start').pinned).toBe(true)
      expect(makeNpmConfig('lint').pinned).toBe(false)
    })
  })

  describe('makeShellConfig', () => {
    it('crée une configuration shell valide', () => {
      const cfg = makeShellConfig('echo hello', 'Echo')
      expect(cfg.type).toBe('shell')
      expect(cfg.command).toBe('echo hello')
      expect(cfg.name).toBe('Echo')
    })
  })

  describe('makeAetherConfig', () => {
    it('crée une configuration aether valide', () => {
      const cfg = makeAetherConfig('main.aether', '/proj')
      expect(cfg.type).toBe('aether')
      expect(cfg.aetherFile).toBe('main.aether')
      expect(cfg.name).toBe('Aether: main')
      expect(cfg.pinned).toBe(true)
      expect(cfg.cwd).toBe('/proj')
    })

    it('extrait le nom sans extension', () => {
      const cfg = makeAetherConfig('examples/agents/rag_agent/main.aether')
      expect(cfg.name).toBe('Aether: main')
    })
  })

  describe('makeCmakeConfig', () => {
    it('crée une configuration cmake avec defaults', () => {
      const cfg = makeCmakeConfig()
      expect(cfg.type).toBe('cmake')
      expect(cfg.cmakeBuildDir).toBe('build')
      expect(cfg.name).toBe('CMake: all')
    })

    it('accepte un target et build dir', () => {
      const cfg = makeCmakeConfig('aether-compile', 'out', '/proj', 'Build Compiler')
      expect(cfg.cmakeTarget).toBe('aether-compile')
      expect(cfg.cmakeBuildDir).toBe('out')
      expect(cfg.name).toBe('Build Compiler')
      expect(cfg.cwd).toBe('/proj')
    })
  })

  describe('makeWindConfig', () => {
    it('crée wind build par défaut', () => {
      const cfg = makeWindConfig('build')
      expect(cfg.type).toBe('wind')
      expect(cfg.windCommand).toBe('build')
      expect(cfg.name).toBe('Wind: build')
      expect(cfg.pinned).toBe(false)
    })

    it('épingle wind run', () => {
      const cfg = makeWindConfig('run', 'My run', { windRelease: true, windBin: 'app' })
      expect(cfg.windCommand).toBe('run')
      expect(cfg.name).toBe('My run')
      expect(cfg.pinned).toBe(true)
      expect(cfg.windRelease).toBe(true)
      expect(cfg.windBin).toBe('app')
    })
  })

  describe('makePythonConfig', () => {
    it('crée une configuration python valide', () => {
      const cfg = makePythonConfig('main.py', '/proj')
      expect(cfg.type).toBe('python')
      expect(cfg.pythonModule).toBe('main.py')
      expect(cfg.name).toBe('Python: main.py')
    })

    it('accepte un nom personnalisé', () => {
      const cfg = makePythonConfig('-m uvicorn app:main', '/proj', 'Uvicorn Server')
      expect(cfg.name).toBe('Uvicorn Server')
    })
  })

  describe('parseLaunchJson with new types', () => {
    it('parse les types aether/cmake/python', () => {
      const json = JSON.stringify({
        version: 1,
        configurations: [
          { id: 'a1', name: 'Aether Main', type: 'aether', aetherFile: 'main.aether' },
          { id: 'c1', name: 'Build Core', type: 'cmake', cmakeTarget: 'all', cmakeBuildDir: 'build' },
          { id: 'p1', name: 'Infer', type: 'python', pythonModule: '-m aether_infer' },
          { id: 'w1', name: 'Wind build', type: 'wind', windCommand: 'build', windRelease: true },
        ],
      })
      const result = parseLaunchJson(json)
      expect(result).toHaveLength(4)
      expect(result[0].type).toBe('aether')
      expect(result[1].type).toBe('cmake')
      expect(result[2].type).toBe('python')
      expect(result[3].type).toBe('wind')
      expect(result[3].windCommand).toBe('build')
      expect(result[3].windRelease).toBe(true)
    })
  })
})
