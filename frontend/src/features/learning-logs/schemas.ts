import { z } from 'zod'

/** 学習記録 追加フォームのフィールドバリデーション。 */
export const learningLogFormSchema = z.object({
  textbookId: z.string().min(1, '教材を選択してください'),
  date: z.string().min(1, '日付は必須です'),
  durationMinutes: z.coerce
    .number({ message: '学習時間は数値で入力してください' })
    .min(1, '学習時間は1分以上で入力してください')
    .max(1440, '学習時間は1440分以内で入力してください'),
  comment: z.string().optional(),
})

export type LearningLogFormValues = z.input<typeof learningLogFormSchema>
