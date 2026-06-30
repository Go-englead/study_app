import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { memberKeys } from '../types'

export function getMemberQueryOptions(memberId: string) {
  return queryOptions({
    queryKey: memberKeys.detail(memberId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/members/{memberId}', {
        params: { path: { memberId } },
      })
      if (error) throw error
      return data
    },
  })
}

export function useMember(memberId: string) {
  return useQuery({ ...getMemberQueryOptions(memberId), enabled: !!memberId })
}
