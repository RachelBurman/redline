import { randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'
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

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/')
})
