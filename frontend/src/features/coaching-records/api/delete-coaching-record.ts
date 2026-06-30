import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { coachingKeys } from '../types'
import { assignmentKeys } from '../../textbook-assignments/types'

/** コーチング記録を削除。 */
export function useDeleteCoachingRecord(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (coachingRecordId: string) => {
      const { error } = await apiClient.DELETE('/v1/admin/coaching-records/{coachingRecordId}', {
        params: { path: { coachingRecordId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachingKeys.byMember(memberId) })
      qc.invalidateQueries({ queryKey: assignmentKeys.byMember(memberId) })
    },
  })
}
