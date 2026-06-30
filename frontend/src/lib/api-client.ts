import createClient from 'openapi-fetch'
import type { paths } from '../types/api'
import { env } from '../config/env'
import { getToken, clearAuth } from './auth'

/**
 * 型付き API クライアント（openapi-fetch）。
 * 認証は middleware で一元化する：
 *  - onRequest : localStorage のトークンを Authorization: Bearer に付与
 *  - onResponse: 401（未認証/期限切れ）を捕捉し、トークン破棄＋ログイン画面へ遷移
 *    （ログインAPI自身と /login 滞在時は除外＝リダイレクトループ防止）
 */
export const apiClient = createClient<paths>({ baseUrl: env.API_URL })

apiClient.use({
  onRequest({ request }) {
    const token = getToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  onResponse({ request, response }) {
    if (response.status === 401 && !request.url.includes('/v1/auth/login')) {
      clearAuth()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return response
  },
})
