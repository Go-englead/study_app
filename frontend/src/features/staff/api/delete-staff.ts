import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { staffKeys } from '../types'

export function useDeleteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await apiClient.DELETE('/v1/admin/staff/{staffId}', {
        params: { path: { staffId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  })
}
