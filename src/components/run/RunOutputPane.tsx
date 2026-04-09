/**
 * Output pane for a RunInstance — renders collected output lines
 * and scrolls to bottom on new output.
 */
import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useRunStore } from '../../run/runStore'
import { stopInstance, restartInstance } from '../../run/runEngine'
import { RefreshCw, Square, Trash2 } from 'lucide-react'

interface Props {
  instanceId: string
}

export function RunOutputPane({ instanceId }: Props) {
  const { instance, removeInstance } = useRunStore(
    useShallow((s) => ({
      instance: s.instances[instanceId],
      removeInstance: s.removeInstance,
    }))
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [instance?.outputLines.length])

  if (!instance) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
        Instance not found
      </div>
    )
  }

  const isRunning = instance.state === 'running' || instance.state === 'starting'
  const stateColor =
    instance.state === 'running'
      ? 'text-green-400'
      : instance.state === 'error'
      ? 'text-red-400'
      : instance.state === 'starting'
      ? 'text-yellow-400'
      : 'text-gray-500'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="h-7 flex items-center gap-2 px-3 border-b border-white/5 bg-[#111] shrink-0">
        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${stateColor}`}>
          {instance.state}
        </span>
        {instance.exitCode != null && (
          <span className="text-[10px] text-gray-600">exit {instance.exitCode}</span>
        )}
        <div className="flex-1" />
        {isRunning && (
          <button
            type="button"
            title="Stop"
            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            onClick={() => stopInstance(instanceId)}
          >
            <Square size={11} />
          </button>
        )}
        <button
          type="button"
          title="Restart"
          className="p-1 text-gray-500 hover:text-white transition-colors"
          onClick={() => void restartInstance(instanceId)}
        >
          <RefreshCw size={11} />
        </button>
        <button
          type="button"
          title="Clear"
          className="p-1 text-gray-500 hover:text-white transition-colors"
          onClick={() => removeInstance(instanceId)}
        >
          <Trash2 size={11} />
        </button>
      </div>
      {/* Output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[12px] text-gray-300 leading-5">
        {instance.outputLines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
