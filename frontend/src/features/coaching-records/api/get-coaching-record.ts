import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { coachingKeys } from '../types'

export function getCoachingRecordQueryOptions(coachingRecordId: string) {
  return queryOptions({
    queryKey: coachingKeys.detail(coachingRecordId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/coaching-records/{coachingRecordId}', {
        params: { path: { coachingRecordId } },
      })
      if (error) throw error
      return data
    },
  })
}

export function useCoachingRecord(coachingRecordId: string | null) {
  return useQuery({
    ...getCoachingRecordQueryOptions(coachingRecordId ?? ''),
    enabled: !!coachingRecordId,
  })
}
