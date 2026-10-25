import { expect, test } from '@playwright/test'

const documentId = 'bc943b2e-6c9e-4fd7-a337-cc3cf6f93402'
const userId = 'comparison-user'

const comparison = {
  documentId,
  baseVersion: { id: 'version-1', versionNumber: 1 },
  targetVersion: { id: 'version-2', versionNumber: 2 },
  summary: { added: 0, modified: 1, removed: 0, unchanged: 0, totalChanges: 1 },
  blocks: [
    {
      stableKey: 'paragraph-1',
      changeType: 'modified',
      base: {
        stableKey: 'paragraph-1',
        ordinal: 0,
        blockType: 'paragraph',
        text: 'A representative manuscript paragraph with the original wording and enough text to wrap naturally.',
        headingLevel: null,
      },
      target: {
        stableKey: 'paragraph-1',
        ordinal: 0,
        blockType: 'paragraph',
        text: 'A representative manuscript paragraph with the revised wording and enough text to wrap naturally.',
        headingLevel: null,
      },
    },
  ],
}

const versions = [
  {
    id: 'version-2',
    versionNumber: 2,
    origin: 'checkpoint',
    note: 'Revised wording',
    parentVersionId: 'version-1',
    restoredFromVersion: null,
    createdBy: { id: userId, name: 'Comparison Reviewer' },
    createdAt: '2026-10-25T12:00:00.000Z',
    publishedAt: '2026-10-25T12:00:00.000Z',
    isCurrent: true,
    blockCount: 1,
    acceptedChangeCount: 0,
    unresolvedReviewItemCount: 0,
  },
  {
    id: 'version-1',
    versionNumber: 1,
    origin: 'upload',
    note: null,
    parentVersionId: null,
    restoredFromVersion: null,
    createdBy: { id: userId, name: 'Comparison Reviewer' },
    createdAt: '2026-10-24T12:00:00.000Z',
    publishedAt: '2026-10-24T12:00:00.000Z',
    isCurrent: false,
    blockCount: 1,
    acceptedChangeCount: 0,
    unresolvedReviewItemCount: 0,
  },
]

async function mockComparisonWorkspace(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname === '/api/v1/auth/get-session') {
      await route.fulfill({
        json: {
          session: {
            id: 'session-1',
            userId,
            token: 'test-token',
            expiresAt: '2026-10-26T12:00:00.000Z',
            createdAt: '2026-10-25T12:00:00.000Z',
            updatedAt: '2026-10-25T12:00:00.000Z',
          },
          user: {
            id: userId,
            name: 'Comparison Reviewer',
            email: 'comparison@example.test',
            emailVerified: true,
            createdAt: '2026-10-25T12:00:00.000Z',
            updatedAt: '2026-10-25T12:00:00.000Z',
          },
        },
      })
      return
    }

    if (url.pathname === '/api/v1/workspace') {
      await route.fulfill({
        json: {
          data: {
            capabilities: { createDocument: true, manageReviewers: false },
            organization: {
              id: 'organization-1',
              name: 'Redline Test',
              slug: 'redline-test',
              role: 'editor',
            },
            project: { id: 'project-1', name: 'Editorial' },
          },
        },
      })
      return
    }

    if (url.pathname.endsWith('/presence')) {
      await route.fulfill({
        json: {
          data: request.method() === 'POST' ? { lastSeenAt: '2026-10-25T12:00:00.000Z' } : [],
        },
      })
      return
    }

    if (url.pathname.endsWith('/review-items')) {
      await route.fulfill({ json: { data: [] } })
      return
    }

    if (url.pathname.endsWith('/versions/compare')) {
      await route.fulfill({ json: { data: comparison } })
      return
    }

    if (url.pathname.endsWith('/versions')) {
      await route.fulfill({ json: { data: versions } })
      return
    }

    if (url.pathname === `/api/v1/documents/${documentId}`) {
      await route.fulfill({
        json: {
          data: {
            capabilities: {
              comment: true,
              exportDocument: false,
              exportReviewQueue: false,
              manageAssignments: false,
              manageVersions: false,
              review: true,
              viewAudit: false,
              resolve: true,
            },
            document: {
              id: documentId,
              title: 'Accessible comparison fixture',
              createdAt: '2026-10-24T12:00:00.000Z',
            },
            version: {
              id: 'version-2',
              versionNumber: 2,
              origin: 'checkpoint',
              note: 'Revised wording',
              isCurrent: true,
              parserWarnings: [],
              createdAt: '2026-10-25T12:00:00.000Z',
            },
            reviewRound: { id: 'round-2', name: 'Review round 2' },
            insertionAnchors: [],
            blocks: [],
          },
        },
      })
      return
    }

    await route.fulfill({ status: 404, json: { error: { message: 'Unhandled test route.' } } })
  })
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`switches accessible comparison layouts at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockComparisonWorkspace(page)
    await page.goto(`/app/documents/${documentId}`)

    await expect(page.getByRole('heading', { name: 'Accessible comparison fixture' })).toBeVisible()
    await page.getByRole('button', { name: /Version history/ }).click()
    await page.getByRole('button', { name: 'Compare versions' }).click()

    await expect(page.getByRole('heading', { name: 'Version 1 to version 2' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Version history/ })).toHaveCount(0)
    const changedRegion = page.getByRole('article', { name: 'Changed paragraph' })
    await expect(changedRegion).toHaveAccessibleDescription(
      'Changed paragraph. Version 1 is the old version and version 2 is the new version.',
    )
    await expect(changedRegion.getByRole('region', { name: 'Old version 1' })).toContainText(
      'original wording',
    )
    await expect(changedRegion.getByRole('region', { name: 'New version 2' })).toContainText(
      'revised wording',
    )
    await expect(changedRegion.locator('del')).toContainText('original')
    await expect(changedRegion.locator('ins')).toContainText('revised')

    const splitButton = page.getByRole('button', { name: 'Split' })
    await splitButton.click()
    await expect(splitButton).toHaveAttribute('aria-pressed', 'true')
    await expect(changedRegion).toHaveAttribute('data-comparison-layout', 'split')
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      )
      .toBe(true)

    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        `redline:version-comparison-layout:${userId}`,
      ),
    ).toBe('split')

    await page.getByRole('button', { name: 'Use structured view' }).click()
    const structuredRegion = page.getByRole('article', { name: 'Changed document block' })
    await expect(structuredRegion).toContainText('original wording')
    await expect(structuredRegion).toContainText('revised wording')
  })
}
