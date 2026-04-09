import { ChevronDown, ChevronRight, FileText, Code2, Braces, Box, Image as ImageIcon, ListTree } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { FileNode, FileType } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { useShallow } from 'zustand/react/shallow'
import { ExtensionSidebar } from './extensions/ExtensionSidebar'

function FileIcon({ name, type, isActive }: { name: string; type: FileType; isActive: boolean }) {
  const iconColor = isActive ? 'rgb(var(--color-primary-400))' : undefined
  
  if (type === 'folder') {
      return <Box size={16} color={iconColor ?? 'rgb(96 165 250)'} strokeWidth={1.5} />
  }

  const lower = name.toLowerCase()
  if (lower.endsWith('.tsx') || lower.endsWith('.ts')) {
      return <Code2 size={16} color={iconColor ?? 'rgb(34 211 238)'} strokeWidth={1.5} />
  }
  if (lower.endsWith('.json')) {
      return <Braces size={16} color={iconColor ?? 'rgb(250 204 21)'} strokeWidth={1.5} />
  }
  if (lower.endsWith('.md')) {
      return <FileText size={16} color={iconColor ?? 'rgb(167 139 250)'} strokeWidth={1.5} />
  }
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.svg')) {
      return <ImageIcon size={16} color={iconColor ?? 'rgb(244 114 182)'} strokeWidth={1.5} />
  }

  return <FileText size={16} color={iconColor ?? 'rgb(156 163 175)'} strokeWidth={1.5} />
}

function FileTreeItem({ node, level = 0 }: { node: FileNode; level?: number }) {
  const { toggleFolder, openFile, activeFileId } = useEditorStore()
  const isActive = activeFileId === node.id

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'folder') {
      toggleFolder(node.id)
    } else {
      openFile(node.id)
    }
  }

  return (
    <div className="select-none">
        <div
          onClick={handleClick}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600) / 0.1)' }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '' }}
          className={`
            flex items-center py-1 px-2 cursor-pointer text-sm transition-colors duration-100
            ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}
          `}
          style={{
            paddingLeft: `${level * 12 + 12}px`,
            backgroundColor: isActive ? 'rgb(var(--color-primary-600) / 0.2)' : undefined,
            color: isActive ? 'rgb(var(--color-primary-100))' : undefined,
          }}
        >
        <span className="mr-1.5 opacity-70">
          {node.type === 'folder' && (node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
          {node.type === 'file' && <span className="w-3" />}
        </span>
        <span className="mr-2">
          <FileIcon name={node.name} type={node.type} isActive={isActive} />
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function OutlinePanel() {
  const { activeFileId, symbolsByFile, openFile } = useEditorStore(
    useShallow((s) => ({
      activeFileId: s.activeFileId,
      symbolsByFile: s.symbolsByFile,
      openFile: s.openFile,
    }))
  )
  const symbols = activeFileId ? symbolsByFile[activeFileId] ?? [] : []
  if (!activeFileId || symbols.length === 0) return null

  const sorted = [...symbols].filter((s) => s.name?.trim()).sort((a, b) => a.startIndex - b.startIndex)

  return (
    <div className="border-t border-white/5 flex flex-col min-h-0 max-h-[40%] shrink">
      <div className="h-8 flex items-center px-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase border-b border-white/5 shrink-0">
        <ListTree size={12} className="mr-1.5 opacity-70" />
        Outline
      </div>
      <div className="overflow-y-auto py-1 custom-scrollbar text-xs">
        {sorted.map((s) => (
          <button
            key={`${s.kind}-${s.name}-${s.startIndex}`}
            type="button"
            className="w-full text-left px-3 py-1 text-gray-400 hover:text-white hover:bg-white/5 truncate"
            title={`${s.name} (${s.kind})`}
            onClick={() => {
              openFile(activeFileId)
              window.dispatchEvent(
                new CustomEvent('aether-goto-symbol', {
                  detail: { fileId: activeFileId, startIndex: s.startIndex },
                })
              )
            }}
          >
            <span className="text-gray-200">{s.name}</span>
            <span className="ml-2 text-[10px] text-gray-600">{s.kind}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Sidebar() {
  const { files, sidebarVisible, sidebarView } = useEditorStore(useShallow((s) => ({ files: s.files, sidebarVisible: s.sidebarVisible, sidebarView: s.sidebarView })))
  if (!sidebarVisible) return null

  if (sidebarView === 'extensions') {
    return (
      <div className="w-64 h-full bg-[#111111] border-r border-white/5 flex flex-col shrink-0 min-h-0">
        <ExtensionSidebar />
      </div>
    )
  }

  return (
    <div className="w-64 h-full bg-[#111111] border-r border-white/5 flex flex-col shrink-0 min-h-0">
      <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-gray-500 uppercase border-b border-white/5 shrink-0">
        Explorer
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto py-2 custom-scrollbar">
        {files.map((node) => (
          <FileTreeItem key={node.id} node={node} />
        ))}
      </div>
      <OutlinePanel />
    </div>
  )
}
