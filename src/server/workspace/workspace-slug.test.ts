import { describe, expect, it } from 'vitest'

import { createWorkspaceSlug } from './workspace-slug'

describe('createWorkspaceSlug', () => {
  it('normalises a user name and adds a collision-resistant suffix', () => {
    expect(createWorkspaceSlug('Rachél Burman & Co.', 'A1B2-C3')).toBe('rachel-burman-co-a1b2c3')
  })

  it('provides safe fallbacks for names and suffixes without URL characters', () => {
    expect(createWorkspaceSlug('!!!', '---')).toBe('workspace-default')
  })
})
