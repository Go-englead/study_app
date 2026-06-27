import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { coachingKeys } from '../types'

export function getCoachingRecordsQueryOptions(memberId: string) {
  return queryOptions({
    queryKey: coachingKeys.byMember(memberId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/v1/admin/members/{memberId}/coaching-records',
        { params: { path: { memberId } } },
      )
      if (error) throw error
      return data.coachingRecords ?? []
    },
  })
}

export function useCoachingRecords(memberId: string) {
  return useQuery({ ...getCoachingRecordsQueryOptions(memberId), enabled: !!memberId })
}
