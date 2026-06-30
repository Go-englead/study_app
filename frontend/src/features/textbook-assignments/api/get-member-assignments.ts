import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { assignmentKeys } from '../types'

export function getMemberAssignmentsQueryOptions(memberId: string) {
  return queryOptions({
    queryKey: assignmentKeys.byMember(memberId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/v1/admin/members/{memberId}/textbook-assignments',
        { params: { path: { memberId } } },
      )
      if (error) throw error
      return data.assignments ?? []
    },
  })
}

export function useMemberAssignments(memberId: string) {
  return useQuery({ ...getMemberAssignmentsQueryOptions(memberId), enabled: !!memberId })
}
