import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { Sidebar } from './Sidebar'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    sidebarVisible: true,
    activeFileId: 'App.tsx',
    symbolsByFile: {},
    openFile: vi.fn(),
  })
})

describe('Sidebar OutlinePanel', () => {
  it('affiche les symboles et dispatch aether-goto-symbol au clic', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    window.addEventListener('aether-goto-symbol', listener)
    useEditorStore.setState({
      symbolsByFile: {
        'App.tsx': [{ kind: 'function', name: 'main', startIndex: 0, endIndex: 1 }],
      },
    })
    render(<Sidebar />)
    expect(screen.getByText('Outline')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /main/ }))
    expect(useEditorStore.getState().openFile).toHaveBeenCalledWith('App.tsx')
    expect(listener).toHaveBeenCalled()
    const ev = listener.mock.calls[0][0] as CustomEvent
    expect(ev.detail).toEqual({ fileId: 'App.tsx', startIndex: 0 })
    window.removeEventListener('aether-goto-symbol', listener)
  })

  it('ne montre pas Outline sans symboles', () => {
    render(<Sidebar />)
    expect(screen.queryByText('Outline')).not.toBeInTheDocument()
  })
})
