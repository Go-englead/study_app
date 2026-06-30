import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { staffKeys, type StaffUpdateInput } from '../types'

export function useUpdateStaff(staffId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: StaffUpdateInput) => {
      const { data, error } = await apiClient.PUT('/v1/admin/staff/{staffId}', {
        params: { path: { staffId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  })
}
