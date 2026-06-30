import { z } from 'zod'

/**
 * コーチング記録フォームのフィールドバリデーション。
 * - 種別・実施日などフィールド単位の必須チェックを zod で行う。
 * - 「初回オリエンが無いのに通常」「通常があると初回は削除不可」などのデータ整合性ルールは
 *   サーバー（DomainError）が返し alert で通知する。
 * フォーム全体の値を保持するため、全フィールドをスキーマに含める（未知キーで値が落ちないように）。
 */
const testRowSchema = z.object({
  textbookId: z.string(),
  textbookLabel: z.string(),
  testStatus: z.enum(['未選択', '未実施', '実施済み']),
  range: z.string(),
  format: z.string(),
  score: z.string(),
  note: z.string(),
  nextStatus: z.enum(['継続', '卒業']),
  isNew: z.boolean(),
  dailyGoalMinutes: z.string(),
})

export const coachingFormSchema = z.object({
  type: z.string().min(1, 'タイプを選択してください'),
  date: z.string().min(1, '実施日は必須です'),
  coachName: z.string(),
  sharedNote: z.string(),
  selectedTextbooks: z.array(
    z.object({ textbookId: z.string(), dailyGoalMinutes: z.string(), note: z.string() }),
  ),
  tests: z.array(testRowSchema),
  monthlyReview: z.string(),
  coachAdvice: z.string(),
  otherNotes: z.string(),
})

export type CoachingFormValues = z.infer<typeof coachingFormSchema>
