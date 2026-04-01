import { workerBridge } from '../workers/WorkerBridge'
import type { SerializedTree, ExtractedSymbol } from './syntaxTypes'
import { aetherLspClient } from '../../lsp/client/aetherLspClient'
import { yamlLspClient } from '../../lsp/client/yamlLspClient'

type LanguageId = 'javascript' | 'typescript' | 'tsx' | 'aether' | 'yaml'

export const parseFileContent = async (languageId: LanguageId, content: string) => {
  try {
    if (languageId === 'aether') {
      const uri = `inmemory://aether/active.aether`
      const res = await aetherLspClient.didChange(uri, content)
      return { tree: res.tree, symbols: res.symbols }
    }
    if (languageId === 'yaml') {
      const uri = `inmemory://yaml/active.yaml`
      const res = await yamlLspClient.didChange(uri, content)
      return { tree: res.tree, symbols: res.symbols }
    }
    const res = await workerBridge.postRequest<{ tree: SerializedTree; symbols: ExtractedSymbol[] }>('PARSE', {
      languageId,
      content,
    })
    return res
  } catch (e) {
    console.warn('Syntax parsing failed', e)
    return { tree: null, symbols: [] }
  }
}


export const languageIdForFile = (fileId: string): LanguageId | null => {
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml'
  if (lower.endsWith('.aether')) return 'aether'
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.ts')) return 'typescript'
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript'
  return 'aether'
}

