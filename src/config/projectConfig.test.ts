import { describe, expect, it } from 'vitest'
import {
  parseProjectJson,
  serializeProjectJson,
  createDefaultProject,
  DEFAULT_SDK,
  DEFAULT_WIND_PATH,
  AETHERIDE_DIR,
  PROJECT_CONFIG_FILE,
  treeHasWindToml,
  WIND_MANIFEST_FILE,
} from './projectConfig'
import type { FileNode } from '../domain/fileNode'
import type { AetherProject } from './projectConfig'

describe('projectConfig', () => {
  describe('constants', () => {
    it('uses .aetheride directory', () => {
      expect(AETHERIDE_DIR).toBe('.aetheride')
      expect(PROJECT_CONFIG_FILE).toBe('project.json')
    })
  })

  describe('createDefaultProject', () => {
    it('creates a project with defaults', () => {
      const p = createDefaultProject('my-app', 'aether-app')
      expect(p.version).toBe(1)
      expect(p.name).toBe('my-app')
      expect(p.type).toBe('aether-app')
      expect(p.sdk.aetherccPath).toBe(DEFAULT_SDK.aetherccPath)
      expect(p.sdk.runtimeLibPath).toBe(DEFAULT_SDK.runtimeLibPath)
      expect(p.sdk.clangPath).toBe(DEFAULT_SDK.clangPath)
      expect(p.modules).toEqual([])
      expect(p.windPath).toBe(DEFAULT_WIND_PATH)
    })

    it('defaults to generic type', () => {
      const p = createDefaultProject('test')
      expect(p.type).toBe('generic')
    })
  })

  describe('parseProjectJson', () => {
    it('parses a valid project.json', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'aether-examples',
        type: 'aether-app',
        sdk: {
          aetherccPath: '/usr/local/bin/aethercc',
          runtimeLibPath: '/opt/aether-rt/lib',
          clangPath: 'clang-17',
          runtimeIncludePath: '/opt/aether-rt/include',
        },
        modules: ['src', 'test'],
      })
      const result = parseProjectJson(json)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('aether-examples')
      expect(result!.type).toBe('aether-app')
      expect(result!.sdk.aetherccPath).toBe('/usr/local/bin/aethercc')
      expect(result!.sdk.runtimeLibPath).toBe('/opt/aether-rt/lib')
      expect(result!.sdk.clangPath).toBe('clang-17')
      expect(result!.sdk.runtimeIncludePath).toBe('/opt/aether-rt/include')
      expect(result!.modules).toEqual(['src', 'test'])
    })

    it('parses windPath and windManifestPath', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'w',
        type: 'aether-app',
        sdk: {},
        windPath: '/usr/local/bin/wind',
        windManifestPath: 'crates/foo/Wind.toml',
      })
      const result = parseProjectJson(json)
      expect(result!.windPath).toBe('/usr/local/bin/wind')
      expect(result!.windManifestPath).toBe('crates/foo/Wind.toml')
    })

    it('returns null for invalid JSON', () => {
      expect(parseProjectJson('not json')).toBeNull()
    })

    it('returns null for wrong version', () => {
      expect(parseProjectJson(JSON.stringify({ version: 99 }))).toBeNull()
    })

    it('uses defaults for missing SDK fields', () => {
      const json = JSON.stringify({ version: 1, name: 'test', type: 'generic', sdk: {} })
      const result = parseProjectJson(json)
      expect(result).not.toBeNull()
      expect(result!.sdk.aetherccPath).toBe(DEFAULT_SDK.aetherccPath)
      expect(result!.sdk.runtimeLibPath).toBe(DEFAULT_SDK.runtimeLibPath)
      expect(result!.sdk.clangPath).toBe(DEFAULT_SDK.clangPath)
    })

    it('falls back to generic for unknown type', () => {
      const json = JSON.stringify({ version: 1, name: 'test', type: 'unknown-type' })
      const result = parseProjectJson(json)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('generic')
    })

    it('handles missing name', () => {
      const json = JSON.stringify({ version: 1, type: 'aether-app' })
      const result = parseProjectJson(json)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Unnamed')
    })

    it('handles missing sdk object', () => {
      const json = JSON.stringify({ version: 1, name: 'test' })
      const result = parseProjectJson(json)
      expect(result).not.toBeNull()
      expect(result!.sdk.aetherccPath).toBe(DEFAULT_SDK.aetherccPath)
    })

    it('filters non-string modules', () => {
      const json = JSON.stringify({ version: 1, name: 'test', modules: ['src', 42, null, 'lib'] })
      const result = parseProjectJson(json)
      expect(result!.modules).toEqual(['src', 'lib'])
    })

    it('handles all valid project types', () => {
      for (const type of ['aether-app', 'aether-compiler', 'aether-runtime', 'node-service', 'python-ml', 'generic']) {
        const json = JSON.stringify({ version: 1, name: 'test', type })
        const result = parseProjectJson(json)
        expect(result!.type).toBe(type)
      }
    })
  })

  describe('treeHasWindToml', () => {
    it('returns true when Wind.toml exists at root', () => {
      const files: FileNode[] = [
        {
          id: 'root',
          name: 'proj',
          type: 'folder',
          children: [
            { id: WIND_MANIFEST_FILE, name: WIND_MANIFEST_FILE, type: 'file', parentId: 'root' },
          ],
        },
      ]
      expect(treeHasWindToml(files)).toBe(true)
    })

    it('returns false when absent', () => {
      const files: FileNode[] = [{ id: 'x', name: 'x', type: 'file' }]
      expect(treeHasWindToml(files)).toBe(false)
    })
  })

  describe('serializeProjectJson', () => {
    it('produces valid JSON', () => {
      const project = createDefaultProject('test-project', 'aether-app')
      const json = serializeProjectJson(project)
      const parsed = JSON.parse(json)
      expect(parsed.version).toBe(1)
      expect(parsed.name).toBe('test-project')
      expect(parsed.type).toBe('aether-app')
      expect(parsed.sdk).toBeDefined()
      expect(parsed.modules).toEqual([])
      expect(parsed.windPath).toBe(DEFAULT_WIND_PATH)
    })

    it('roundtrips through parse', () => {
      const original = createDefaultProject('roundtrip', 'python-ml')
      original.sdk.aetherccPath = '/custom/aethercc'
      original.modules = ['src', 'test']
      original.windManifestPath = 'pkg/Wind.toml'
      const json = serializeProjectJson(original)
      const parsed = parseProjectJson(json)
      expect(parsed).toEqual(original)
    })
  })
})
