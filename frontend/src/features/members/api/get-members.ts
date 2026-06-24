import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { memberKeys, type MemberListQuery } from '../types'

export function getMembersQueryOptions(query: MemberListQuery = {}) {
  return queryOptions({
    queryKey: memberKeys.list(query),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/admin/members', {
        params: { query: query as Record<string, unknown> },
      })
      if (error) throw error
      return data.members ?? []
    },
  })
}

export function useMembers(query: MemberListQuery = {}) {
  return useQuery(getMembersQueryOptions(query))
}
