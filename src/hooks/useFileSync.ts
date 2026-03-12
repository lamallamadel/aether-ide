import { useCallback } from 'react'
import { useEditorStore } from '../state/editorStore'
import { parseFileContent, languageIdForFile } from '../services/syntax/syntaxClient'
import { ingestFile } from '../services/graphrag/graphrag'

/**
 * Hook that syncs file content to syntax parsing and GraphRAG ingestion.
 * Extracts parse+ingest logic from EditorArea for cleaner separation of concerns.
 */
export function useFileSync() {
  const { setFileContent, setSyntaxForFile } = useEditorStore()

  const syncFile = useCallback(
    (fileId: string, content: string) => {
      setFileContent(fileId, content)
      const lang = languageIdForFile(fileId)
      if (!lang) return

      parseFileContent(lang, content).then((res) => {
        if (!res.tree) return
        setSyntaxForFile(fileId, res.tree, res.symbols)
        ingestFile(fileId, content, res.symbols)
      })
    },
    [setFileContent, setSyntaxForFile]
  )

  return { syncFile }
}
