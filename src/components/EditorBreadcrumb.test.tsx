import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorBreadcrumb } from './EditorBreadcrumb'

describe('EditorBreadcrumb', () => {
  it('affiche plusieurs segments de chemin', () => {
    render(<EditorBreadcrumb filePath="src/components/App.tsx" />)
    expect(screen.getByLabelText('Chemin du fichier')).toBeInTheDocument()
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('components')).toBeInTheDocument()
    expect(screen.getByText('App.tsx')).toBeInTheDocument()
  })

  it('rend null pour chemin vide', () => {
    const { container } = render(<EditorBreadcrumb filePath="" />)
    expect(container.firstChild).toBeNull()
  })
})
