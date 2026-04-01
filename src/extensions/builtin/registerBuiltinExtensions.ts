import { extensionHost } from '../host'
import { aetherNativeExtension } from './aetherNative'
import { yamlNativeExtension } from './yamlNative'

let installed = false

export const registerBuiltinExtensions = async () => {
  if (!installed) {
    extensionHost.register(aetherNativeExtension)
    extensionHost.register(yamlNativeExtension)
    installed = true
  }
  await extensionHost.activateByEvent('onStartup')
}
