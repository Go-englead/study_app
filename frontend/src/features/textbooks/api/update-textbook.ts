import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { textbookKeys, type TextbookInput } from '../types'

export function useUpdateTextbook(textbookId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: TextbookInput) => {
      const { data, error } = await apiClient.PUT('/v1/admin/textbooks/{textbookId}', {
        params: { path: { textbookId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: textbookKeys.all })
      qc.invalidateQueries({ queryKey: textbookKeys.detail(textbookId) })
    },
  })
}
