import type { components } from '../../types/api'

export type Textbook = components['schemas']['Textbook']
export type TextbookInput = components['schemas']['TextbookInput']

/** 一覧/検索クエリ（教材名・カテゴリの部分一致） */
export interface TextbookListQuery {
  name?: string
  category?: string
}

/** React Query のキー（feature 内で集約） */
export const textbookKeys = {
  all: ['textbooks'] as const,
  list: (q: TextbookListQuery = {}) => ['textbooks', 'list', q] as const,
  detail: (id: string) => ['textbooks', 'detail', id] as const,
}
