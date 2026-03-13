import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { workerBridge } from '../services/workers/WorkerBridge'
import { useFileSync } from './useFileSync'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    syntaxTrees: {},
    symbolsByFile: {},
  })
})

describe('useFileSync', () => {
  it('updates store via setFileContent when syncFile is called', () => {
    const { result } = renderHook(() => useFileSync())

    act(() => {
      result.current.syncFile('App.tsx', 'const x = 1')
    })

    expect(useEditorStore.getState().getFileContent('App.tsx')).toBe('const x = 1')
  })

  it('does not call parse when file has no supported language', () => {
    const postSpy = vi.spyOn(workerBridge, 'postRequest')
    const { result } = renderHook(() => useFileSync())

    act(() => {
      result.current.syncFile('readme.md', '# Hello')
    })

    expect(postSpy).not.toHaveBeenCalled()
    postSpy.mockRestore()
  })

  it('calls parseFileContent for .ts files and updates syntax when tree is returned', async () => {
    const mockTree = { root: { type: 'PROGRAM', children: [] } }
    const mockSymbols = [{ kind: 'variable', name: 'x', startIndex: 0, endIndex: 10 }]
    vi.mocked(workerBridge.postRequest).mockImplementation((type: string) => {
      if (type === 'PARSE') return Promise.resolve({ tree: mockTree, symbols: mockSymbols })
      return Promise.reject(new Error(`Unknown: ${type}`))
    })

    const { result } = renderHook(() => useFileSync())

    await act(async () => {
      result.current.syncFile('App.tsx', 'const x = 1')
    })

    await vi.waitFor(() => {
      const state = useEditorStore.getState()
      expect(state.syntaxTrees['App.tsx']).toEqual(mockTree)
      expect(state.symbolsByFile['App.tsx']).toEqual(mockSymbols)
    })
  })
})
