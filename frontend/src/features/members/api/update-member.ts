import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { memberKeys, type MemberInput } from '../types'

export function useUpdateMember(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: MemberInput) => {
      const { data, error } = await apiClient.PUT('/v1/admin/members/{memberId}', {
        params: { path: { memberId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.all })
      qc.invalidateQueries({ queryKey: memberKeys.detail(memberId) })
    },
  })
}
