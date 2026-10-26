import type { VersionComparisonBlockSnapshot } from '#/types/document-versions'

interface VersionComparisonBlockCardProps {
  label: string
  snapshot: VersionComparisonBlockSnapshot
}

function blockDescription(snapshot: VersionComparisonBlockSnapshot) {
  if (snapshot.blockType === 'heading') return `Heading level ${snapshot.headingLevel ?? 1}`
  return snapshot.blockType.replaceAll('_', ' ')
}

export function VersionComparisonBlockCard({ label, snapshot }: VersionComparisonBlockCardProps) {
  const media = snapshot.blockType === 'rich_media' ? snapshot.media : null
  return (
    <div className="bg-white px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d7772]">
        <span>{label}</span>
        <span>{blockDescription(snapshot)}</span>
      </div>
      {media ? (
        <figure className="rounded-xl border border-[#dedbd3] bg-[#faf9f5] p-3">
          <img
            alt={media.altText}
            className="max-h-72 w-full object-contain"
            height={media.height}
            src={media.previewUrl}
            width={media.width}
          />
          {media.caption ? (
            <figcaption className="mt-2 text-sm leading-5 text-[#46514c]">
              {media.caption}
            </figcaption>
          ) : null}
          <dl className="mt-2 grid gap-1 text-[11px] text-[#68726d]">
            <div>
              <dt className="inline font-bold">Asset hash: </dt>
              <dd className="inline font-mono break-all">{media.contentHash}</dd>
            </div>
            <div>
              <dt className="inline font-bold">Dimensions: </dt>
              <dd className="inline">
                {media.width} × {media.height}px
              </dd>
            </div>
          </dl>
        </figure>
      ) : (
        <p
          className={`whitespace-pre-wrap text-[#25302c] ${
            snapshot.blockType === 'heading'
              ? 'font-serif text-lg font-semibold leading-7'
              : 'text-sm leading-6'
          }`}
        >
          {snapshot.text || 'Empty block'}
        </p>
      )}
    </div>
  )
}
