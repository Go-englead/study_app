import type { components } from '../../types/api'

export type LearningLog = components['schemas']['LearningLog']
export type LearningLogInput = components['schemas']['LearningLogInput']

export const learningLogKeys = {
  all: ['learning-logs'] as const,
  byMember: (memberId: string) => ['learning-logs', memberId] as const,
}
