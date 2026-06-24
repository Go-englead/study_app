import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { assignmentKeys } from '../types'

export function useAssignTextbook(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { textbookId: string; dailyGoalMinutes?: number; note?: string }) => {
      const { data, error } = await apiClient.POST(
        '/v1/admin/members/{memberId}/textbook-assignments',
        { params: { path: { memberId } }, body },
      )
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.byMember(memberId) }),
  })
}
