import createClient from 'openapi-fetch'
import type { paths } from '../types/api'
import { env } from '../config/env'

/**
 * 型付き API クライアント（openapi-fetch）。
 * OpenAPI 定義（types/api）から型が通る。Authorization は開発用トークンを自動付与。
 */
export const apiClient = createClient<paths>({
  baseUrl: env.API_URL,
  headers: {
    Authorization: `Bearer ${env.DEV_ADMIN_TOKEN}`,
  },
})
