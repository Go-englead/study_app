import type { components } from '../../types/api'

export type StaffSummary = components['schemas']['StaffSummary']
export type StaffRegisterInput = components['schemas']['StaffRegisterInput']
export type StaffUpdateInput = components['schemas']['StaffUpdateInput']

/** 役割（内部値）と日本語ラベル。Staff=運営。 */
export const STAFF_ROLES = ['Coach', 'Teacher', 'Consultant', 'CS', 'Staff'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]
export const ROLE_LABELS: Record<string, string> = {
  Coach: 'コーチ',
  Teacher: '講師',
  Consultant: 'コンサルタント',
  CS: 'CS',
  Staff: '運営',
}
export const roleLabel = (role?: string) => (role ? ROLE_LABELS[role] ?? role : '')

export const staffKeys = {
  all: ['staff'] as const,
  list: (keyword = '') => ['staff', 'list', keyword] as const,
}
