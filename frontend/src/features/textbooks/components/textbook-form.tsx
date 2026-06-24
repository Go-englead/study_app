import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { textbookFormSchema, toTextbookInput, UNITS, type TextbookFormValues } from '../schemas'
import type { TextbookInput } from '../types'

interface Props {
  defaultValues?: Partial<TextbookFormValues>
  submitting?: boolean
  submitLabel?: string
  /** 教材コードを読み取り専用に（編集時） */
  lockCode?: boolean
  onSubmit: (input: TextbookInput) => void
  onCancel?: () => void
}

export function TextbookForm({
  defaultValues,
  submitting,
  submitLabel = '保存',
  lockCode,
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TextbookFormValues>({
    resolver: zodResolver(textbookFormSchema),
    defaultValues: { color: '#1A5276', ...defaultValues },
  })

  // 会員フォームと同じく register に data-testid を付与
  const field = (name: keyof TextbookFormValues) => ({
    ...register(name),
    'data-testid': `textbook-field-${name}`,
  })

  const submit = handleSubmit((values) => {
    onSubmit(toTextbookInput(textbookFormSchema.parse(values)))
  })

  const err = (k: keyof TextbookFormValues) =>
    errors[k] ? (
      <span className="form-error" data-testid={`textbook-error-${k}`}>
        {errors[k]?.message as string}
      </span>
    ) : null

  return (
    <form onSubmit={submit} className="member-form" data-testid="textbook-form">
      <section className="form-section">
        <h3>教材情報</h3>
        <div className="form-grid">
          <label>教材コード*<input {...field('textbookCode')} readOnly={lockCode} />{err('textbookCode')}</label>
          <label>教材名*<input {...field('name')} />{err('name')}</label>
          <label>タイプ<input {...field('category')} placeholder="例：単語/フレーズ" />{err('category')}</label>
          <label>
            単位*
            <select {...field('unit')}>
              <option value="">選択</option>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {err('unit')}
          </label>
          <label>カラー<input type="color" {...field('color')} style={{ height: 38, padding: 2 }} /></label>
          <label>アイコンURL<input {...field('iconUrl')} placeholder="https://…" /></label>
          <label>マニュアルURL<input {...field('manualUrl')} placeholder="https://…" /></label>
          <label>備考<input {...field('note')} /></label>
        </div>
      </section>

      <div className="form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="secondary-btn" onClick={onCancel} data-testid="textbook-form-cancel">
            キャンセル
          </button>
        )}
        <button type="submit" className="primary-btn" disabled={submitting} data-testid="textbook-form-submit">
          {submitting ? '送信中…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
