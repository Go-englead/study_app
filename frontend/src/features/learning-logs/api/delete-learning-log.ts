import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { learningLogKeys } from '../types'

export function useDeleteLearningLog(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await apiClient.DELETE('/v1/admin/members/{memberId}/learning-logs/{logId}', {
        params: { path: { memberId, logId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: learningLogKeys.byMember(memberId) }),
  })
}
