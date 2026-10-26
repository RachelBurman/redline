import { randomUUID } from 'node:crypto'

import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { localObjectStore } from '#/server/storage/local-object-store'

import { getMediaAsset } from './get-media-asset'
import { MediaAssetNotFoundError, MediaAssetStateError } from './media-errors'

const databaseUrl = process.env.DATABASE_URL ?? ''

describe('private media storage integration', () => {
  const pool = new Pool({ connectionString: databaseUrl })
  const suffix = randomUUID()
  const organizationId = `media-org-${suffix}`
  const otherOrganizationId = `media-other-org-${suffix}`
  const ownerId = `media-owner-${suffix}`
  const otherOwnerId = `media-other-owner-${suffix}`
  const projectId = randomUUID()
  const documentId = randomUUID()
  const versionId = randomUUID()
  const assetId = randomUUID()
  const objectKey = `integration-media/${documentId}/${assetId}/original`
  const previewObjectKey = `integration-media/${documentId}/${assetId}/preview`
  const bytes = new TextEncoder().encode('immutable-image-bytes')
  let databaseConnected = false

  beforeAll(async () => {
    await pool.query('select 1')
    databaseConnected = true
    await pool.query(
      `insert into "user" (id, name, email, email_verified)
       values ($1, 'Media owner', $2, true), ($3, 'Other owner', $4, true)`,
      [ownerId, `${ownerId}@example.test`, otherOwnerId, `${otherOwnerId}@example.test`],
    )
    await pool.query(
      `insert into organization (id, name, slug, created_at)
       values ($1, 'Media test', $1, now()), ($2, 'Other media test', $2, now())`,
      [organizationId, otherOrganizationId],
    )
    await pool.query(
      `insert into project (id, organization_id, name, created_by_id)
       values ($1, $2, 'Media project', $3)`,
      [projectId, organizationId, ownerId],
    )
    await pool.query(
      `insert into document (id, organization_id, project_id, title, created_by_id)
       values ($1, $2, $3, 'Media document', $4)`,
      [documentId, organizationId, projectId, ownerId],
    )
    await pool.query(
      `insert into document_version (id, document_id, version_number, origin, status, created_by_id)
       values ($1, $2, 1, 'upload', 'ready', $3)`,
      [versionId, documentId, ownerId],
    )
    await pool.query('update document set current_version_id = $1 where id = $2', [
      versionId,
      documentId,
    ])
    const stored = await localObjectStore.put(objectKey, bytes)
    const preview = await localObjectStore.put(previewObjectKey, bytes)
    await pool.query(
      `insert into media_asset
         (id, organization_id, document_id, uploaded_by_id, original_filename, object_key,
          preview_object_key, content_sha256, preview_sha256, mime_type, byte_size, width, height, status)
       values ($1, $2, $3, $4, 'opaque.png', $5, $6, $7, $8, 'image/png', $9, 1, 1, 'ready')`,
      [
        assetId,
        organizationId,
        documentId,
        ownerId,
        objectKey,
        previewObjectKey,
        stored.sha256,
        preview.sha256,
        stored.byteSize,
      ],
    )
  })

  afterAll(async () => {
    try {
      if (!databaseConnected) return
      await pool.query('delete from media_asset where id = $1', [assetId])
      await pool.query('update document set current_version_id = null where id = $1', [documentId])
      await pool.query('delete from document_version where id = $1', [versionId])
      await pool.query('delete from document where id = $1', [documentId])
      await pool.query('delete from project where id = $1', [projectId])
      await pool.query('delete from organization where id = any($1::text[])', [
        [organizationId, otherOrganizationId],
      ])
      await pool.query('delete from "user" where id = any($1::text[])', [[ownerId, otherOwnerId]])
    } finally {
      await Promise.all([
        localObjectStore.delete(objectKey),
        localObjectStore.delete(previewObjectKey),
      ])
      await pool.end()
    }
  })

  it('returns hash-verified bytes only within the owning tenant', async () => {
    const asset = await getMediaAsset({
      assetId,
      documentId,
      organizationId,
      role: 'owner',
      userId: ownerId,
      variant: 'original',
    })
    expect(asset.mimeType).toBe('image/png')
    expect(Buffer.from(asset.bytes)).toEqual(Buffer.from(bytes))

    await expect(
      getMediaAsset({
        assetId,
        documentId,
        organizationId: otherOrganizationId,
        role: 'owner',
        userId: otherOwnerId,
        variant: 'original',
      }),
    ).rejects.toBeInstanceOf(MediaAssetNotFoundError)
  })

  it('refuses an object whose bytes no longer match the canonical hash', async () => {
    await pool.query(`update media_asset set content_sha256 = $1 where id = $2`, [
      '0'.repeat(64),
      assetId,
    ])
    await expect(
      getMediaAsset({
        assetId,
        documentId,
        organizationId,
        role: 'owner',
        userId: ownerId,
        variant: 'original',
      }),
    ).rejects.toBeInstanceOf(MediaAssetStateError)
  })
})
