import { useState } from 'react'
import {
  useAddContinuationPlan,
  useUpdateContinuationPlan,
  useDeleteContinuationPlan,
} from '../api/continuation-plan'
import { CONTINUATION_PLAN_TYPES, type ContinuationPlan, type ContinuationPlanInput } from '../types'
import { alertServerError } from '../../../lib/form-error'

type ModalState = { mode: 'create' } | { mode: 'edit'; plan: ContinuationPlan } | null

/** 会員カルテ「継続プラン履歴」セクション（一覧＋追加/編集/削除）。client再現。 */
export function ContinuationPlanSection({ memberId, plans }: { memberId: string; plans: ContinuationPlan[] }) {
  const [modal, setModal] = useState<ModalState>(null)
  const del = useDeleteContinuationPlan(memberId)

  const onDelete = (planId: string) => {
    if (!confirm('この継続プランを削除します。よろしいですか？')) return
    del.mutate(planId, { onError: (e) => alertServerError(e, '削除に失敗しました') })
  }

  return (
    <div data-testid="cp-section" style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#2E5A7E', borderBottom: '2px solid #2E5A7E', paddingBottom: 6, marginBottom: 8 }}>
        継続プラン履歴
      </div>
      {plans.length === 0 && (
        <div data-testid="cp-empty" style={{ fontSize: 12, color: '#999', padding: '6px 0' }}>継続プランはまだありません</div>
      )}
      {plans.length > 0 && (
        <table data-testid="cp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '6px 4px' }}>種類</th>
              <th style={{ padding: '6px 4px' }}>期間</th>
              <th style={{ padding: '6px 4px' }}>開始〜終了</th>
              <th style={{ padding: '6px 4px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} data-testid={`cp-row-${p.id}`} style={{ borderBottom: '1px solid #f3f3f3' }}>
                <td style={{ padding: '6px 4px' }}>{p.planType}</td>
                <td style={{ padding: '6px 4px' }}>{p.months}ヶ月</td>
                <td style={{ padding: '6px 4px' }}>{p.startDate} 〜 {p.endDate}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="secondary-btn" data-testid={`cp-edit-${p.id}`} style={{ fontSize: 11 }} onClick={() => setModal({ mode: 'edit', plan: p })}>編集</button>
                  <button className="secondary-btn" data-testid={`cp-delete-${p.id}`} style={{ fontSize: 11, color: '#C0392B', marginLeft: 6 }} onClick={() => onDelete(p.id!)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className="secondary-btn" data-testid="cp-add-open" style={{ width: '100%' }} onClick={() => setModal({ mode: 'create' })}>
        ＋ 継続プランを追加
      </button>

      {modal && <ContinuationPlanModal memberId={memberId} state={modal} onClose={() => setModal(null)} />}
    </div>
  )
}

function ContinuationPlanModal({
  memberId,
  state,
  onClose,
}: {
  memberId: string
  state: NonNullable<ModalState>
  onClose: () => void
}) {
  const isEdit = state.mode === 'edit'
  const editing = isEdit ? state.plan : undefined
  const add = useAddContinuationPlan(memberId)
  const update = useUpdateContinuationPlan(memberId)

  const [planType, setPlanType] = useState<string>(editing?.planType ?? '')
  const [months, setMonths] = useState<string>(editing?.months ? String(editing.months) : '')
  const [startDate, setStartDate] = useState<string>(editing?.startDate ?? '')
  const [note, setNote] = useState<string>(editing?.note ?? '')
  const [applyGraduateDate, setApplyGraduateDate] = useState(false)
  const [err, setErr] = useState('')

  const pending = add.isPending || update.isPending

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!planType) return setErr('プラン種類を選択してください')
    if (!months) return setErr('期間を選択してください')
    if (!startDate) return setErr('開始日を入力してください')
    const body: ContinuationPlanInput = {
      planType: planType as ContinuationPlanInput['planType'],
      months: Number(months),
      startDate,
      note: note || undefined,
      applyGraduateDate,
    }
    const opts = { onSuccess: onClose, onError: (e2: unknown) => alertServerError(e2, '保存に失敗しました') }
    if (isEdit && editing?.id) update.mutate({ planId: editing.id, body }, opts)
    else add.mutate(body, opts)
  }

  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div className="center-modal" data-testid="cp-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="center-modal-header">
          <div className="panel-title">{isEdit ? '継続プランを編集' : '＋ 継続プランを追加'}</div>
          <button className="panel-close" data-testid="cp-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="center-modal-body">
            {err && <p className="form-error" data-testid="cp-error">{err}</p>}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="form-group">
                プラン種類 *
                <select data-testid="cp-field-planType" value={planType} onChange={(e) => setPlanType(e.target.value)}>
                  <option value="">選択してください</option>
                  {CONTINUATION_PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="form-group">
                期間 *
                <select data-testid="cp-field-months" value={months} onChange={(e) => setMonths(e.target.value)}>
                  <option value="">選択</option>
                  {[1, 2, 3, 4, 5, 6].map((m) => <option key={m} value={m}>{m}ヶ月</option>)}
                </select>
              </label>
              <label className="form-group">
                開始日 *
                <input type="date" data-testid="cp-field-startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span style={{ fontSize: 11, color: '#888' }}>※ 終了日は開始日＋期間−1日で自動算出されます</span>
              </label>
              <label className="form-group">
                備考
                <input data-testid="cp-field-note" value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <label className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" data-testid="cp-field-applyGraduate" checked={applyGraduateDate} onChange={(e) => setApplyGraduateDate(e.target.checked)} />
                卒業予定日をプラン終了日に反映する
              </label>
            </div>
          </div>
          <div className="center-modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
            <button type="submit" className="primary-btn" data-testid="cp-submit" disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
