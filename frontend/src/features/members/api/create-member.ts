import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { memberKeys, type Member, type MemberInput } from '../types'

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: MemberInput) => {
      const { data, error } = await apiClient.POST('/v1/admin/members', { body })
      if (error) throw error
      // 登録レスポンスにはサーバー生成の仮パスワード（tempPassword）が含まれる
      return data as Member & { tempPassword?: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  })
}
