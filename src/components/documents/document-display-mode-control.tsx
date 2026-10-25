import type { DocumentDisplayMode } from './document-display-mode'

interface DocumentDisplayModeControlProps {
  mode: DocumentDisplayMode
  onChange: (mode: DocumentDisplayMode) => void
}

const options: Array<{ label: string; value: DocumentDisplayMode }> = [
  { label: 'Normal', value: 'normal' },
  { label: 'LaTeX source', value: 'latex-source' },
  { label: 'Rendered LaTeX', value: 'latex-rendered' },
]

export function DocumentDisplayModeControl({ mode, onChange }: DocumentDisplayModeControlProps) {
  return (
    <fieldset className="mb-4 rounded-xl border border-[#d9d6ce] bg-white p-1.5">
      <legend className="sr-only">Document display mode</legend>
      <div className="grid grid-cols-3 gap-1" role="radiogroup">
        {options.map((option) => (
          <label
            className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-xs font-bold transition-colors ${
              mode === option.value
                ? 'bg-[#26312d] text-white'
                : 'text-[#64706a] hover:bg-[#f5f3ed]'
            }`}
            key={option.value}
          >
            <input
              checked={mode === option.value}
              className="sr-only"
              name="document-display-mode"
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            {option.label}
          </label>
        ))}
      </div>
      <p className="px-2 pt-1.5 text-[11px] leading-4 text-[#68726d]">
        This preference is private to your user on this device. It does not alter the document or
        its version hash.
      </p>
    </fieldset>
  )
}
