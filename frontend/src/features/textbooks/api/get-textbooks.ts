import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { textbookKeys, type TextbookListQuery } from '../types'

export function getTextbooksQueryOptions(query: TextbookListQuery = {}) {
  return queryOptions({
    queryKey: textbookKeys.list(query),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/textbooks', {
        params: { query: query as Record<string, unknown> },
      })
      if (error) throw error
      return data.textbooks ?? []
    },
  })
}

export function useTextbooks(query: TextbookListQuery = {}) {
  return useQuery(getTextbooksQueryOptions(query))
}
