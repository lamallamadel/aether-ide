import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { MissionControl } from './MissionControl'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    missionControlOpen: false,
    worktreeChanges: {},
    activeFileId: 'App.tsx',
    openFiles: ['App.tsx', 'main.tsx'],
  })
})

describe('MissionControl', () => {
  it('returns null when missionControlOpen is false', () => {
    const { container } = render(<MissionControl />)
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog with Changes when open and no worktree changes', () => {
    useEditorStore.setState({ missionControlOpen: true })
    render(<MissionControl />)
    expect(screen.getByText('Mission Control')).toBeInTheDocument()
    expect(screen.getByText('Changes')).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    useEditorStore.setState({ missionControlOpen: true })
    render(<MissionControl />)
    await userEvent.keyboard('{Escape}')
    expect(useEditorStore.getState().missionControlOpen).toBe(false)
  })

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ missionControlOpen: true })
    render(<MissionControl />)
    const overlay = document.querySelector('.fixed.inset-0')
    const closeBtn = within(overlay as HTMLElement).getAllByRole('button')[0]
    await user.click(closeBtn)
    expect(useEditorStore.getState().missionControlOpen).toBe(false)
  })

  it('shows worktree changes and allows Apply', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({
      missionControlOpen: true,
      worktreeChanges: {
        'App.tsx': {
          fileId: 'App.tsx',
          originalContent: 'Hello',
          proposedContent: 'Hello World',
        },
      },
    })
    render(<MissionControl />)
    expect(screen.getByText('Mission Control')).toBeInTheDocument()
    const acceptBtn = screen.getByRole('button', { name: 'Accept' })
    await user.click(acceptBtn)
    expect(useEditorStore.getState().worktreeChanges['App.tsx']).toBeUndefined()
    expect(useEditorStore.getState().getFileContent('App.tsx')).toBe('Hello World')
  })

})
