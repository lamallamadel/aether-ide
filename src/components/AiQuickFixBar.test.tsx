import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '../state/editorStore'
import { AiQuickFixBar } from './AiQuickFixBar'

beforeEach(() => {
  useEditorStore.setState({
    aiQuickFixContext: null,
    activeFileId: 'App.tsx',
    missionControlOpen: false,
    symbolsByFile: {},
  })
})

describe('AiQuickFixBar', () => {
  it('rend null sans contexte', () => {
    const { container } = render(<AiQuickFixBar />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche les actions et ferme au Dismiss', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({
      aiQuickFixContext: { fileId: 'App.tsx', line: 2, kind: 'suggestion' },
    })
    render(<AiQuickFixBar />)
    expect(screen.getByText(/Quick fix \(line 2/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(useEditorStore.getState().aiQuickFixContext).toBeNull()
  })

  it('ouvre Mission Control et ferme', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({
      aiQuickFixContext: { fileId: 'App.tsx', line: 1, kind: 'warning' },
    })
    render(<AiQuickFixBar />)
    await user.click(screen.getByRole('button', { name: 'Open Mission Control' }))
    expect(useEditorStore.getState().missionControlOpen).toBe(true)
    expect(useEditorStore.getState().aiQuickFixContext).toBeNull()
  })

  it('Go to definition dispatch aether-goto-symbol quand symbole à la ligne', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({
      aiQuickFixContext: { fileId: 'App.tsx', line: 1, kind: 'suggestion' },
      symbolsByFile: {
        'App.tsx': [{ kind: 'function', name: 'f', startIndex: 0, endIndex: 1 }],
      },
      getFileContent: () => 'function f(){}',
    })
    const listener = vi.fn()
    window.addEventListener('aether-goto-symbol', listener)
    render(<AiQuickFixBar />)
    await user.click(screen.getByRole('button', { name: 'Go to definition' }))
    expect(listener).toHaveBeenCalled()
    window.removeEventListener('aether-goto-symbol', listener)
  })
})
