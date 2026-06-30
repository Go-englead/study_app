import { z } from 'zod'
import { STAFF_ROLES, type StaffRegisterInput, type StaffUpdateInput } from './types'

/**
 * スタッフ登録/編集フォームのフィールドバリデーション（zod）。
 * - 必須・形式・最小長などフィールド単位のルールのみをここで検証する。
 * - コード重複などデータ整合性のルールはサーバー（DomainError）が返し alert で通知する。
 */
export const staffFormSchema = z.object({
  staffCode: z.string().trim().min(1, '社員IDは必須です'),
  name: z.string().trim().min(1, '氏名は必須です'),
  role: z.enum(STAFF_ROLES, { message: '役割を選択してください' }),
  email: z.string().trim().min(1, 'メールは必須です').email('メールアドレスの形式が不正です'),
  // 新規は必須・8文字以上。編集は空欄なら据え置き（空文字を許可）。
  password: z.string(),
})

export type StaffFormValues = z.input<typeof staffFormSchema>

/** 新規登録用スキーマ（パスワード必須・8文字以上）。 */
export const staffCreateSchema = staffFormSchema.extend({
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

/** 編集用スキーマ（パスワードは空欄＝据え置き、入力時のみ8文字以上）。 */
export const staffEditSchema = staffFormSchema.extend({
  password: z
    .string()
    .refine((v) => v === '' || v.length >= 8, { message: 'パスワードは8文字以上で入力してください' }),
})

export function toStaffRegisterInput(v: StaffFormValues): StaffRegisterInput {
  return {
    staffCode: v.staffCode,
    name: v.name,
    role: v.role,
    email: v.email,
    password: v.password,
  }
}

export function toStaffUpdateInput(v: StaffFormValues): StaffUpdateInput {
  return {
    name: v.name,
    role: v.role,
    email: v.email,
    password: v.password ? v.password : undefined,
  }
}
