import { expect, test } from '@playwright/test'

test('explains the product and makes the example decision interactive', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Review without the wreckage.' }),
  ).toBeVisible()
  const queue = page.getByRole('complementary', { name: 'Example review decision queue' })
  const acceptProposal = queue.getByRole('button', { name: 'Accept example proposal' })
  await expect(acceptProposal).toBeEnabled()
  await acceptProposal.click()

  await expect(queue.getByText('Example proposal accepted.')).toBeVisible()
  await expect(queue.getByRole('button', { name: 'Reject example proposal' })).toBeDisabled()
})

test('keeps the public entry points usable at a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create workspace' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Redline review workspace preview' })).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test('reports independent liveness and database readiness', async ({ request }) => {
  const health = await request.get('/api/v1/health')
  const readiness = await request.get('/api/v1/ready')

  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toMatchObject({ service: 'redline', status: 'ok' })
  expect(readiness.ok()).toBe(true)
  await expect(readiness.json()).resolves.toEqual({
    service: 'redline',
    status: 'ready',
    database: 'available',
  })
})
