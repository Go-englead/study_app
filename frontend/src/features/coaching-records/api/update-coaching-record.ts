import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { coachingKeys, type CoachingRecordInput } from '../types'
import { assignmentKeys } from '../../textbook-assignments/types'

/** コーチング記録を更新（全置換）。 */
export function useUpdateCoachingRecord(memberId: string, coachingRecordId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CoachingRecordInput) => {
      const { data, error } = await apiClient.PUT('/v1/admin/coaching-records/{coachingRecordId}', {
        params: { path: { coachingRecordId } },
        body,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachingKeys.byMember(memberId) })
      qc.invalidateQueries({ queryKey: coachingKeys.detail(coachingRecordId) })
      qc.invalidateQueries({ queryKey: assignmentKeys.byMember(memberId) })
    },
  })
}
