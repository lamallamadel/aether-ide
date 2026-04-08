import type { ExtensionApi, ExtensionCommandContext, ExtensionModule } from '../types'

/**
 * Remote extension host — runs extension code inside a remote environment (WSL).
 * Currently a stub that registers commands locally but logs that execution
 * would happen remotely. Full implementation requires a Node process
 * running inside WSL that loads the extension module.
 */
export class RemoteExtensionHost {
  private commands = new Map<string, (ctx: ExtensionCommandContext) => void | Promise<void>>()
  private distro: string

  constructor(distro: string) {
    this.distro = distro
  }

  async activate(module: ExtensionModule): Promise<void> {
    const api: ExtensionApi = {
      registerCommand: (id, handler) => {
        this.commands.set(id, handler)
      },
    }
    await module.activate(api)
    console.info(`[RemoteHost] Extension "${module.manifest.id}" activated on WSL: ${this.distro}`)
  }

  async executeCommand(id: string, ctx: ExtensionCommandContext): Promise<void> {
    const handler = this.commands.get(id)
    if (!handler) throw new Error(`Command "${id}" not found in remote host`)
    await handler(ctx)
  }

  async deactivate(module: ExtensionModule): Promise<void> {
    await module.deactivate?.()
    this.commands.clear()
  }

  getRegisteredCommands(): string[] {
    return [...this.commands.keys()]
  }
}
