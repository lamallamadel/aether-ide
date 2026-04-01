import { extensionHost } from '../host'
import { aetherNativeExtension } from './aetherNative'

let installed = false

export const registerBuiltinExtensions = async () => {
  if (!installed) {
    extensionHost.register(aetherNativeExtension)
    installed = true
  }
  await extensionHost.activateByEvent('onStartup')
}
