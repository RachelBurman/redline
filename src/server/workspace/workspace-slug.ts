export function createWorkspaceSlug(name: string, suffix: string) {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  const safeSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)

  return `${base || 'workspace'}-${safeSuffix || 'default'}`
}
