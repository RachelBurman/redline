export type VersionComparisonLayout = 'unified' | 'split'

export function isVersionComparisonLayout(value: string | null): value is VersionComparisonLayout {
  return value === 'unified' || value === 'split'
}
