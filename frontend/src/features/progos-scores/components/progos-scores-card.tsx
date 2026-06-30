import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProgosScores } from '../api/get-progos-scores'
import { useAddProgosScore } from '../api/add-progos-score'
import { CEFR_LEVELS, PROGOS_SKILLS, type ProgosScoreInput } from '../types'
import { progosFormSchema, type ProgosFormValues } from '../schemas'
import { alertServerError } from '../../../lib/form-error'

interface Props {
  memberId: string
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 会員カルテ「PROGOSスコア」カード（CEFR履歴＋登録）。 */
export function ProgosScoresCard({ memberId }: Props) {
  const { data: scores = [], isLoading } = useProgosScores(memberId)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="card" data-testid="progos-card">
      <div className="card-header">
        <div>
          <div className="card-title">📈 PROGOSスコア</div>
          <div className="card-sub">スピーキング力の推移（CEFR）</div>
        </div>
        <button className="primary-btn" data-testid="progos-add-open" onClick={() => setShowAdd(true)}>
          ＋ スコアを登録
        </button>
      </div>

      <div className="card-body">
        {isLoading && <p>読み込み中…</p>}
        {!isLoading && scores.length === 0 && (
          <div style={{ fontSize: 13, color: '#999', padding: 16, textAlign: 'center' }}>
            PROGOSスコアがまだ登録されていません
          </div>
        )}
        {scores.length > 0 && (
          <table className="progos-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '6px 4px' }}>受験日</th>
                <th style={{ padding: '6px 4px' }}>総合</th>
                {PROGOS_SKILLS.map((s) => (
                  <th key={s.key} style={{ padding: '6px 4px' }}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.map((sc) => (
                <tr key={sc.id} data-testid={`progos-row-${sc.id}`} style={{ borderBottom: '1px solid #f3f3f3' }}>
                  <td style={{ padding: '8px 4px' }}>{sc.examDate}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#2E86C1' }}>{sc.overall}</td>
                  {PROGOS_SKILLS.map((s) => (
                    <td key={s.key} style={{ padding: '8px 4px' }}>{sc.skills?.[s.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddProgosModal memberId={memberId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddProgosModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const add = useAddProgosScore(memberId)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProgosFormValues>({
    resolver: zodResolver(progosFormSchema),
    defaultValues: {
      examDate: today(),
      overall: 'B1',
      skills: { range: 'B1', accuracy: 'B1', fluency: 'B1', interaction: 'B1', coherence: 'B1', phonology: 'B1' },
      comment: '',
    },
  })

  const err = (testid: string, message?: string) =>
    message ? <span className="form-error" data-testid={`progos-error-${testid}`}>{message}</span> : null

  const submit = handleSubmit((v) => {
    add.mutate(
      {
        examDate: v.examDate,
        overall: v.overall as ProgosScoreInput['overall'],
        skills: v.skills as ProgosScoreInput['skills'],
        comment: v.comment || undefined,
      },
      { onSuccess: onClose, onError: (e) => alertServerError(e, '登録に失敗しました') },
    )
  })

  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div className="center-modal" data-testid="progos-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="center-modal-header">
          <div className="panel-title">＋ PROGOSスコアを登録</div>
          <button className="panel-close" data-testid="progos-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="center-modal-body">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="form-group">
                受験日 *
                <input type="date" data-testid="progos-date" max={today()} {...register('examDate')} />
                {err('examDate', errors.examDate?.message)}
              </label>
              <label className="form-group">
                総合 *
                <select data-testid="progos-overall" {...register('overall')}>
                  {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {err('overall', errors.overall?.message)}
              </label>
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8 }}>
              {PROGOS_SKILLS.map((s) => (
                <label key={s.key} className="form-group">
                  {s.label}
                  <select data-testid={`progos-skill-${s.key}`} {...register(`skills.${s.key}` as const)}>
                    {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <label className="form-group" style={{ display: 'block', marginTop: 8 }}>
              コメント
              <input data-testid="progos-comment" {...register('comment')} placeholder="所感など" />
            </label>
          </div>
          <div className="center-modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
            <button type="submit" className="primary-btn" data-testid="progos-submit" disabled={add.isPending}>
              {add.isPending ? '保存中…' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
