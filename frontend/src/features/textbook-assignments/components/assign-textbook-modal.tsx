import { useState } from 'react'
import { useTextbooks } from '../../textbooks/api/get-textbooks'
import { useAssignTextbook } from '../api/assign-textbook'

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
  const [selected, setSelected] = useState('')
  const [goal, setGoal] = useState('')
  const [note, setNote] = useState('')

  const candidates = textbooks.filter((t) => !assignedTextbookIds.includes(t.id!))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    assign.mutate(
      {
        textbookId: selected,
        dailyGoalMinutes: goal ? Number(goal) : undefined,
        note: note || undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div className="center-modal" data-testid="assign-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="center-modal-header">
          <div className="panel-title">＋ 教材を割り当て</div>
          <button className="panel-close" data-testid="assign-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="center-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {assign.isError && (
            <p className="form-error">{(assign.error as { message?: string })?.message ?? '割り当てに失敗しました'}</p>
          )}
          <form onSubmit={submit} className="member-form">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                教材*
                <select data-testid="assign-textbook-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">選択してください</option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>{t.textbookCode}：{t.name}</option>
                  ))}
                </select>
              </label>
              <label>
                1日の目標分数
                <input type="number" data-testid="assign-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="例：30" />
              </label>
              <label>
                メモ
                <input data-testid="assign-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="トレーニング方法・範囲など" />
              </label>
            </div>
            <div className="form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
              <button type="submit" className="primary-btn" data-testid="assign-submit" disabled={!selected || assign.isPending}>
                {assign.isPending ? '送信中…' : '割り当てる'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
