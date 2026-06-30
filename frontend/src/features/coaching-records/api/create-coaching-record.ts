import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { coachingKeys, type CoachingRecordInput } from '../types'
import { assignmentKeys } from '../../textbook-assignments/types'

/** コーチング記録を作成（教材割り当ても連動更新されうるため割り当てキャッシュも無効化）。 */
export function useCreateCoachingRecord(memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CoachingRecordInput) => {
      const { data, error } = await apiClient.POST(
        '/v1/admin/members/{memberId}/coaching-records',
        { params: { path: { memberId } }, body },
      )
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachingKeys.byMember(memberId) })
      qc.invalidateQueries({ queryKey: assignmentKeys.byMember(memberId) })
    },
  })
}
