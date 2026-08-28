import { Link } from '@tanstack/react-router'

export function DocumentUnavailableState({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-5" id="main-content">
      <section className="max-w-md rounded-2xl border border-[#e3c7be] bg-white p-7 text-center">
        <h1 className="text-xl font-bold text-[#26312d]">Document unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-[#6d7672]">{message}</p>
        <Link
          className="mt-5 inline-flex rounded-lg bg-[#18201d] px-4 py-2.5 text-sm font-bold text-white"
          to="/app"
        >
          Return to workspace
        </Link>
      </section>
    </main>
  )
}
