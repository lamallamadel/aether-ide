export function KeybindingsSettings() {
  return (
    <div className="space-y-4">
      <h3 id="settings-panel-keybindings" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Keybindings</h3>
      <ul className="space-y-2 text-sm text-gray-300">
        <li>Ctrl/Cmd+K &mdash; Command Palette</li>
        <li>Ctrl/Cmd+, &mdash; Open Settings</li>
        <li>Ctrl/Cmd+B &mdash; Toggle Sidebar</li>
        <li>Ctrl/Cmd+L &mdash; Toggle AI Panel</li>
        <li>Ctrl/Cmd+Shift+O &mdash; Go to Symbol</li>
        <li>Ctrl/Cmd+Shift+X &mdash; Extensions</li>
        <li>Ctrl/Cmd+` &mdash; Toggle Terminal</li>
      </ul>
      <p className="text-xs text-gray-500">Custom keymap editor: coming soon.</p>
    </div>
  )
}
