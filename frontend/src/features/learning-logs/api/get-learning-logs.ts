import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { learningLogKeys } from '../types'

export function getLearningLogsQueryOptions(memberId: string) {
  return queryOptions({
    queryKey: learningLogKeys.byMember(memberId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/members/{memberId}/learning-logs', {
        params: { path: { memberId } },
      })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useLearningLogs(memberId: string) {
  return useQuery({ ...getLearningLogsQueryOptions(memberId), enabled: !!memberId })
}
