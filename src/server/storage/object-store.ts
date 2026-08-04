export interface StoredObject {
  key: string
  byteSize: number
  sha256: string
}

export interface ObjectStore {
  put(key: string, value: Uint8Array): Promise<StoredObject>
  get(key: string): Promise<Uint8Array>
  delete(key: string): Promise<void>
}
