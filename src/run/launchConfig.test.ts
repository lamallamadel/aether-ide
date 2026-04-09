import { describe, expect, it } from 'vitest'
import { parseLaunchJson, serializeLaunchJson, makeNpmConfig, makeShellConfig } from './launchConfig'

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
})
