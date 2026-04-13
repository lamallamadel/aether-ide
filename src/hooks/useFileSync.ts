import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '../state/editorStore'
import { parseFileContent, languageIdForFile } from '../services/syntax/syntaxClient'
import { ingestFile } from '../services/graphrag/graphrag'

/**
 * Hook that syncs file content to syntax parsing, diagnostics, and GraphRAG ingestion.
 */
export function useFileSync() {
  const { setFileContent, setSyntaxForFile, setDiagnosticsForFile } = useEditorStore(
    useShallow((s) => ({
      setFileContent: s.setFileContent,
      setSyntaxForFile: s.setSyntaxForFile,
      setDiagnosticsForFile: s.setDiagnosticsForFile,
    }))
  )

  const syncFile = useCallback(
    (fileId: string, content: string) => {
      setFileContent(fileId, content)
      const lang = languageIdForFile(fileId)
      if (!lang) return

      parseFileContent(lang, content)
        .then((res) => {
          if (res.tree) {
            setSyntaxForFile(fileId, res.tree, res.symbols)
          }
          setDiagnosticsForFile(fileId, res.diagnostics)
          ingestFile(fileId, content, res.symbols)
        })
        .catch((err) => {
          console.warn('File sync failed for', fileId, err)
          setDiagnosticsForFile(fileId, [])
        })
    },
    [setFileContent, setSyntaxForFile, setDiagnosticsForFile]
  )

  return { syncFile }
}
