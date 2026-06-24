import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { textbookKeys } from '../types'

export function getTextbookQueryOptions(textbookId: string) {
  return queryOptions({
    queryKey: textbookKeys.detail(textbookId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/textbooks/{textbookId}', {
        params: { path: { textbookId } },
      })
      if (error) throw error
      return data
    },
  })
}

export function useTextbook(textbookId: string) {
  return useQuery({ ...getTextbookQueryOptions(textbookId), enabled: !!textbookId })
}
