import { z } from 'zod'
import { CEFR_LEVELS } from './types'

const cefr = z.enum(CEFR_LEVELS, { message: 'CEFRレベルを選択してください' })

/** PROGOSスコア 登録フォームのフィールドバリデーション。 */
export const progosFormSchema = z.object({
  examDate: z.string().min(1, '受験日は必須です'),
  overall: cefr,
  skills: z.object({
    range: cefr,
    accuracy: cefr,
    fluency: cefr,
    interaction: cefr,
    coherence: cefr,
    phonology: cefr,
  }),
  comment: z.string().optional(),
})

export type ProgosFormValues = z.input<typeof progosFormSchema>
