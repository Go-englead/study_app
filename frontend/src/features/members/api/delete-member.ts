import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { memberKeys } from '../types'

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await apiClient.DELETE('/v1/admin/members/{memberId}', {
        params: { path: { memberId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  })
}
