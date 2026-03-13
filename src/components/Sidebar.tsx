import { ChevronDown, ChevronRight, FileText, Code2, Braces, Box, Image as ImageIcon } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { FileNode, FileType } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { useShallow } from 'zustand/react/shallow'

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

export function Sidebar() {
  const { files, sidebarVisible } = useEditorStore(useShallow((s) => ({ files: s.files, sidebarVisible: s.sidebarVisible })))
  if (!sidebarVisible) return null

  return (
    <div className="w-64 h-full bg-[#111111] border-r border-white/5 flex flex-col shrink-0">
      <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-gray-500 uppercase border-b border-white/5">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">{files.map((node) => <FileTreeItem key={node.id} node={node} />)}</div>
    </div>
  )
}
