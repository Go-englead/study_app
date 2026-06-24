import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60, // 1分
  },
} satisfies DefaultOptions

export function createQueryClient() {
  return new QueryClient({ defaultOptions: queryConfig })
}
