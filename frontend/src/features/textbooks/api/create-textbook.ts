import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { textbookKeys, type TextbookInput } from '../types'

export function useCreateTextbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: TextbookInput) => {
      const { data, error } = await apiClient.POST('/v1/admin/textbooks', { body })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: textbookKeys.all }),
  })
}
