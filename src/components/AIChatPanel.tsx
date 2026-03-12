import { AlertTriangle, Brain, CornerDownLeft, Maximize2, Sparkles, User, Bot } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../state/editorStore'
import { MarkdownRenderer } from './MarkdownRenderer'
import { graphragQuery } from '../services/graphrag/graphrag'

type ChatMessage = { role: 'user' | 'ai'; text: string }

export function AIChatPanel() {
  const { aiPanelVisible, toggleAiPanel, aiHealth } = useEditorStore()
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Hello! I am Aether AI. I can see your open files. How can I help you code today?' },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current) window.clearTimeout(t)
      timeoutsRef.current = []
    }
  }, [])

  const MAX_INPUT_LENGTH = 2000

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMsg = input.trim().slice(0, MAX_INPUT_LENGTH)
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setInput('')
    setIsTyping(true)

    const t1 = window.setTimeout(async () => {
      // 1. Check for basic greetings (UX Polish)
      const lowerMsg = userMsg.toLowerCase().trim()
      const greetings = ['hello', 'hi', 'hey', 'salut', 'bonjour', 'hola']
      if (greetings.includes(lowerMsg)) {
          setMessages((prev) => [...prev, { role: 'ai', text: "Hello! I'm ready to help you navigate your codebase. Try asking me to find a specific component or logic." }])
          setIsTyping(false)
          return
      }

      setMessages((prev) => [...prev, { role: 'ai', text: 'Searching knowledge base...' }])

      try {
        const results = await graphragQuery(userMsg, 3)
        let response = ''

        if (results.length === 0) {
            response = `I couldn't find any specific code related to "${userMsg}" in the indexed files.`
        } else {
            response = `I found **${results.length}** relevant snippets for your query:\n\n`
            results.forEach((res) => {
                response += `**File:** \`${res.chunk.fileId}\` (Score: ${Math.round(res.score * 100)}%)\n`
                response += '```typescript\n'
                // Truncate if too long for chat
                const content = res.chunk.text.length > 300 ? res.chunk.text.slice(0, 300) + '...' : res.chunk.text
                response += content + '\n'
                response += '```\n\n'
            })
        }

        setMessages((prev) => {
          const newArr = [...prev]
          const last = newArr[newArr.length - 1]
          if (last && last.role === 'ai') {
            newArr[newArr.length - 1] = { ...last, text: response }
          }
          return newArr
        })
      } catch (e) {
        console.error(e)
        setMessages((prev) => {
            const newArr = [...prev]
            const last = newArr[newArr.length - 1]
            if (last && last.role === 'ai') {
              newArr[newArr.length - 1] = { ...last, text: 'Error querying Aether Intelligence.' }
            }
            return newArr
          })
      }
      
      setIsTyping(false)
    }, 600)

    timeoutsRef.current.push(t1)
  }

  if (!aiPanelVisible) return null

  return (
    <div className="w-80 h-full bg-[#0c0c0c] border-l border-white/5 flex flex-col shrink-0 transition-all">
      <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--color-primary-400))' }}>
          <Sparkles size={14} />
          <span>Aether AI</span>
        </div>
        <button onClick={toggleAiPanel} className="text-gray-500 hover:text-white" type="button">
          <Maximize2 size={12} />
        </button>
      </div>

      {aiHealth === 'degraded' && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-medium text-amber-300">Reduced Intelligence</div>
            <div className="text-[10px] text-amber-400/70 mt-0.5">
              Embedding model unavailable. Results use keyword matching only.
            </div>
          </div>
        </div>
      )}
      {aiHealth === 'offline' && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <Brain size={14} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-medium text-red-300">AI Offline</div>
            <div className="text-[10px] text-red-400/70 mt-0.5">
              Search is unavailable. Check your network connection.
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0
                    ${msg.role === 'user' ? 'bg-primary-500/20 text-primary-200' : 'bg-white/10 text-emerald-400'}
                `}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div>
                    <div
                      className={`
                        p-3 rounded-lg text-sm leading-relaxed
                        ${
                          msg.role === 'user'
                            ? ''
                            : 'bg-[#1a1a1a] text-gray-300 border border-white/5'
                        }
                      `}
                      style={
                        msg.role === 'user'
                          ? {
                              backgroundColor: 'rgb(var(--color-primary-900) / 0.2)',
                              color: 'rgb(var(--color-primary-100))',
                              borderColor: 'rgb(var(--color-primary-500) / 0.2)',
                            }
                          : {}
                      }
                    >
                      <MarkdownRenderer content={msg.text} />
                    </div>
                    {msg.role === 'ai' && (
                      <div className="mt-1 text-[10px] uppercase" style={{ color: aiHealth === 'degraded' ? '#f59e0b' : aiHealth === 'offline' ? '#ef4444' : '#6b7280' }}>
                        {aiHealth === 'degraded' ? 'Keyword Search' : aiHealth === 'offline' ? 'Offline' : 'Context Aware'}
                      </div>
                    )}
                </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-1 text-gray-500 text-xs ml-12">
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder="Ask AI about your code (Ctrl+L)"
            maxLength={MAX_INPUT_LENGTH}
            className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-md p-3 pr-10 border border-white/5 focus:outline-none resize-none h-24 custom-scrollbar"
            style={{ borderColor: 'rgb(var(--color-primary-500) / 0.5)' }}
          />
          <button
            onClick={() => void sendMessage()}
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
            className="absolute bottom-2 right-2 p-1.5 text-white rounded transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500))')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))')}
            type="button"
          >
            <CornerDownLeft size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
