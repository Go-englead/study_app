import { queryOptions, useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { staffKeys } from '../types'

export function getStaffListQueryOptions(keyword = '') {
  return queryOptions({
    queryKey: staffKeys.list(keyword),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/staff', {
        params: { query: keyword ? { keyword } : {} },
      })
      if (error) throw error
      return data.staff ?? []
    },
    // 入力中（keyword 変化）に一覧がチラつかないよう、新結果が来るまで前の結果を保持。
    placeholderData: keepPreviousData,
  })
}

/** スタッフ一覧／検索（keyword はサーバー側で社員ID・氏名・メールに部分一致）。 */
export function useStaffList(keyword = '') {
  return useQuery(getStaffListQueryOptions(keyword))
}
