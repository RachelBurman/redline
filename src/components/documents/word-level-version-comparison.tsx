import { WordLevelVersionComparisonBlock } from './word-level-version-comparison-block'

import type { DocumentVersionComparison } from '#/types/document-versions'
import type { VersionComparisonLayout } from './version-comparison-layout'

interface WordLevelVersionComparisonProps {
  comparison: DocumentVersionComparison
  layout: VersionComparisonLayout
  visibleBlocks: DocumentVersionComparison['blocks']
}

export function WordLevelVersionComparison({
  comparison,
  layout,
  visibleBlocks,
}: WordLevelVersionComparisonProps) {
  return (
    <div aria-live="polite" className="grid gap-4" data-comparison-layout={layout}>
      {visibleBlocks.map((block) => (
        <WordLevelVersionComparisonBlock
          baseVersion={comparison.baseVersion}
          block={block}
          key={block.stableKey}
          layout={layout}
          targetVersion={comparison.targetVersion}
        />
      ))}
    </div>
  )
}
