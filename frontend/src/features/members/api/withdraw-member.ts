import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { memberKeys } from '../types'

/**
 * 途中退会の設定／取り消し（唯一の手動ステータス操作）。
 * withdrawn=true で「途中退会」に、false で取り消し（日付からの自動算出へ戻す）。
 */
export function useSetMemberWithdrawn(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (withdrawn: boolean) => {
      const path = { path: { memberId } } as const
      const { data, error } = withdrawn
        ? await apiClient.POST('/v1/admin/members/{memberId}/withdraw', { params: path })
        : await apiClient.DELETE('/v1/admin/members/{memberId}/withdraw', { params: path })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  })
}
