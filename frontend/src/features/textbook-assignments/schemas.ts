import { z } from 'zod'

/** 教材割り当てフォームのフィールドバリデーション。 */
export const assignFormSchema = z.object({
  textbookId: z.string().min(1, '教材を選択してください'),
  dailyGoalMinutes: z
    .union([z.coerce.number().min(1, '目標分数は1以上で入力してください').max(1440, '目標分数は1440以内で入力してください'), z.literal('')])
    .optional(),
  note: z.string().optional(),
})

export type AssignFormValues = z.input<typeof assignFormSchema>
