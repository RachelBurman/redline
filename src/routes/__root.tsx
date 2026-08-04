import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Redline — Clear, auditable document review',
      },
      {
        name: 'description',
        content:
          'Review documents with structured proposals, clear decisions, immutable versions, and a complete audit trail.',
      },
      {
        name: 'theme-color',
        content: '#f7f6f1',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#f7f6f1] text-[#18201d] antialiased">
        <a
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-[#18201d] px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
          href="#main-content"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
