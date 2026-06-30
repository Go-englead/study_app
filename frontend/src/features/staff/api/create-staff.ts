import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { staffKeys, type StaffRegisterInput } from '../types'

export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: StaffRegisterInput) => {
      const { data, error } = await apiClient.POST('/v1/admin/staff', { body })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  })
}
