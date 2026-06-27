import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { learningLogKeys, type LearningLogInput } from '../types'

export function useAddLearningLog(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: LearningLogInput) => {
      const { data, error } = await apiClient.POST('/v1/admin/members/{memberId}/learning-logs', {
        params: { path: { memberId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: learningLogKeys.byMember(memberId) }),
  })
}
