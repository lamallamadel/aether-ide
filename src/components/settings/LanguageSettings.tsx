import { InfoCard } from './primitives'

export function LanguageSettings() {
  return (
    <div className="space-y-4">
      <h3 id="settings-panel-languages" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Languages</h3>
      <InfoCard title="Default language for new files" value="aether (.aether)" />
      <InfoCard title="File associations" value=".yaml/.yml -> yaml, .aether -> aether" />
      <InfoCard title="Language support source" value="Built-in native extensions + syntax clients" />
    </div>
  )
}
