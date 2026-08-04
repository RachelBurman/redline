import { FileUp, ShieldCheck } from 'lucide-react'

interface EmptyProjectProps {
  projectName: string
}

export function EmptyProject({ projectName }: EmptyProjectProps) {
  return (
    <section
      aria-labelledby="project-heading"
      className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8"
    >
      <div className="flex flex-col gap-3 border-b border-[#dcdad3] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#a64e38] uppercase">
            Project
          </p>
          <h1
            className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#1d2824]"
            id="project-heading"
          >
            {projectName}
          </h1>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e7f0eb] px-3 py-1.5 text-xs font-bold text-[#35634f]">
          <ShieldCheck aria-hidden="true" size={14} /> Audit trail active
        </span>
      </div>

      <div className="mt-8 rounded-2xl border border-[#dad8d0] bg-white p-7 shadow-[0_16px_45px_rgba(42,51,47,0.06)] sm:p-10">
        <div className="grid size-12 place-items-center rounded-xl bg-[#f9e8e1] text-[#ac5139]">
          <FileUp aria-hidden="true" size={22} />
        </div>
        <h2 className="mt-6 text-xl font-bold text-[#24302b]">Your workspace is ready.</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#68736e]">
          Next, upload a Word document. Redline will preserve the source file and extract headings
          and paragraphs into a version-safe review copy.
        </p>
        <button
          className="mt-6 rounded-lg bg-[#18201d] px-4 py-2.5 text-sm font-bold text-white opacity-50"
          disabled
          type="button"
        >
          Document upload is the next milestone
        </button>
      </div>
    </section>
  )
}
