import type { components } from '../../types/api'

export type Textbook = components['schemas']['Textbook']
export type TextbookInput = components['schemas']['TextbookInput']

/** React Query のキー（feature 内で集約） */
export const textbookKeys = {
  all: ['textbooks'] as const,
  list: () => ['textbooks', 'list'] as const,
  detail: (id: string) => ['textbooks', 'detail', id] as const,
}
