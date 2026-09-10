import { openDB, type DBSchema } from 'idb'
import type { Pattern } from '../types/pattern'

interface StitchesDB extends DBSchema {
  patterns: {
    key: string
    value: Pattern
  }
}

const dbPromise = openDB<StitchesDB>('stiches-on-fire', 1, {
  upgrade(db) {
    db.createObjectStore('patterns', { keyPath: 'id' })
  },
})

export async function savePattern(pattern: Pattern): Promise<void> {
  const db = await dbPromise
  await db.put('patterns', pattern)
}

export async function loadPattern(id: string): Promise<Pattern | undefined> {
  const db = await dbPromise
  return db.get('patterns', id)
}

export async function listPatterns(): Promise<Pattern[]> {
  const db = await dbPromise
  return db.getAll('patterns')
}

export async function deletePattern(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete('patterns', id)
}
