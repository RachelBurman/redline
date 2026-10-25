import { useState } from 'react'

import { parseLatexParagraphSource, projectBlockToLatex } from '#/domain/latex/latex-projection'

import type { DocumentBlockDetail, DocumentInsertionAnchor } from '#/types/documents'

interface LatexSourceBlockProps {
  block: DocumentBlockDetail
  canReview: boolean
  isSelected: boolean
  onPropose: (block: DocumentBlockDetail, proposedContent: string) => void
  onProposeDeletion: (block: DocumentBlockDetail) => void
}

function LatexSourceBlock({
  block,
  canReview,
  isSelected,
  onPropose,
  onProposeDeletion,
}: LatexSourceBlockProps) {
  const projection = projectBlockToLatex(block)
  const [source, setSource] = useState(projection.source)
  const [error, setError] = useState<string | null>(null)

  function handleProposal() {
    const result = parseLatexParagraphSource(source)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.text === block.text) {
      setError('Change the source before creating a replacement proposal.')
      return
    }
    setError(null)
    onPropose(block, result.text)
  }

  return (
    <article
      className={`border-b border-[#e5e2da] px-5 py-4 last:border-b-0 sm:px-8 ${
        isSelected ? 'bg-[#fff3ee] ring-2 ring-inset ring-[#edb8a8]' : ''
      }`}
      data-block-id={block.id}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] font-bold tracking-wide text-[#777f7b] uppercase">
          block {block.ordinal + 1} · {block.blockType.replaceAll('_', ' ')}
        </span>
        {canReview && projection.editable ? (
          <div className="flex gap-1.5">
            <button
              className="rounded-md border border-[#d8d4cb] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#4f5b56] hover:border-[#d1735b] hover:text-[#934630]"
              onClick={handleProposal}
              type="button"
            >
              Propose source edit
            </button>
            <button
              className="rounded-md border border-[#d8d4cb] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#6f542b] hover:border-[#b88b53]"
              onClick={() => onProposeDeletion(block)}
              type="button"
            >
              Propose deletion
            </button>
          </div>
        ) : null}
      </div>
      <textarea
        aria-label={`LaTeX source for block ${block.ordinal + 1}`}
        className="min-h-20 w-full resize-y rounded-lg border border-[#d5d3cc] bg-[#1f2925] px-3 py-2 font-mono text-[13px] leading-6 text-[#eef2ef] read-only:cursor-default read-only:bg-[#29332f]"
        onChange={(event) => {
          setSource(event.target.value)
          setError(null)
        }}
        readOnly={!canReview || !projection.editable}
        spellCheck={false}
        value={source}
      />
      {projection.warning ? (
        <p className="mt-2 text-[11px] leading-4 text-[#80553d]">{projection.warning}</p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-lg bg-[#fff0eb] px-3 py-2 text-xs text-[#91452f]" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  )
}

interface LatexSourceViewerProps {
  blocks: DocumentBlockDetail[]
  canInsert: boolean
  canReview: boolean
  insertionAnchors: DocumentInsertionAnchor[]
  selectedStableKey?: string
  onPropose: (block: DocumentBlockDetail, proposedContent: string) => void
  onProposeDeletion: (block: DocumentBlockDetail) => void
  onProposeInsertion: (anchor: DocumentInsertionAnchor, proposedContent: string) => void
}

export function LatexSourceViewer({
  blocks,
  canInsert,
  canReview,
  insertionAnchors,
  selectedStableKey,
  onPropose,
  onProposeDeletion,
  onProposeInsertion,
}: LatexSourceViewerProps) {
  const [insertionSource, setInsertionSource] = useState('')
  const [insertionError, setInsertionError] = useState<string | null>(null)

  function handleInsertion() {
    const finalAnchor = insertionAnchors.at(-1)
    if (!finalAnchor) return
    const result = parseLatexParagraphSource(insertionSource)
    if (!result.ok) {
      setInsertionError(result.error)
      return
    }
    setInsertionError(null)
    onProposeInsertion(finalAnchor, result.text)
  }

  return (
    <section
      aria-label="LaTeX source projection"
      className="h-[calc(100vh-12rem)] min-h-[520px] overflow-auto rounded-2xl border border-[#dedbd3] bg-white shadow-[0_18px_50px_rgba(36,45,41,0.07)]"
    >
      <div className="border-b border-[#d9d6ce] bg-[#faf9f5] px-5 py-3 text-xs leading-5 text-[#59645f] sm:px-8">
        <p>
          Edit an escaped paragraph projection, then create the same anchored proposal used by
          normal view. Unsupported commands are rejected with a specific warning.
        </p>
        {canInsert ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label>
              <span className="sr-only">New paragraph LaTeX source</span>
              <textarea
                aria-label="New paragraph LaTeX source"
                className="min-h-16 w-full resize-y rounded-lg border border-[#d5d3cc] bg-[#1f2925] px-3 py-2 font-mono text-[13px] leading-5 text-[#eef2ef]"
                onChange={(event) => {
                  setInsertionSource(event.target.value)
                  setInsertionError(null)
                }}
                placeholder="New paragraph source"
                spellCheck={false}
                value={insertionSource}
              />
            </label>
            <button
              className="min-h-10 self-end rounded-lg border border-[#d7d4cc] bg-white px-3 text-xs font-bold text-[#4f5b56] hover:border-[#d1735b] hover:text-[#934630]"
              onClick={handleInsertion}
              type="button"
            >
              Propose paragraph at end
            </button>
            {insertionError ? (
              <p
                className="rounded-lg bg-[#fff0eb] px-3 py-2 text-xs text-[#91452f] sm:col-span-2"
                role="alert"
              >
                {insertionError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {blocks.map((block) => (
        <LatexSourceBlock
          block={block}
          canReview={canReview}
          isSelected={selectedStableKey === block.stableKey}
          key={`${block.id}:${block.contentHash}`}
          onPropose={onPropose}
          onProposeDeletion={onProposeDeletion}
        />
      ))}
    </section>
  )
}
