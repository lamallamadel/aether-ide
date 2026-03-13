import { describe, expect, it, vi } from 'vitest'
import { isSupported, readFileContent, readDirectoryRecursive, writeFileContent } from './fileSystemAccess'

describe('fileSystemAccess', () => {
  it('isSupported returns false when showDirectoryPicker is absent', () => {
    expect(typeof isSupported()).toBe('boolean')
    // In Node/jsdom, showDirectoryPicker is not defined
    expect(isSupported()).toBe(false)
  })

  it('isSupported returns true when showDirectoryPicker exists', () => {
    const hasPicker = 'showDirectoryPicker' in (typeof window !== 'undefined' ? window : {})
    if (hasPicker) {
      expect(isSupported()).toBe(true)
    }
  })
})

describe('readFileContent', () => {
  it('reads content from handle', async () => {
    const mockFile = { text: () => Promise.resolve('hello world') }
    const handle = {
      getFile: vi.fn().mockResolvedValue(mockFile),
    } as unknown as FileSystemFileHandle
    const content = await readFileContent(handle)
    expect(content).toBe('hello world')
  })
})

describe('writeFileContent', () => {
  it('writes content via handle', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)
    const handle = {
      createWritable: vi.fn().mockResolvedValue({ write, close }),
    } as unknown as FileSystemFileHandle
    await writeFileContent(handle, 'test')
    expect((handle as { createWritable: ReturnType<typeof vi.fn> }).createWritable).toHaveBeenCalled()
    expect(write).toHaveBeenCalledWith('test')
    expect(close).toHaveBeenCalled()
  })
})

describe('readDirectoryRecursive', () => {
  it('returns root structure with files and fileHandles', async () => {
    const mockFile = { text: () => Promise.resolve('content') }
    const fileHandle = {
      getFile: () => Promise.resolve(mockFile),
      kind: 'file' as const,
      name: 'a.ts',
    }
    const dirHandle = {
      kind: 'directory' as const,
      name: 'project',
      values: vi.fn().mockImplementation(async function* () {
        yield fileHandle
      }),
    } as unknown as FileSystemDirectoryHandle

    const { files, fileHandles } = await readDirectoryRecursive(dirHandle)
    expect(files).toHaveLength(1)
    expect(files[0].id).toBe('root')
    expect(files[0].name).toBe('project')
    expect(files[0].children).toHaveLength(1)
    expect(files[0].children![0]).toMatchObject({
      id: 'a.ts',
      name: 'a.ts',
      type: 'file',
      content: 'content',
    })
    expect(fileHandles['a.ts']).toBe(fileHandle)
  })

  it('excludes node_modules', async () => {
    const dirHandle = {
      kind: 'directory' as const,
      name: 'root',
      values: vi.fn().mockImplementation(async function* () {
        yield { kind: 'directory' as const, name: 'node_modules', values: () => (async function* () {})() }
      }),
    } as unknown as FileSystemDirectoryHandle
    const { files } = await readDirectoryRecursive(dirHandle)
    expect(files[0].children).toHaveLength(0)
  })
})
