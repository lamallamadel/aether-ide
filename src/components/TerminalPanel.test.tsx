import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { xtermMocks } from '../test/setup'
import { TerminalPanel } from './TerminalPanel'

const originalDesktop = window.aetherDesktop

beforeEach(() => {
  window.aetherDesktop = originalDesktop
  useEditorStore.setState({
    files: INITIAL_FILES,
    terminalPanelOpen: false,
    terminalPanelHeight: 200,
  })
  vi.clearAllMocks()
})

describe('TerminalPanel', () => {
  it('renders null when terminalPanelOpen is false', () => {
    const { container } = render(<TerminalPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders header and close button when terminalPanelOpen is true', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)
    expect(screen.getByText('Terminal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close terminal' })).toBeInTheDocument()
  })

  it('closes panel when close button is clicked', async () => {
    const user = userEvent.setup()
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)

    await user.click(screen.getByRole('button', { name: 'Close terminal' }))

    expect(useEditorStore.getState().terminalPanelOpen).toBe(false)
  })

  it('unmounts without crashing when open', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    const { unmount } = render(<TerminalPanel />)
    expect(() => unmount()).not.toThrow()
  })

  it('runs help command when user types help and enter', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)

    const onDataCallback = xtermMocks.onData.mock.calls[0]?.[0] as ((data: string) => void) | undefined
    expect(onDataCallback).toBeDefined()
    if (!onDataCallback) return

    onDataCallback('h')
    onDataCallback('e')
    onDataCallback('l')
    onDataCallback('p')
    onDataCallback('\r')

    expect(xtermMocks.writeln).toHaveBeenCalledWith(
      expect.stringContaining('Available commands: clear, echo, ls, pwd, help')
    )
  })

  it('applique les classes embedded (h-full) quand embedded', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    const { container } = render(<TerminalPanel embedded />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/h-full/)
  })

  it('écrit le flux onTerminalStream dans le terminal', async () => {
    const unsub = vi.fn()
    const onTerminalStream = vi.fn((cb: (data: { text: string }) => void) => {
      queueMicrotask(() => cb({ text: '[stream]' }))
      return unsub
    })
    window.aetherDesktop = {
      ...(originalDesktop ?? {}),
      kind: 'electron',
      platform: 'win32',
      versions: { electron: '1', chrome: '1' },
      pickWorkspaceRoot: vi.fn(),
      loadWorkspace: vi.fn(),
      writeFileRelative: vi.fn(),
      readTextRelative: vi.fn(),
      onTerminalStream,
    } as unknown as typeof window.aetherDesktop
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)
    expect(onTerminalStream).toHaveBeenCalled()
    await waitFor(() => {
      expect(xtermMocks.write).toHaveBeenCalledWith('[stream]')
    })
  })

  it('exécute clear, ls, pwd et commande inconnue', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)
    const onData = xtermMocks.onData.mock.calls[0]?.[0] as ((data: string) => void) | undefined
    expect(onData).toBeDefined()
    if (!onData) return

    for (const c of 'clear') onData(c)
    onData('\r')
    expect(xtermMocks.clear).toHaveBeenCalled()

    for (const c of 'ls') onData(c)
    onData('\r')
    expect(xtermMocks.writeln).toHaveBeenCalledWith(expect.stringMatching(/package\.json|README/i))

    for (const c of 'pwd') onData(c)
    onData('\r')
    expect(xtermMocks.writeln).toHaveBeenCalledWith(expect.stringMatching(/aether-project|~/))

    for (const c of 'nope_cmd') onData(c)
    onData('\r')
    expect(xtermMocks.writeln).toHaveBeenCalledWith(expect.stringContaining('Command not found'))
  })

  it('gère backspace sur la ligne courante', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)
    const onData = xtermMocks.onData.mock.calls[0]?.[0] as ((data: string) => void) | undefined
    expect(onData).toBeDefined()
    if (!onData) return
    onData('a')
    onData('b')
    onData('\u007F')
    expect(xtermMocks.write).toHaveBeenCalledWith('\b \b')
  })

  it('runs echo command', () => {
    useEditorStore.setState({ terminalPanelOpen: true })
    render(<TerminalPanel />)

    const onDataCallback = xtermMocks.onData.mock.calls[0]?.[0] as ((data: string) => void) | undefined
    expect(onDataCallback).toBeDefined()
    if (!onDataCallback) return

    for (const c of 'echo hello') onDataCallback(c)
    onDataCallback('\r')

    expect(xtermMocks.writeln).toHaveBeenCalledWith('hello')
  })
})
