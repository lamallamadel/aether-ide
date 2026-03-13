import { db } from './AetherDB'
import type { DBVector } from './types'

const cosineSimilarity = (vecA: Float32Array, vecB: Float32Array): number => {
    if (vecA.length !== vecB.length) return 0
    let dotProduct = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }
    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export interface EmbeddingProvider {
    embed(text: string): Promise<Float32Array>
}

import { pipeline } from '@huggingface/transformers'

export const transformersEmbeddingProvider: EmbeddingProvider = {
    embed: async (text: string) => {
        const extractor = await PipelineSingleton.getInstance()
        const output = await extractor(text, { pooling: 'mean', normalize: true })
        // @huggingface/transformers returns Tensor; .data is Float32Array
        const data = (output as { data?: Float32Array }).data
        return data ?? new Float32Array((output as number[]).flat?.() ?? (Array.isArray(output) ? output : []))
    },
}

class PipelineSingleton {
    static task = 'feature-extraction'
    static model = 'Xenova/all-MiniLM-L6-v2'
    private static loading: Promise<any> | null = null
    private static instance: any = null

    static async getInstance() {
        if (this.instance) return this.instance

        if (!this.loading) {
            const load = async (device?: 'webgpu') => {
                const extractor = await pipeline(this.task as 'feature-extraction', this.model, {
                    ...(device && { device }),
                })
                return extractor
            }
            this.loading = load('webgpu').catch(() => load()).then((inst) => {
                this.instance = inst
                return inst
            }).catch((err) => {
                this.loading = null
                this.instance = null
                throw err
            })
        }
        return this.loading
    }

    static reset() {
        this.loading = null
        this.instance = null
    }
}

export type VectorStoreHealth = 'ready' | 'degraded' | 'loading' | 'error'

type HealthListener = (status: VectorStoreHealth) => void

export class VectorStore {
    private provider: EmbeddingProvider
    private healthListeners: HealthListener[] = []
    private _health: VectorStoreHealth = 'loading'

    constructor(provider: EmbeddingProvider = transformersEmbeddingProvider) {
        this.provider = provider
    }

    get health(): VectorStoreHealth { return this._health }

    onHealthChange(listener: HealthListener): () => void {
        this.healthListeners.push(listener)
        return () => { this.healthListeners = this.healthListeners.filter(l => l !== listener) }
    }

    private setHealth(status: VectorStoreHealth) {
        if (this._health === status) return
        this._health = status
        for (const l of this.healthListeners) l(status)
    }

    async persistVectors(fileId: string, chunks: { content: string; startLine: number; endLine: number }[]) {
        this.setHealth('loading')
        // Fetch existing vectors once (not per-chunk) to avoid N+1 DB queries
        let existingByHash: Map<string, DBVector>
        try {
            const existing = await db.getVectorsForFile(fileId)
            existingByHash = new Map(existing.map(v => [v.hash, v]))
        } catch {
            existingByHash = new Map()
        }

        let hadEmbedFailure = false
        const vectors: DBVector[] = []
        for (const chunk of chunks) {
            const hash = this.simpleHash(chunk.content)
            const id = `${fileId}:${chunk.startLine}-${chunk.endLine}`
            const cached = existingByHash.get(hash)
            if (cached) {
                vectors.push({ ...cached, id, startLine: chunk.startLine, endLine: chunk.endLine })
                continue
            }
            try {
                const embedding = await this.provider.embed(chunk.content)
                vectors.push({
                    id,
                    fileId,
                    content: chunk.content,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    embedding,
                    hash
                })
            } catch (err) {
                hadEmbedFailure = true
                console.warn(`VectorStore: embedding failed for ${id}, storing without vector`, err)
                vectors.push({
                    id,
                    fileId,
                    content: chunk.content,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    hash
                })
            }
        }
        try {
            await db.upsertVectors(vectors)
        } catch (err) {
            console.warn('VectorStore: failed to persist vectors', err)
            throw err
        }
        this.setHealth(hadEmbedFailure ? 'degraded' : 'ready')
    }

    async search(query: string, limit = 5): Promise<(DBVector & { score: number })[]> {
        let queryVector: Float32Array
        try {
            queryVector = await this.provider.embed(query)
        } catch {
            this.setHealth('degraded')
            return []
        }
        this.setHealth('ready')
        const allVectors = await db.getAllVectors()

        const scored = allVectors
            .filter(v => v.embedding)
            .map(v => ({
                ...v,
                score: cosineSimilarity(queryVector, v.embedding!)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)

        return scored
    }

    private simpleHash(str: string): string {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = (hash << 5) - hash + char
            hash = hash & hash // Convert to 32bit integer
        }
        return hash.toString(36)
    }
}

export const vectorStore = new VectorStore()
