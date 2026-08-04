import { createHash } from 'node:crypto'
import { mkdir, open, readFile, rm } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

import type { ObjectStore } from './object-store'

const storageRoot = resolve(process.env.OBJECT_STORAGE_ROOT ?? '.data/object-storage')

function resolveObjectPath(key: string) {
  if (!key || isAbsolute(key) || key.includes('..') || key.includes('\\')) {
    throw new Error('The object key is invalid.')
  }

  const objectPath = resolve(storageRoot, key)
  const relativePath = relative(storageRoot, objectPath)

  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('The object key is outside the configured storage root.')
  }

  return objectPath
}

export const localObjectStore: ObjectStore = {
  async put(key, value) {
    const objectPath = resolveObjectPath(key)
    await mkdir(dirname(objectPath), { recursive: true })
    const handle = await open(objectPath, 'wx')

    try {
      await handle.writeFile(value)
    } finally {
      await handle.close()
    }

    return {
      key,
      byteSize: value.byteLength,
      sha256: createHash('sha256').update(value).digest('hex'),
    }
  },

  async get(key) {
    return readFile(resolveObjectPath(key))
  },

  async delete(key) {
    await rm(resolveObjectPath(key), { force: true })
  },
}
