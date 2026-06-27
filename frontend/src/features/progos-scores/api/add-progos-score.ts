import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { progosKeys, type ProgosScoreInput } from '../types'

export function useAddProgosScore(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ProgosScoreInput) => {
      const { data, error } = await apiClient.POST('/v1/admin/members/{memberId}/progos', {
        params: { path: { memberId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: progosKeys.byMember(memberId) }),
  })
}
