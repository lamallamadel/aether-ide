import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { WorktreeInlineBar } from './WorktreeInlineBar'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'App.tsx',
    worktreeChanges: {},
  })
})

describe('WorktreeInlineBar', () => {
  it('rend null sans fichier actif', () => {
    useEditorStore.setState({ activeFileId: null })
    const { container } = render(<WorktreeInlineBar />)
    expect(container.firstChild).toBeNull()
  })

  it('rend null sans changement worktree pour le fichier actif', () => {
    const { container } = render(<WorktreeInlineBar />)
    expect(container.firstChild).toBeNull()
  })

  it('Accept et Reject appellent le store', async () => {
    const user = userEvent.setup()
    const applySpy = vi.fn()
    const rejectSpy = vi.fn()
    useEditorStore.setState({
      worktreeChanges: { 'App.tsx': { fileId: 'App.tsx', originalContent: 'a', proposedContent: 'b' } },
      applyWorktreeChange: applySpy,
      rejectWorktreeChange: rejectSpy,
    })
    render(<WorktreeInlineBar />)
    expect(screen.getByText(/Worktree preview/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reject' }))
    expect(rejectSpy).toHaveBeenCalledWith('App.tsx')
    await user.click(screen.getByRole('button', { name: 'Accept' }))
    expect(applySpy).toHaveBeenCalledWith('App.tsx')
  })
})
