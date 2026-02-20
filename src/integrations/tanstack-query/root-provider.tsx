import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import superjson from 'superjson'
import { createTRPCClient, httpBatchStreamLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

import type { TRPCRouter } from '#/integrations/trpc/router'
import { TRPCProvider } from '#/integrations/trpc/react'

function getUrl() {
  const base = (() => {
    if (typeof window !== 'undefined') return ''
    return `http://localhost:${process.env.PORT ?? 3000}`
  })()
  return `${base}/api/trpc`
}

export const trpcClient = createTRPCClient<TRPCRouter>({
  links: [
    httpBatchStreamLink({
      transformer: superjson,
      url: getUrl(),
    }),
  ],
})

type RouterContext = {
  queryClient: QueryClient
  trpc: ReturnType<typeof createTRPCOptionsProxy<TRPCRouter>>
}

let browserContext: RouterContext | undefined

function createContext(): RouterContext {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })

  const trpc = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient,
  })

  return { queryClient, trpc }
}

export function getContext() {
  // Avoid sharing QueryClient cache across SSR requests.
  if (typeof window === 'undefined') {
    return createContext()
  }

  if (!browserContext) {
    browserContext = createContext()
  }

  return browserContext
}

export default function TanStackQueryProvider({
  children,
}: {
  children: ReactNode
}) {
  const { queryClient } = getContext()

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
