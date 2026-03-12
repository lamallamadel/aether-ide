import { memo, useCallback } from 'react'
import { Command, FileCode, X } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import { CodeEditor } from './CodeEditor'
import { useFileSync } from '../hooks/useFileSync'

const TabSystem = memo(() => {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useEditorStore()

  return (
    <div className="flex h-9 bg-[#0a0a0a] border-b border-white/5 overflow-x-auto no-scrollbar">
      {openFiles.map((fileId) => (
        <div
          key={fileId}
          onClick={() => setActiveFile(fileId)}
          className={`
            group flex items-center px-3 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-white/5 select-none
            ${activeFileId === fileId ? 'bg-[#1e1e1e] text-white border-t-2' : 'text-gray-500 hover:bg-[#151515]'}
          `}
          style={{
            borderTopColor: activeFileId === fileId ? 'rgb(var(--color-primary-500))' : undefined,
          }}
        >
          <span className="mr-2">
            <FileCode size={12} className={activeFileId === fileId ? 'text-cyan-400' : 'grayscale opacity-50'} />
          </span>
          <span className="truncate flex-1">{fileId}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeFile(fileId)
            }}
            className={`ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-white/20 ${
              activeFileId === fileId ? 'opacity-100' : ''
            }`}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  )
})

export function EditorArea() {
  const {
    activeFileId,
    getFileContent,
    editorFontSizePx,
    editorWordWrap,
    editorMinimap,
    editorTheme,
    editorFontFamily,
  } = useEditorStore()
  const { syncFile } = useFileSync()
  const content = activeFileId ? getFileContent(activeFileId) : '// Select a file to view content'

  const handleEditorChange = useCallback(
    (next: string) => {
      if (!activeFileId) return
      syncFile(activeFileId, next)
    },
    [activeFileId, syncFile]
  )

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] relative overflow-hidden">
      <TabSystem />
      <div className="flex-1 relative overflow-auto custom-scrollbar">
        {activeFileId ? (
          <div className="absolute inset-0 flex">
            <div className="flex-1 min-w-0">
              <CodeEditor
                fileId={activeFileId}
                value={content}
                onChange={handleEditorChange}
                fontSizePx={editorFontSizePx}
                fontFamily={editorFontFamily}
                theme={editorTheme}
                wordWrap={editorWordWrap}
                minimap={editorMinimap}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600">
            <Command size={48} className="mb-4 opacity-20" />
            <p>
              Press <kbd className="bg-white/10 px-1 rounded text-gray-400">Ctrl+K</kbd> to search files
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
