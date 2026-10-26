import { randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'
import { Document, Packer, Paragraph } from 'docx'
import { config } from 'dotenv'
import { Pool } from 'pg'

config({ path: ['.env.local', '.env'], quiet: true })

const email = `phase1-e2e-${randomUUID()}@example.test`
const password = 'Phase1-e2e-password!'

test.afterAll(async () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  const pool = new Pool({ connectionString: databaseUrl })
  const client = await pool.connect()

  try {
    await client.query('begin')
    const userResult = await client.query<{ id: string }>(
      'select id from "user" where email = $1',
      [email],
    )
    const userId = userResult.rows[0]?.id

    if (userId) {
      const organizationResult = await client.query<{ organization_id: string }>(
        'select organization_id from member where user_id = $1',
        [userId],
      )
      const organizationIds = organizationResult.rows.map((row) => row.organization_id)

      if (organizationIds.length > 0) {
        await client.query('alter table audit_event disable trigger audit_event_append_only')
        await client.query('delete from audit_event where organization_id = any($1::text[])', [
          organizationIds,
        ])
        await client.query('alter table audit_event enable trigger audit_event_append_only')
        await client.query(
          `delete from signature_slot
           where signature_request_id in (
             select id from signature_request where organization_id = any($1::text[])
           )`,
          [organizationIds],
        )
        await client.query(
          'delete from signature_request where organization_id = any($1::text[])',
          [organizationIds],
        )
        const documentResult = await client.query<{ id: string }>(
          'select id from document where organization_id = any($1::text[])',
          [organizationIds],
        )
        const documentIds = documentResult.rows.map((row) => row.id)
        if (documentIds.length > 0) {
          await client.query(
            'delete from review_assignment where review_round_id in (select id from review_round where document_id = any($1::uuid[]))',
            [documentIds],
          )
          await client.query('delete from review_round where document_id = any($1::uuid[])', [
            documentIds,
          ])
          await client.query(
            'delete from document_block where document_version_id in (select id from document_version where document_id = any($1::uuid[]))',
            [documentIds],
          )
          await client.query(
            'update document set current_version_id = null where id = any($1::uuid[])',
            [documentIds],
          )
          await client.query('delete from document_version where document_id = any($1::uuid[])', [
            documentIds,
          ])
          await client.query('delete from document where id = any($1::uuid[])', [documentIds])
        }
        await client.query('delete from project where organization_id = any($1::text[])', [
          organizationIds,
        ])
        await client.query('delete from organization where id = any($1::text[])', [organizationIds])
      }

      await client.query('delete from "user" where id = $1', [userId])
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
})

test('creates a real account, authenticated session, and first workspace', async ({ page }) => {
  await page.goto('/sign-up')
  const nameField = page.getByLabel('Your name')
  await expect(nameField).toBeEnabled()
  await nameField.fill('Phase One Reviewer')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  const createWorkspace = page.getByRole('button', { name: 'Create your workspace' })
  await expect(createWorkspace).toBeEnabled()
  await createWorkspace.click()

  await expect(page).toHaveURL(/\/app\/?$/)
  await expect(
    page.getByRole('heading', { level: 2, name: 'Your workspace is ready.' }),
  ).toBeVisible()
  await expect(page.getByText('Audit trail active')).toBeVisible()
  await expect(page.getByText('1. Upload')).toBeVisible()
  await expect(page.getByText('2. Review')).toBeVisible()
  await expect(page.getByText('3. Publish')).toBeVisible()

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  await pool.query('update "user" set email_verified = true where email = $1', [email])
  await pool.end()

  const documentBytes = await Packer.toBuffer(
    new Document({
      sections: [
        {
          children: [
            new Paragraph('Final approval document'),
            new Paragraph('This exact version is ready for electronic sign-off.'),
          ],
        },
      ],
    }),
  )
  await page.locator('input[type="file"]').setInputFiles({
    name: 'final-approval.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: documentBytes,
  })
  await page.getByText('Review title').locator('..').getByRole('textbox').fill('Final agreement')
  await page.getByRole('button', { name: 'Upload and review' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Final agreement' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign just me' }).click()
  await expect(page.getByText('Awaiting signatures')).toBeVisible()
  await page.getByRole('button', { name: 'Review and sign' }).click()
  await expect(page.getByRole('heading', { name: 'Sign Final agreement, version 1' })).toBeVisible()
  await expect(page.getByText(/reviewed “Final agreement” version 1/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm electronic signature' }).click()
  await expect(page.getByText('Fully signed')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Certificate' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manifest' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/')
})
