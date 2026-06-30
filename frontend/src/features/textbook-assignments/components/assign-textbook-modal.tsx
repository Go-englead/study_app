import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTextbooks } from '../../textbooks/api/get-textbooks'
import { useAssignTextbook } from '../api/assign-textbook'
import { assignFormSchema, type AssignFormValues } from '../schemas'
import { alertServerError } from '../../../lib/form-error'

interface Props {
  memberId: string
  /** 既に割り当て済みの教材ID（選択肢から除外） */
  assignedTextbookIds: string[]
  onClose: () => void
}

/** 会員に教材を割り当てるモーダル（教材を選択＋1日の目標分数）。 */
export function AssignTextbookModal({ memberId, assignedTextbookIds, onClose }: Props) {
  const { data: textbooks = [] } = useTextbooks()
  const assign = useAssignTextbook(memberId)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignFormValues>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: { textbookId: '', dailyGoalMinutes: '', note: '' },
  })

  const candidates = textbooks.filter((t) => !assignedTextbookIds.includes(t.id!))

  const err = (k: keyof AssignFormValues) =>
    errors[k] ? <span className="form-error" data-testid={`assign-error-${k}`}>{errors[k]?.message as string}</span> : null

  const submit = handleSubmit((v) => {
    assign.mutate(
      {
        textbookId: v.textbookId,
        dailyGoalMinutes: v.dailyGoalMinutes ? Number(v.dailyGoalMinutes) : undefined,
        note: v.note || undefined,
      },
      { onSuccess: onClose, onError: (e) => alertServerError(e, '割り当てに失敗しました') },
    )
  })

  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div className="center-modal" data-testid="assign-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="center-modal-header">
          <div className="panel-title">＋ 教材を割り当て</div>
          <button className="panel-close" data-testid="assign-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="center-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <form onSubmit={submit} className="member-form">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                教材*
                <select data-testid="assign-textbook-select" {...register('textbookId')}>
                  <option value="">選択してください</option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>{t.textbookCode}：{t.name}</option>
                  ))}
                </select>
                {err('textbookId')}
              </label>
              <label>
                1日の目標分数
                <input type="number" data-testid="assign-goal" {...register('dailyGoalMinutes')} placeholder="例：30" />
                {err('dailyGoalMinutes')}
              </label>
              <label>
                メモ
                <input data-testid="assign-note" {...register('note')} placeholder="トレーニング方法・範囲など" />
              </label>
            </div>
            <div className="form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
              <button type="submit" className="primary-btn" data-testid="assign-submit" disabled={assign.isPending}>
                {assign.isPending ? '送信中…' : '割り当てる'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
