export type RagChunkRecord = {
  id: string
  fileId: string
  startIndex: number
  endIndex: number
  text: string
  symbols: string[]
  updatedAt: number
}

const DB_NAME = 'aether-graphrag'
const DB_VERSION = 1
const STORE = 'chunks'

const openDb = async (): Promise<IDBDatabase> => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'))
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('fileId', 'fileId', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const upsertChunks = async (chunks: RagChunkRecord[]) => {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const chunk of chunks) store.put(chunk)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  db.close()
}

export const getAllChunks = async () => {
  const db = await openDb()
  const rows = await new Promise<RagChunkRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as RagChunkRecord[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return rows
}

