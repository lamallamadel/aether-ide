type SandboxRequest =
  | { id: string; type: 'activate'; payload: { extensionId: string } }
  | { id: string; type: 'deactivate'; payload: { extensionId: string } }

type SandboxResponse = { id: string; ok: boolean; error?: string }

self.onmessage = (event: MessageEvent<SandboxRequest>) => {
  const req = event.data
  try {
    const res: SandboxResponse = { id: req.id, ok: true }
    self.postMessage(res)
  } catch (error) {
    const res: SandboxResponse = { id: req.id, ok: false, error: String(error) }
    self.postMessage(res)
  }
}
