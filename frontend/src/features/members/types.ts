import type { components } from '../../types/api'

export type MemberSummary = components['schemas']['MemberSummary']
export type Member = components['schemas']['Member']
export type MemberInput = components['schemas']['MemberInput']
export type ContinuationPlan = components['schemas']['ContinuationPlanHistoryItem']
export type ContinuationPlanInput = components['schemas']['ContinuationPlanInput']

/** 継続プランの種類（client 準拠）。 */
export const CONTINUATION_PLAN_TYPES = ['タビプラプラン', '英語講座プラン', '英語コーチングプラン'] as const

/** 一覧/検索のクエリ（保存列ベースの条件のみ。API のクエリパラメータに対応）。 */
export interface MemberListQuery {
  keyword?: string
  keywordType?: 'name' | 'code'
  startMonth?: string
  occupation?: string
  residence?: string
  orientStaffId?: string
  travelCountry?: string
  travelReason?: string
  travelDate?: string
  textbookId?: string[]
}

/** React Query のキー（feature 内で集約） */
export const memberKeys = {
  all: ['members'] as const,
  list: (q: MemberListQuery) => ['members', 'list', q] as const,
  detail: (id: string) => ['members', 'detail', id] as const,
}
