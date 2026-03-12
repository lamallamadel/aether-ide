import type { WorkerMessage, WorkerEventType, WorkerResponse } from './worker.types'

const DEFAULT_TIMEOUT_MS = 60_000

class WorkerBridge {
    private syntaxWorker: Worker | null = null
    private indexerWorker: Worker | null = null
    private syntaxWorkerInitializing = false
    private indexerWorkerInitializing = false
    private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: ReturnType<typeof setTimeout> }>()

    constructor() {
        // Lazy init is handled in postRequest
    }

    private initSyntaxWorker() {
        if (this.syntaxWorker || this.syntaxWorkerInitializing) return
        this.syntaxWorkerInitializing = true
        try {
            this.syntaxWorker = new Worker(new URL('../../workers/syntax.worker.ts', import.meta.url), {
                type: 'module',
            })
            this.setupWorkerListener(this.syntaxWorker)
        } catch (e) {
            console.error('WorkerBridge: Failed to create Syntax Worker', e)
            this.rejectAllPending('Syntax Worker failed to initialize')
        } finally {
            this.syntaxWorkerInitializing = false
        }
    }

    private initIndexerWorker() {
        if (this.indexerWorker || this.indexerWorkerInitializing) return
        this.indexerWorkerInitializing = true
        try {
            this.indexerWorker = new Worker(new URL('../../workers/indexer.worker.ts', import.meta.url), {
                type: 'module',
            })
            this.setupWorkerListener(this.indexerWorker)
        } catch (e) {
            console.error('WorkerBridge: Failed to create Indexer Worker', e)
            this.rejectAllPending('Indexer Worker failed to initialize')
        } finally {
            this.indexerWorkerInitializing = false
        }
    }

    private setupWorkerListener(worker: Worker) {
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { id, payload, error } = event.data
            const request = this.pendingRequests.get(id)

            if (request) {
                clearTimeout(request.timer)
                if (error) {
                    request.reject(error)
                } else {
                    request.resolve(payload)
                }
                this.pendingRequests.delete(id)
            }
        }

        worker.onerror = (err) => {
            console.error('Worker Error:', err)
            this.rejectAllPending('Worker crashed')
        }
    }

    private rejectAllPending(reason: string) {
        for (const [_id, { reject, timer }] of this.pendingRequests) {
            clearTimeout(timer)
            reject(new Error(reason))
        }
        this.pendingRequests.clear()
    }

    public postRequest<T = any>(type: WorkerEventType, payload: any, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
        const id = crypto.randomUUID()
        const message: WorkerMessage = { id, type, payload }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id)
                    reject(new Error(`Worker request timed out after ${timeoutMs}ms (type: ${type})`))
                }
            }, timeoutMs)

            this.pendingRequests.set(id, { resolve, reject, timer })

            let targetWorker: Worker | null = null

            switch (type) {
                case 'PARSE':
                    this.initSyntaxWorker()
                    targetWorker = this.syntaxWorker
                    break
                case 'INDEX_BUILD':
                case 'INDEX_SEARCH':
                    this.initIndexerWorker()
                    targetWorker = this.indexerWorker
                    break
                default:
                    clearTimeout(timer)
                    this.pendingRequests.delete(id)
                    reject(new Error(`Unknown worker event type: ${type}`))
                    return
            }

            if (!targetWorker) {
                clearTimeout(timer)
                this.pendingRequests.delete(id)
                reject(new Error(`Worker not available for type: ${type}`))
                return
            }

            targetWorker.postMessage(message)
        })
    }

    public terminate() {
        this.rejectAllPending('WorkerBridge terminated')
        this.syntaxWorker?.terminate()
        this.indexerWorker?.terminate()
        this.syntaxWorker = null
        this.indexerWorker = null
    }
}

export const workerBridge = new WorkerBridge()
