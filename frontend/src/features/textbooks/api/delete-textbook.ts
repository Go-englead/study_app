import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { textbookKeys } from '../types'

export function useDeleteTextbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (textbookId: string) => {
      const { error } = await apiClient.DELETE('/v1/admin/textbooks/{textbookId}', {
        params: { path: { textbookId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: textbookKeys.all }),
  })
}
