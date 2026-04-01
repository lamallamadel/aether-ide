import React, { useState, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { 
  Folder, FileCode, FileJson, File, Search, X, 
  Menu, Bot, Settings, Command, ChevronRight, 
  ChevronDown, LayoutTemplate, Play, Terminal, 
  Sparkles, Hash, CornerDownLeft, Split, Maximize2
} from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * 1. TYPES & MOCK DATA
 * ------------------------------------------------------------------
 */

type FileType = 'file' | 'folder';

interface FileNode {
  id: string;
  name: string;
  type: FileType;
  language?: string;
  content?: string;
  isOpen?: boolean; // For folders
  children?: FileNode[];
  parentId?: string;
}

const INITIAL_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'aether-project',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        isOpen: true,
        parentId: 'root',
        children: [
          { 
            id: 'App.tsx', 
            name: 'App.tsx', 
            type: 'file', 
            language: 'typescript', 
            parentId: 'src',
            content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-4">\n      <h1>Welcome to Aether Code</h1>\n      <p>Supercharged by AI.</p>\n    </div>\n  );\n}` 
          },
          { 
            id: 'main.tsx', 
            name: 'main.tsx', 
            type: 'file', 
            language: 'typescript', 
            parentId: 'src',
            content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);` 
          },
          {
            id: 'utils',
            name: 'utils',
            type: 'folder',
            parentId: 'src',
            isOpen: false,
            children: [
              { id: 'helpers.ts', name: 'helpers.ts', type: 'file', language: 'typescript', parentId: 'utils', content: '// Helper functions go here' }
            ]
          }
        ]
      },
      { 
        id: 'package.json', 
        name: 'package.json', 
        type: 'file', 
        language: 'json', 
        parentId: 'root',
        content: `{\n  "name": "aether-demo",\n  "version": "1.0.0"\n}` 
      },
      { 
        id: 'readme.md', 
        name: 'README.md', 
        type: 'file', 
        language: 'markdown', 
        parentId: 'root',
        content: `# Aether Code\n\nThe future of coding is here.` 
      }
    ]
  }
];

/**
 * ------------------------------------------------------------------
 * 2. ZUSTAND STORE (State Management)
 * ------------------------------------------------------------------
 */

interface EditorState {
  files: FileNode[];
  activeFileId: string | null;
  openFiles: string[]; // IDs of files open in tabs
  sidebarVisible: boolean;
  aiPanelVisible: boolean;
  commandPaletteOpen: boolean;
  
  // Actions
  toggleFolder: (folderId: string) => void;
  openFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  toggleSidebar: () => void;
  toggleAiPanel: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  getFileContent: (fileId: string) => string;
}

// Helper to find node recursively
const findNode = (nodes: FileNode[], id: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to toggle folder open state recursively
const toggleNode = (nodes: FileNode[], id: string): FileNode[] => {
  return nodes.map(node => {
    if (node.id === id) return { ...node, isOpen: !node.isOpen };
    if (node.children) return { ...node, children: toggleNode(node.children, id) };
    return node;
  });
};

const useEditorStore = create<EditorState>((set, get) => ({
  files: INITIAL_FILES,
  activeFileId: 'App.tsx',
  openFiles: ['App.tsx', 'main.tsx'],
  sidebarVisible: true,
  aiPanelVisible: true,
  commandPaletteOpen: false,

  toggleFolder: (folderId) => set((state) => ({
    files: toggleNode(state.files, folderId)
  })),

  openFile: (fileId) => set((state) => {
    const isAlreadyOpen = state.openFiles.includes(fileId);
    return {
      activeFileId: fileId,
      openFiles: isAlreadyOpen ? state.openFiles : [...state.openFiles, fileId]
    };
  }),

  closeFile: (fileId) => set((state) => {
    const newOpenFiles = state.openFiles.filter(id => id !== fileId);
    let newActiveId = state.activeFileId;
    if (state.activeFileId === fileId) {
      newActiveId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
    }
    return {
      openFiles: newOpenFiles,
      activeFileId: newActiveId
    };
  }),

  setActiveFile: (fileId) => set({ activeFileId: fileId }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  toggleAiPanel: () => set((state) => ({ aiPanelVisible: !state.aiPanelVisible })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  
  getFileContent: (fileId) => {
    const node = findNode(get().files, fileId);
    return node?.content || '';
  }
}));

/**
 * ------------------------------------------------------------------
 * 3. UI COMPONENTS
 * ------------------------------------------------------------------
 */

// --- 3.1 File Explorer ---

const FileIcon = ({ name, type }: { name: string, type: FileType }) => {
  if (type === 'folder') return <Folder size={16} className="text-blue-400" />;
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode size={16} className="text-cyan-400" />;
  if (name.endsWith('.json')) return <FileJson size={16} className="text-yellow-400" />;
  return <File size={16} className="text-gray-400" />;
};

const FileTreeItem = ({ node, level = 0 }: { node: FileNode, level?: number }) => {
  const { toggleFolder, openFile, activeFileId } = useEditorStore();
  const isActive = activeFileId === node.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      openFile(node.id);
    }
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleClick}
        className={`
          flex items-center py-1 px-2 cursor-pointer text-sm transition-colors duration-100
          ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}
        `}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        <span className="mr-1.5 opacity-70">
          {node.type === 'folder' && (
            node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          )}
          {node.type === 'file' && <span className="w-3" />}
        </span>
        <span className="mr-2"><FileIcon name={node.name} type={node.type} /></span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && node.isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const { files, sidebarVisible } = useEditorStore();
  if (!sidebarVisible) return null;

  return (
    <div className="w-64 h-full bg-[#111111] border-r border-white/5 flex flex-col shrink-0">
      <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-gray-500 uppercase border-b border-white/5">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {files.map(node => <FileTreeItem key={node.id} node={node} />)}
      </div>
    </div>
  );
};

// --- 3.2 Editor Area (Custom Implementation without Monaco) ---

const SimpleCodeEditor = ({ value, language }: { value: string, language: string }) => {
  const lineCount = value.split('\n').length;
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex w-full h-full bg-[#1e1e1e] overflow-hidden">
      {/* Line Numbers */}
      <div className="w-12 bg-[#1e1e1e] text-gray-600 text-right pr-3 pt-4 text-sm font-mono select-none border-r border-white/5">
        {lines.map((line) => (
          <div key={line} style={{ lineHeight: '1.5rem' }}>{line}</div>
        ))}
      </div>
      {/* Code Area */}
      <textarea
        className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 pt-4 resize-none focus:outline-none border-none whitespace-pre"
        value={value}
        readOnly
        spellCheck={false}
        style={{ 
          fontFamily: '"JetBrains Mono", "Fira Code", monospace', 
          lineHeight: '1.5rem',
          tabSize: 2 
        }}
      />
    </div>
  );
};

const TabSystem = () => {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useEditorStore();

  return (
    <div className="flex h-9 bg-[#0a0a0a] border-b border-white/5 overflow-x-auto no-scrollbar">
      {openFiles.map(fileId => (
        <div 
          key={fileId}
          onClick={() => setActiveFile(fileId)}
          className={`
            group flex items-center px-3 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-white/5 select-none
            ${activeFileId === fileId ? 'bg-[#1e1e1e] text-white border-t-2 border-t-purple-500' : 'text-gray-500 hover:bg-[#151515]'}
          `}
        >
          <span className="mr-2"><FileCode size={12} className={activeFileId === fileId ? 'text-cyan-400' : 'grayscale opacity-50'} /></span>
          <span className="truncate flex-1">{fileId}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); closeFile(fileId); }}
            className={`ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-white/20 ${activeFileId === fileId ? 'opacity-100' : ''}`}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
};

const EditorArea = () => {
  const { activeFileId, getFileContent } = useEditorStore();
  const content = activeFileId ? getFileContent(activeFileId) : '// Select a file to view content';
  const language = activeFileId?.endsWith('json') ? 'json' : activeFileId?.endsWith('md') ? 'markdown' : 'typescript';

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] relative overflow-hidden">
      <TabSystem />
      <div className="flex-1 relative overflow-auto custom-scrollbar">
        {activeFileId ? (
          <SimpleCodeEditor
            language={language}
            value={content}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600">
            <Command size={48} className="mb-4 opacity-20" />
            <p>Press <kbd className="bg-white/10 px-1 rounded text-gray-400">Ctrl+K</kbd> to search files</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 3.3 AI Chat Panel (Cursor Style) ---

const AIChatPanel = () => {
  const { aiPanelVisible, toggleAiPanel } = useEditorStore();
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: 'Hello! I am Aether AI. I can see your open files. How can I help you code today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Mock Streaming Response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: 'Analyzing context...' }]);
      
      // Simulate typing effect
      let response = `Here is a suggestion for \`${userMsg}\`. \n\nI noticed you are working in App.tsx. Consider using useMemo for expensive calculations.`;
      
      setTimeout(() => {
        setMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1].text = response;
            return newArr;
        });
        setIsTyping(false);
      }, 1000);
    }, 600);
  };

  if (!aiPanelVisible) return null;

  return (
    <div className="w-80 h-full bg-[#0c0c0c] border-l border-white/5 flex flex-col shrink-0 transition-all">
      <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Aether AI</span>
        </div>
        <button onClick={toggleAiPanel} className="text-gray-500 hover:text-white">
          <Maximize2 size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`
                max-w-[90%] p-3 rounded-lg text-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-purple-900/20 text-purple-100 border border-purple-500/20' 
                  : 'bg-[#1a1a1a] text-gray-300 border border-white/5'}
              `}
            >
              {msg.text}
            </div>
            {msg.role === 'ai' && <div className="mt-1 text-[10px] text-gray-600 uppercase">Context Aware</div>}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-1 text-gray-500 text-xs ml-2">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce delay-75">●</span>
            <span className="animate-bounce delay-150">●</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-[#111111] border-t border-white/5">
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask AI about your code (Ctrl+L)"
            className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-md p-3 pr-10 border border-white/5 focus:border-purple-500/50 focus:outline-none resize-none h-24 custom-scrollbar"
          />
          <button 
            onClick={sendMessage}
            className="absolute bottom-2 right-2 p-1.5 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors"
          >
            <CornerDownLeft size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 3.4 Command Palette (Spotlight Style) ---

const CommandPalette = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, files, openFile } = useEditorStore();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten files for search
  const getAllFiles = (nodes: FileNode[]): FileNode[] => {
    let result: FileNode[] = [];
    for (const node of nodes) {
      if (node.type === 'file') result.push(node);
      if (node.children) result = [...result, ...getAllFiles(node.children)];
    }
    return result;
  };

  const fileList = getAllFiles(files);
  const filteredFiles = fileList.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)}>
      <div 
        className="w-[600px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <Search size={18} className="text-gray-500 mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            className="flex-1 bg-transparent text-white text-lg placeholder-gray-600 focus:outline-none"
            placeholder="Search files or run commands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400">ESC</div>
        </div>
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filteredFiles.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No results found</div>
          ) : (
            filteredFiles.map((file, idx) => (
              <div 
                key={file.id}
                onClick={() => { openFile(file.id); setCommandPaletteOpen(false); }}
                className={`
                  flex items-center px-4 py-2 cursor-pointer
                  ${idx === 0 ? 'bg-purple-500/10 text-white' : 'text-gray-400 hover:bg-white/5'}
                `}
              >
                <FileCode size={14} className="mr-3 text-gray-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-600">{file.parentId}</span>
                </div>
              </div>
            ))
          )}
          
          <div className="px-4 py-2 mt-2 text-xs font-bold text-gray-600 uppercase tracking-wider">Commands</div>
          <div className="flex items-center px-4 py-2 text-gray-400 hover:bg-white/5 cursor-pointer">
            <Bot size={14} className="mr-3" />
            <span>Ask AI Assistant</span>
          </div>
          <div className="flex items-center px-4 py-2 text-gray-400 hover:bg-white/5 cursor-pointer">
            <LayoutTemplate size={14} className="mr-3" />
            <span>Toggle Sidebar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 3.5 Status Bar ---

const StatusBar = () => {
  return (
    <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-xs select-none z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <Split size={12} />
          <span>master*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <X size={12} className="rounded-full bg-white/20 p-0.5" />
          <span>0 errors</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">Ln 12, Col 43</span>
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">UTF-8</span>
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">TypeScript React</span>
        <span className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <Bot size={12} />
          <span>Aether Copilot Ready</span>
        </span>
      </div>
    </div>
  );
};

/**
 * ------------------------------------------------------------------
 * 4. MAIN LAYOUT
 * ------------------------------------------------------------------
 */

export default function App() {
  const { setCommandPaletteOpen, toggleSidebar, toggleAiPanel } = useEditorStore();

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K for Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Ctrl+B for Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl+L for AI
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        toggleAiPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Activity Bar (Leftmost Slim) */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-12 bg-[#111111] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg"><Menu size={20} /></div>
          <div className="w-6 h-[1px] bg-white/10 my-1"></div>
          <div className="p-2 text-white border-l-2 border-white"><File size={20} /></div>
          <div className="p-2 text-gray-500 hover:text-white transition-colors"><Search size={20} /></div>
          <div className="p-2 text-gray-500 hover:text-white transition-colors"><Bot size={20} /></div>
          <div className="flex-1"></div>
          <div className="p-2 text-gray-500 hover:text-white transition-colors"><Settings size={20} /></div>
        </div>

        {/* Main Content Area */}
        <Sidebar />
        <EditorArea />
        <AIChatPanel />
      </div>

      <StatusBar />
      <CommandPalette />
      
      {/* Global Style overrides for scrollbars and text selection */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 5px; border: 2px solid #111; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
        
        ::selection { background: rgba(147, 51, 234, 0.3); color: white; }
        
        /* Animation Utility Classes */
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation: fadeIn 0.15s ease-out forwards; }
      `}</style>
    </div>
  );
}