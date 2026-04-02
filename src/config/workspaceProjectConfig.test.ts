import { describe, expect, it } from 'vitest'
import {
  parseWorkspaceProjectConfigJson,
  readWorkspaceOverridesFromRoot,
  serializeWorkspaceProjectConfig,
  writeWorkspaceProjectConfig,
} from './workspaceProjectConfig'

describe('parseWorkspaceProjectConfigJson', () => {
  it('accepte version 1 et des overrides valides', () => {
    const text = JSON.stringify({
      version: 1,
      overrides: { aiMode: 'local', lspMode: 'auto', externalLspEndpoint: 'http://localhost/lsp' },
    })
    expect(parseWorkspaceProjectConfigJson(text)).toEqual({
      aiMode: 'local',
      lspMode: 'auto',
      externalLspEndpoint: 'http://localhost/lsp',
    })
  })

  it('accepte sans clé version (traité comme 1)', () => {
    const text = JSON.stringify({ overrides: { aiMode: 'cloud' } })
    expect(parseWorkspaceProjectConfigJson(text)).toEqual({ aiMode: 'cloud' })
  })

  it('ignore les overrides invalides', () => {
    expect(
      parseWorkspaceProjectConfigJson(
        JSON.stringify({ version: 1, overrides: { aiMode: 'nope', lspMode: 'embedded' } })
      )
    ).toEqual({ lspMode: 'embedded' })
  })

  it('retourne null pour version non supportée', () => {
    expect(parseWorkspaceProjectConfigJson(JSON.stringify({ version: 2, overrides: {} }))).toBeNull()
  })

  it('retourne null pour JSON invalide', () => {
    expect(parseWorkspaceProjectConfigJson('not json')).toBeNull()
  })
})

describe('serializeWorkspaceProjectConfig', () => {
  it('n’inclut pas les clés undefined', () => {
    const s = serializeWorkspaceProjectConfig({ aiMode: 'local' })
    const p = JSON.parse(s) as { version: number; overrides: Record<string, unknown> }
    expect(p.version).toBe(1)
    expect(p.overrides).toEqual({ aiMode: 'local' })
    expect('lspMode' in p.overrides).toBe(false)
  })
})

describe('readWorkspaceOverridesFromRoot + writeWorkspaceProjectConfig', () => {
  it('lit les overrides après écriture (handles partagés)', async () => {
    let fileBody = ''

    const fileHandle = {
      createWritable: async () => {
        let acc = ''
        return {
          write: async (chunk: string) => {
            acc += chunk
          },
          close: async () => {
            fileBody = acc
          },
        }
      },
      getFile: async () => ({
        text: async () => fileBody,
      }),
    } as unknown as FileSystemFileHandle

    const aetherDir = {
      getFileHandle: async (_name: string, _opts?: { create?: boolean }) => fileHandle,
    } as FileSystemDirectoryHandle

    const root = {
      getDirectoryHandle: async (_name: string, _opts?: { create?: boolean }) => aetherDir,
    } as FileSystemDirectoryHandle

    expect(await readWorkspaceOverridesFromRoot(root)).toEqual({})

    await writeWorkspaceProjectConfig(root, { aiMode: 'local', lspMode: 'auto' })

    const parsed = await readWorkspaceOverridesFromRoot(root)
    expect(parsed).toEqual({ aiMode: 'local', lspMode: 'auto' })
  })
})
