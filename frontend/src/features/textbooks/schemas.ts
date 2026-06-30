import { z } from 'zod'
import type { Textbook, TextbookInput } from './types'

// 単位（openapi/domain の enum に一致）
export const UNITS = ['Day', 'Chapter', 'Lesson', '回'] as const

const optStr = z.string().trim().optional()

export const textbookFormSchema = z.object({
  textbookCode: z.string().trim().min(1, '教材コードは必須です'),
  name: z.string().trim().min(1, '教材名は必須です'),
  category: z.string().trim().min(1, 'タイプは必須です'),
  unit: z.enum(UNITS, { message: '単位を選択してください' }),
  color: optStr, // 空ならサーバーが既定色を補完
  iconUrl: optStr,
  manualUrl: optStr,
  note: optStr,
})

export type TextbookFormValues = z.input<typeof textbookFormSchema>

/** バリデーション済みフォーム値 → API リクエスト（空文字は送らない） */
export function toTextbookInput(v: z.output<typeof textbookFormSchema>): TextbookInput {
  const clean = (x: string | undefined) => (x === '' || x === undefined ? undefined : x)
  return {
    textbookCode: v.textbookCode,
    name: v.name,
    category: v.category,
    unit: v.unit,
    color: clean(v.color),
    iconUrl: clean(v.iconUrl),
    manualUrl: clean(v.manualUrl),
    note: clean(v.note),
  }
}

/** Textbook 詳細 → フォーム初期値（編集プリセット） */
export function textbookToFormValues(t: Textbook): Partial<TextbookFormValues> {
  return {
    textbookCode: t.textbookCode ?? '',
    name: t.name ?? '',
    category: t.category ?? '',
    unit: t.unit as TextbookFormValues['unit'],
    color: t.color ?? '',
    iconUrl: t.iconUrl ?? '',
    manualUrl: t.manualUrl ?? '',
    note: t.note ?? '',
  }
}
