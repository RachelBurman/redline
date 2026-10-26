import { useHasHydrated } from '#/hooks/use-has-hydrated'

function formatViewerTime(value: string) {
  return new Date(value).toLocaleString()
}

export function SignatureDateTime({ className, value }: { className?: string; value: string }) {
  const hasHydrated = useHasHydrated()
  return (
    <time className={className} dateTime={value} title={new Date(value).toISOString()}>
      {hasHydrated ? formatViewerTime(value) : new Date(value).toISOString()}
    </time>
  )
}
