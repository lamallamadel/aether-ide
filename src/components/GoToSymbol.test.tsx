import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '../state/editorStore'
import { GoToSymbol } from './GoToSymbol'

beforeEach(() => {
  useEditorStore.setState({
    goToSymbolOpen: true,
    activeFileId: 'App.tsx',
    files: [
      {
        id: 'root',
        name: 'root',
        type: 'folder',
        children: [
          { id: 'App.tsx', name: 'App.tsx', type: 'file', parentId: 'root', content: 'function hello() {}\nconst x = 1' },
        ],
      },
    ],
    symbolsByFile: {
      'App.tsx': [
        { kind: 'function', name: 'hello', startIndex: 9, endIndex: 14 },
        { kind: 'variable', name: 'x', startIndex: 27, endIndex: 28 },
      ],
    },
  } as any)
})

describe('GoToSymbol', () => {
  it('renders symbols from active file', () => {
    render(<GoToSymbol />)
    expect(screen.getByRole('dialog', { name: 'Go to Symbol' })).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByText('x')).toBeInTheDocument()
  })

  it('filters symbols by query', async () => {
    const user = userEvent.setup()
    render(<GoToSymbol />)
    await user.type(screen.getByPlaceholderText('Type symbol name...'), 'hel')
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.queryByText('x')).not.toBeInTheDocument()
  })

  it('dispatches goto event on symbol selection', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    window.addEventListener('aether-goto-symbol', listener as EventListener)
    render(<GoToSymbol />)

    await user.click(screen.getByText('hello'))

    expect(listener).toHaveBeenCalled()
    expect(useEditorStore.getState().goToSymbolOpen).toBe(false)
    window.removeEventListener('aether-goto-symbol', listener as EventListener)
  })
})
