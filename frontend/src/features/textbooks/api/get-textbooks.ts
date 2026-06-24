import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { textbookKeys } from '../types'

export function getTextbooksQueryOptions() {
  return queryOptions({
    queryKey: textbookKeys.list(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/textbooks')
      if (error) throw error
      return data.textbooks ?? []
    },
  })
}

export function useTextbooks() {
  return useQuery(getTextbooksQueryOptions())
}
