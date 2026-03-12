import type { DBFile, DBVector } from './types'

const DB_NAME = 'Aether_IDE_DB'
const DB_VERSION = 1

export class AetherDB {
    private db: IDBDatabase | null = null
    private isReady: Promise<void>

    constructor() {
        this.isReady = this.init()
    }

    private init(): Promise<void> {
        if (typeof indexedDB === 'undefined') {
            return Promise.resolve() // Degraded mode: db stays null, all methods will reject
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onupgradeneeded = (e: any) => {
                const db = e.target.result as IDBDatabase

                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id' })
                    fileStore.createIndex('parentId', 'parentId', { unique: false })
                }

                if (!db.objectStoreNames.contains('vectors')) {
                    const vectorStore = db.createObjectStore('vectors', { keyPath: 'id' })
                    vectorStore.createIndex('fileId', 'fileId', { unique: false })
                }
            }

            request.onsuccess = (e: any) => {
                this.db = e.target.result
                resolve()
            }

            request.onerror = (_e: any) => reject(request.error)
        })
    }

    async getAllFiles(): Promise<DBFile[]> {
        await this.isReady
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized')
            const tx = this.db.transaction('files', 'readonly')
            const request = tx.objectStore('files').getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    async saveFile(file: DBFile): Promise<void> {
        await this.isReady
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized')
            const tx = this.db.transaction('files', 'readwrite')
            tx.objectStore('files').put(file)
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    }

    async upsertVectors(vectors: DBVector[]): Promise<void> {
        await this.isReady
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized')
            const tx = this.db.transaction('vectors', 'readwrite')
            const store = tx.objectStore('vectors')
            for (const v of vectors) {
                store.put(v)
            }
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    }

    async getVectorsForFile(fileId: string): Promise<DBVector[]> {
        await this.isReady
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized')
            const tx = this.db.transaction('vectors', 'readonly')
            const index = tx.objectStore('vectors').index('fileId')
            const request = index.getAll(fileId)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    async getAllVectors(): Promise<DBVector[]> {
        await this.isReady
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized')
            const tx = this.db.transaction('vectors', 'readonly')
            const request = tx.objectStore('vectors').getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }
}

export const db = new AetherDB()
