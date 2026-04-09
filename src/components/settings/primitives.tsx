import type { ReactNode } from 'react'

export function SettingRow(props: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded text-gray-400">{props.icon}</div>
        <div>
          <div className="text-sm font-medium text-gray-200">{props.title}</div>
          <div className="text-xs text-gray-500">{props.description}</div>
        </div>
      </div>
      <div className="min-w-[180px]">{props.children}</div>
    </div>
  )
}

export function ToggleRow(props: { icon: ReactNode; title: string; description: string; onClick: () => void; enabled: boolean }) {
  return (
    <button type="button" className="w-full flex items-center justify-between" onClick={props.onClick}>
      <div className="flex items-center gap-3 text-left">
        <div className="p-2 bg-white/5 rounded text-gray-400">{props.icon}</div>
        <div>
          <div className="text-sm font-medium text-gray-200">{props.title}</div>
          <div className="text-xs text-gray-500">{props.description}</div>
        </div>
      </div>
      <div
        className="w-9 h-5 rounded-full relative transition-colors"
        style={{ backgroundColor: props.enabled ? 'rgb(var(--color-primary-600))' : 'rgba(255,255,255,0.1)' }}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${props.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  )
}

export function InfoCard(props: { title: string; value: string }) {
  return (
    <div className="text-xs text-gray-400 bg-black/20 rounded border border-white/10 p-3">
      <div className="text-gray-500 mb-1">{props.title}</div>
      <div className="text-gray-200">{props.value}</div>
    </div>
  )
}
