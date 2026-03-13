'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { AxiosError } from 'axios'
import { type ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: (failureCount, error) => {
              const status = (error as AxiosError)?.response?.status
              if (status === 401 || status === 403 || status === 404) return false
              return failureCount < 2
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
