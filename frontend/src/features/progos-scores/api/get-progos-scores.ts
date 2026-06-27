import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { progosKeys } from '../types'

export function getProgosScoresQueryOptions(memberId: string) {
  return queryOptions({
    queryKey: progosKeys.byMember(memberId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/members/{memberId}/progos', {
        params: { path: { memberId } },
      })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useProgosScores(memberId: string) {
  return useQuery({ ...getProgosScoresQueryOptions(memberId), enabled: !!memberId })
}
