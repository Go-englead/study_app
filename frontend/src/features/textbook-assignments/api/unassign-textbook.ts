import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { assignmentKeys } from '../types'

export function useUnassignTextbook(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (textbookId: string) => {
      const { error } = await apiClient.DELETE(
        '/v1/admin/members/{memberId}/textbook-assignments/{textbookId}',
        { params: { path: { memberId, textbookId } } },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.byMember(memberId) }),
  })
}
