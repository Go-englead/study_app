import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { memberKeys, type ContinuationPlanInput } from '../types'

/** 継続プランの追加（会員保存トランザクションで永続化）。 */
export function useAddContinuationPlan(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ContinuationPlanInput) => {
      const { data, error } = await apiClient.POST('/v1/admin/members/{memberId}/continuation-plans', {
        params: { path: { memberId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  })
}

/** 継続プランの更新。 */
export function useUpdateContinuationPlan(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId, body }: { planId: string; body: ContinuationPlanInput }) => {
      const { data, error } = await apiClient.PUT('/v1/admin/members/{memberId}/continuation-plans/{planId}', {
        params: { path: { memberId, planId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  })
}

/** 継続プランの削除。 */
export function useDeleteContinuationPlan(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await apiClient.DELETE('/v1/admin/members/{memberId}/continuation-plans/{planId}', {
        params: { path: { memberId, planId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  })
}
