import type { components } from '../../types/api'

export type CoachingRecord = components['schemas']['CoachingRecord']
export type CoachingRecordInput = components['schemas']['CoachingRecordInput']
export type CoachingSelectedTextbook = components['schemas']['CoachingSelectedTextbook']
export type CoachingTextbookTest = components['schemas']['CoachingTextbookTest']

export type CoachingType = NonNullable<CoachingRecord['type']>

export const COACHING_TYPES: CoachingType[] = [
  '教材選定',
  'オリエンテーション',
  '初回コーチング',
  '通常コーチング',
  'その他',
]

/** テスト内容を持つ種別か（初回・通常）。 */
export const hasTestContent = (type: string | undefined): boolean =>
  type === '初回コーチング' || type === '通常コーチング'

/** 自由記述3項目を持つ種別か（オリエン・初回・通常・その他）。 */
export const hasFreeText = (type: string | undefined): boolean =>
  type === 'オリエンテーション' || type === '初回コーチング' || type === '通常コーチング' || type === 'その他'

/** React Query キー。 */
export const coachingKeys = {
  all: ['coaching-records'] as const,
  byMember: (memberId: string) => ['coaching-records', 'member', memberId] as const,
  detail: (id: string) => ['coaching-records', 'detail', id] as const,
}
