import type { components } from '../../types/api'

export type AssignedTextbook = components['schemas']['AssignedTextbook']

export const assignmentKeys = {
  all: ['textbook-assignments'] as const,
  byMember: (memberId: string) => ['textbook-assignments', memberId] as const,
}
