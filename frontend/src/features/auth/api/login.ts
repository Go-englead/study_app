import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { setAuth, type AuthUser } from '../../../lib/auth'

/** 職員ログイン（POST /v1/auth/login）。成功時にトークン/ユーザーを保存。 */
export function useLogin() {
  return useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const { data, error } = await apiClient.POST('/v1/auth/login', { body: creds })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data?.token && data.user) {
        setAuth(data.token, data.user as AuthUser)
      }
    },
  })
}
