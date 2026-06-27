import type { components } from '../../types/api'

export type ProgosScore = components['schemas']['ProgosScore']
export type ProgosScoreInput = components['schemas']['ProgosScoreInput']
export type ProgosSkillSet = components['schemas']['ProgosSkillSet']

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export const PROGOS_SKILLS: { key: keyof ProgosSkillSet; label: string }[] = [
  { key: 'range', label: '範囲' },
  { key: 'accuracy', label: '正確さ' },
  { key: 'fluency', label: '流暢さ' },
  { key: 'interaction', label: 'やり取り' },
  { key: 'coherence', label: '一貫性' },
  { key: 'phonology', label: '音韻' },
]

export const progosKeys = {
  all: ['progos-scores'] as const,
  byMember: (memberId: string) => ['progos-scores', memberId] as const,
}
