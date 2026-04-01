import type { ExtensionApi, ExtensionCommandContext, ExtensionModule } from '../types'

export class InProcessExtensionHost {
  private commands = new Map<string, (ctx: ExtensionCommandContext) => void | Promise<void>>()

  getApi(): ExtensionApi {
    return {
      registerCommand: (id, handler) => {
        this.commands.set(id, handler)
      },
    }
  }

  async activate(module: ExtensionModule) {
    await module.activate(this.getApi())
  }

  async deactivate(module: ExtensionModule) {
    if (module.deactivate) await module.deactivate()
  }

  async executeCommand(commandId: string, ctx: ExtensionCommandContext) {
    const cmd = this.commands.get(commandId)
    if (!cmd) return false
    await cmd(ctx)
    return true
  }
}
