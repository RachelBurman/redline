import { TriangleAlert } from 'lucide-react'

export function ParserWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null

  return (
    <details className="mb-4 rounded-xl border border-[#ead5a9] bg-[#fffaf0] px-4 py-3 text-sm text-[#715a2b]">
      <summary className="flex cursor-pointer items-center gap-2 font-bold">
        <TriangleAlert aria-hidden="true" size={16} /> Import notes ({warnings.length})
      </summary>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </details>
  )
}
