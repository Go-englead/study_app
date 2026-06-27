import { useState } from 'react'
import { useTextbooks } from '../../textbooks/api/get-textbooks'
import { useLearningLogs } from '../api/get-learning-logs'
import { useAddLearningLog } from '../api/add-learning-log'
import { useDeleteLearningLog } from '../api/delete-learning-log'

interface Props {
  memberId: string
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 会員カルテ「直近の学習記録」カード（一覧＋追加＋削除）。 */
export function LearningLogsCard({ memberId }: Props) {
  const { data: logs = [], isLoading } = useLearningLogs(memberId)
  const { data: textbooks = [] } = useTextbooks()
  const del = useDeleteLearningLog(memberId)
  const [showAdd, setShowAdd] = useState(false)

  const textbookName = (id?: string) => {
    const t = textbooks.find((x) => x.id === id)
    return t ? `${t.textbookCode}：${t.name}` : '(不明な教材)'
  }

  const onDelete = (id: string) => {
    if (!confirm('この学習記録を削除します。よろしいですか？')) return
    del.mutate(id)
  }

  return (
    <div className="card" data-testid="learning-logs-card">
      <div className="card-header">
        <div>
          <div className="card-title">📘 直近の学習記録</div>
          <div className="card-sub">{logs.length}件</div>
        </div>
        <button className="primary-btn" data-testid="log-add-open" onClick={() => setShowAdd(true)}>
          ＋ 学習記録を追加
        </button>
      </div>

      <div className="card-body">
        {isLoading && <p>読み込み中…</p>}
        {!isLoading && logs.length === 0 && (
          <div style={{ fontSize: 13, color: '#999', padding: 16, textAlign: 'center' }}>
            学習記録はまだありません
          </div>
        )}
        {logs.length > 0 && (
          <table className="log-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '6px 4px' }}>日付</th>
                <th style={{ padding: '6px 4px' }}>教材</th>
                <th style={{ padding: '6px 4px' }}>学習時間</th>
                <th style={{ padding: '6px 4px' }}>コメント</th>
                <th style={{ padding: '6px 4px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} data-testid={`log-row-${l.id}`} style={{ borderBottom: '1px solid #f3f3f3' }}>
                  <td style={{ padding: '8px 4px' }}>{l.date}</td>
                  <td style={{ padding: '8px 4px' }}>{textbookName(l.textbookId)}</td>
                  <td style={{ padding: '8px 4px' }}>{l.durationMinutes}分</td>
                  <td style={{ padding: '8px 4px', color: '#666' }}>{l.comment || '-'}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                    <button
                      className="secondary-btn"
                      data-testid={`log-delete-${l.id}`}
                      onClick={() => onDelete(l.id!)}
                      style={{ fontSize: 12 }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddLearningLogModal
          memberId={memberId}
          textbooks={textbooks.map((t) => ({ id: t.id!, label: `${t.textbookCode}：${t.name}` }))}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function AddLearningLogModal({
  memberId,
  textbooks,
  onClose,
}: {
  memberId: string
  textbooks: { id: string; label: string }[]
  onClose: () => void
}) {
  const add = useAddLearningLog(memberId)
  const [textbookId, setTextbookId] = useState('')
  const [date, setDate] = useState(today())
  const [minutes, setMinutes] = useState('')
  const [comment, setComment] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textbookId || !minutes) return
    add.mutate(
      { textbookId, date, durationMinutes: Number(minutes), comment: comment || undefined },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div className="center-modal" data-testid="log-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="center-modal-header">
          <div className="panel-title">＋ 学習記録を追加</div>
          <button className="panel-close" data-testid="log-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="center-modal-body">
            {add.isError && (
              <p className="form-error" data-testid="log-error">{(add.error as { message?: string })?.message ?? '追加に失敗しました'}</p>
            )}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="form-group">
                教材 *
                <select data-testid="log-textbook" value={textbookId} onChange={(e) => setTextbookId(e.target.value)}>
                  <option value="">選択してください</option>
                  {textbooks.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="form-group">
                日付 *
                <input type="date" data-testid="log-date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="form-group">
                学習時間（分）*
                <input type="number" data-testid="log-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="例：45" />
              </label>
              <label className="form-group">
                コメント
                <input data-testid="log-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="学習メモ" />
              </label>
            </div>
          </div>
          <div className="center-modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
            <button type="submit" className="primary-btn" data-testid="log-submit" disabled={!textbookId || !minutes || add.isPending}>
              {add.isPending ? '保存中…' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
