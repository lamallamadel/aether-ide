import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_FILES } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { StatusBar } from './StatusBar'

beforeEach(() => {
  useEditorStore.setState({
    files: INITIAL_FILES,
    activeFileId: 'App.tsx',
    editorFontSizePx: 14,
    perf: { longTaskCount: 0, longTaskMaxMs: 0, slowFrameCount: 0, slowFrameMaxMs: 0 },
    aiHealth: 'full',
    indexingError: null,
    storageQuotaExceeded: false,
  })
})

describe('StatusBar', () => {
  it('affiche le label de langue TypeScript React pour .tsx', () => {
    render(<StatusBar />)
    expect(screen.getByText('TypeScript React')).toBeInTheDocument()
  })

  it('affiche Plain Text sans fichier actif', () => {
    useEditorStore.setState({ activeFileId: null })
    render(<StatusBar />)
    expect(screen.getByText('Plain Text')).toBeInTheDocument()
  })

  it('affiche Plain Text pour extension inconnue', () => {
    useEditorStore.setState({ activeFileId: 'data.bin' })
    render(<StatusBar />)
    expect(screen.getByText('Plain Text')).toBeInTheDocument()
  })

  it('détecte CSS, HTML et Markdown', () => {
    useEditorStore.setState({ activeFileId: 'styles.css' })
    const { rerender } = render(<StatusBar />)
    expect(screen.getByText('CSS')).toBeInTheDocument()
    useEditorStore.setState({ activeFileId: 'index.html' })
    rerender(<StatusBar />)
    expect(screen.getByText('HTML')).toBeInTheDocument()
    useEditorStore.setState({ activeFileId: 'notes.md' })
    rerender(<StatusBar />)
    expect(screen.getByText('Markdown')).toBeInTheDocument()
  })

  it('affiche les états degraded et offline pour aiHealth', () => {
    useEditorStore.setState({ aiHealth: 'degraded' })
    const { rerender } = render(<StatusBar />)
    expect(screen.getByText('AI Keywords Only')).toBeInTheDocument()
    useEditorStore.setState({ aiHealth: 'offline' })
    rerender(<StatusBar />)
    expect(screen.getByText('AI Offline')).toBeInTheDocument()
  })

  it('affiche loading', () => {
    useEditorStore.setState({ aiHealth: 'loading' })
    render(<StatusBar />)
    expect(screen.getByText('AI Loading...')).toBeInTheDocument()
  })

  it('affiche les alertes indexing et stockage', () => {
    useEditorStore.setState({
      indexingError: 'disk full',
      storageQuotaExceeded: true,
    })
    render(<StatusBar />)
    expect(screen.getByText('Indexing failed')).toBeInTheDocument()
    expect(screen.getByText('Storage full')).toBeInTheDocument()
  })
})
