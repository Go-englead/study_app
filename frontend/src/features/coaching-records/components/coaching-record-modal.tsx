import { useEffect, useMemo } from 'react'
import { useForm, useFieldArray, type Control, type UseFormRegister, type UseFormWatch } from 'react-hook-form'
import { useTextbooks } from '../../textbooks/api/get-textbooks'
import { useMemberAssignments } from '../../textbook-assignments/api/get-member-assignments'
import { useCoachingRecord } from '../api/get-coaching-record'
import { useCreateCoachingRecord } from '../api/create-coaching-record'
import { useUpdateCoachingRecord } from '../api/update-coaching-record'
import { useDeleteCoachingRecord } from '../api/delete-coaching-record'
import { COACHING_TYPES, hasFreeText, hasTestContent, type CoachingRecordInput } from '../types'

interface Props {
  memberId: string
  memberName: string
  /** 会員の業務コード（例: 10001）。対象会員バッジ表示用。 */
  memberCode?: string
  coachName: string
  /** 編集対象。null=新規。 */
  coachingRecordId: string | null
  onClose: () => void
}

interface TestRow {
  textbookId: string
  textbookLabel: string
  testStatus: '未選択' | '未実施' | '実施済み'
  range: string
  format: string
  score: string
  note: string
  nextStatus: '継続' | '卒業'
  isNew: boolean
  dailyGoalMinutes: string
}

interface FormValues {
  type: string
  date: string
  coachName: string
  sharedNote: string
  selectedTextbooks: { textbookId: string; dailyGoalMinutes: string; note: string }[]
  tests: TestRow[]
  monthlyReview: string
  coachAdvice: string
  otherNotes: string
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 会員カルテのコーチング記録 登録/編集モーダル（client再現・種別で動的にセクション切替）。 */
export function CoachingRecordModal({ memberId, memberName, memberCode, coachName, coachingRecordId, onClose }: Props) {
  const isEdit = !!coachingRecordId
  const { data: textbooks = [] } = useTextbooks()
  const { data: assignments = [] } = useMemberAssignments(memberId)
  const { data: editing } = useCoachingRecord(coachingRecordId)
  const create = useCreateCoachingRecord(memberId)
  const update = useUpdateCoachingRecord(memberId, coachingRecordId ?? '')
  const remove = useDeleteCoachingRecord(memberId)
  const pending = create.isPending || update.isPending
  const error = (create.error ?? update.error) as { message?: string } | null

  const { register, handleSubmit, watch, control, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      type: '',
      date: today(),
      coachName,
      sharedNote: '',
      selectedTextbooks: [],
      tests: [],
      monthlyReview: '',
      coachAdvice: '',
      otherNotes: '',
    },
  })

  const type = watch('type')

  const selection = useFieldArray({ control, name: 'selectedTextbooks' })
  const tests = useFieldArray({ control, name: 'tests' })

  // 編集時：詳細をフォームに流し込む
  useEffect(() => {
    if (!isEdit || !editing) return
    reset({
      type: editing.type ?? '',
      date: editing.date ?? today(),
      coachName: editing.coachName ?? coachName,
      sharedNote: editing.sharedNote ?? '',
      selectedTextbooks: (editing.selectedTextbooks ?? []).map((s) => ({
        textbookId: s.textbookId ?? '',
        dailyGoalMinutes: s.dailyGoalMinutes != null ? String(s.dailyGoalMinutes) : '',
        note: s.note ?? '',
      })),
      tests: [],
      monthlyReview: editing.monthlyReview ?? '',
      coachAdvice: editing.coachAdvice ?? '',
      otherNotes: editing.otherNotes ?? '',
    })
  }, [isEdit, editing, reset, coachName])

  const textbookLabel = (id: string) => {
    const t = textbooks.find((x) => x.id === id)
    return t ? `${t.textbookCode}：${t.name}` : id
  }

  // 初回/通常に切替時：テスト行を「現在の割り当て教材」＋（編集時）保存済みテストから組み立てる
  useEffect(() => {
    if (!hasTestContent(type)) return
    const savedTests = (isEdit && editing?.textbookTests) || []
    const byId = new Map<string, TestRow>()
    for (const a of assignments) {
      const id = a.textbookId ?? ''
      byId.set(id, {
        textbookId: id,
        textbookLabel: `${a.textbookCode}：${a.name}`,
        testStatus: '未選択',
        range: '',
        format: '',
        score: '',
        note: '',
        nextStatus: '継続',
        isNew: false,
        dailyGoalMinutes: '',
      })
    }
    for (const s of savedTests) {
      const id = s.textbookId ?? ''
      byId.set(id, {
        textbookId: id,
        textbookLabel: textbookLabel(id),
        testStatus: (s.testStatus as TestRow['testStatus']) ?? '未実施',
        range: s.range ?? '',
        format: s.format ?? '',
        score: s.score ?? '',
        note: s.note ?? '',
        nextStatus: (s.nextStatus as TestRow['nextStatus']) ?? '継続',
        isNew: false,
        dailyGoalMinutes: '',
      })
    }
    setValue('tests', [...byId.values()])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, assignments.length, editing])

  const submit = handleSubmit((v) => {
    const body: CoachingRecordInput = { type: v.type as CoachingRecordInput['type'], date: v.date, coachName: v.coachName }
    if (v.type === '教材選定') {
      body.selectedTextbooks = v.selectedTextbooks
        .filter((s) => s.textbookId)
        .map((s) => ({ textbookId: s.textbookId, dailyGoalMinutes: s.dailyGoalMinutes ? Number(s.dailyGoalMinutes) : null, note: s.note }))
      body.sharedNote = v.sharedNote
    }
    if (hasFreeText(v.type)) {
      body.monthlyReview = v.monthlyReview
      body.coachAdvice = v.coachAdvice
      body.otherNotes = v.otherNotes
    }
    if (hasTestContent(v.type)) {
      body.textbookTests = v.tests
        .filter((t) => t.testStatus === '実施済み' || t.testStatus === '未実施')
        .map((t) => ({
          textbookId: t.textbookId,
          testStatus: t.testStatus as '実施済み' | '未実施',
          range: t.range,
          format: t.format,
          score: t.score,
          note: t.note,
          nextStatus: t.nextStatus,
        }))
      body.newAssignments = v.tests
        .filter((t) => t.isNew && t.textbookId)
        .map((t) => ({ textbookId: t.textbookId, dailyGoalMinutes: t.dailyGoalMinutes ? Number(t.dailyGoalMinutes) : null, note: '' }))
    }
    const onDone = { onSuccess: onClose }
    if (isEdit) update.mutate(body, onDone)
    else create.mutate(body, onDone)
  })

  const onDelete = () => {
    if (!coachingRecordId) return
    if (!confirm('このコーチング記録を削除します。よろしいですか？')) return
    remove.mutate(coachingRecordId, { onSuccess: onClose })
  }

  // 教材選定で追加候補（未選定の教材）
  const selectionCandidates = useMemo(() => {
    const chosen = new Set(selection.fields.map((_, i) => watch(`selectedTextbooks.${i}.textbookId`)))
    return textbooks.filter((t) => !chosen.has(t.id))
  }, [textbooks, selection.fields, watch])

  // 新教材追加候補（テスト行に無い教材）
  const newTestCandidates = useMemo(() => {
    const present = new Set(tests.fields.map((f) => (f as unknown as TestRow).textbookId))
    return textbooks.filter((t) => !present.has(t.id!))
  }, [textbooks, tests.fields])

  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div className="center-modal center-modal-lg" data-testid="cr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="center-modal-header">
          <div className="panel-title">{isEdit ? 'コーチング記録の編集' : '＋ コーチングを記録する'}</div>
          <button className="panel-close" data-testid="cr-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="karte-form">
          <div className="center-modal-body">
            {error && <p className="form-error" data-testid="cr-error">{error.message ?? '保存に失敗しました'}</p>}

            <div className="cr-target" data-testid="cr-target">
              対象会員：<strong>{memberName}</strong> さん{memberCode ? `（${memberCode}）` : ''}
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="form-group">
                実施日 *
                <input type="date" data-testid="cr-date" max={today()} {...register('date', { required: true })} />
              </label>
              <label className="form-group">
                担当コーチ
                <input data-testid="cr-coachName" readOnly {...register('coachName')} />
              </label>
            </div>

            <label className="form-group" style={{ display: 'block', marginTop: 8 }}>
              タイプ *
              <select data-testid="cr-type" {...register('type', { required: true })}>
                <option value="">選択してください</option>
                {COACHING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            {type === '教材選定' && (
              <SelectionSection
                fields={selection.fields}
                append={selection.append}
                remove={selection.remove}
                register={register}
                candidates={selectionCandidates.map((t) => ({ id: t.id!, label: `${t.textbookCode}：${t.name}` }))}
              />
            )}

            {hasTestContent(type) && (
              <TestSection
                fields={tests.fields as unknown as TestRow[]}
                append={tests.append}
                remove={tests.remove}
                register={register}
                watch={watch}
                control={control}
                candidates={newTestCandidates.map((t) => ({ id: t.id!, label: `${t.textbookCode}：${t.name}` }))}
              />
            )}

            {hasFreeText(type) && (
              <div style={{ marginTop: 14 }}>
                <label className="form-group" style={{ display: 'block' }}>
                  この1ヶ月間の振り返り（任意）
                  <textarea data-testid="cr-monthlyReview" rows={3} {...register('monthlyReview')} />
                </label>
                <label className="form-group" style={{ display: 'block', marginTop: 8 }}>
                  コーチからのアドバイス（任意）
                  <textarea data-testid="cr-coachAdvice" rows={3} {...register('coachAdvice')} />
                </label>
                <label className="form-group" style={{ display: 'block', marginTop: 8 }}>
                  その他質問・補足（任意）
                  <textarea data-testid="cr-otherNotes" rows={3} {...register('otherNotes')} />
                </label>
              </div>
            )}
          </div>

          <div className="center-modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {isEdit && (
                <button type="button" className="secondary-btn" data-testid="cr-delete" onClick={onDelete} style={{ color: '#C0392B' }}>
                  🗑 削除
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
              <button type="submit" className="primary-btn" data-testid="cr-submit" disabled={pending}>
                {pending ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ───────────────────── 教材選定セクション ─────────────────────
function SelectionSection({
  fields,
  append,
  remove,
  register,
  candidates,
}: {
  fields: Record<'id', string>[]
  append: (v: { textbookId: string; dailyGoalMinutes: string; note: string }) => void
  remove: (i: number) => void
  register: UseFormRegister<FormValues>
  candidates: { id: string; label: string }[]
}) {
  return (
    <div style={{ marginTop: 14 }} data-testid="cr-selection-section">
      <div className="form-label">選定した教材（任意）</div>
      {fields.length === 0 && (
        <div style={{ fontSize: 12, color: '#999', padding: '10px 0' }}>教材がまだ選択されていません</div>
      )}
      {fields.map((f, i) => (
        <div key={f.id} data-testid={`cr-selection-row-${i}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <select {...register(`selectedTextbooks.${i}.textbookId` as const)} data-testid={`cr-selection-textbook-${i}`}>
            <option value="">教材を選択</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input type="number" placeholder="目標分" {...register(`selectedTextbooks.${i}.dailyGoalMinutes` as const)} data-testid={`cr-selection-goal-${i}`} />
          <input placeholder="メモ" {...register(`selectedTextbooks.${i}.note` as const)} data-testid={`cr-selection-note-${i}`} />
          <button type="button" className="secondary-btn" onClick={() => remove(i)} aria-label="削除">×</button>
        </div>
      ))}
      <button
        type="button"
        className="karte-add-row"
        data-testid="cr-selection-add"
        onClick={() => append({ textbookId: '', dailyGoalMinutes: '', note: '' })}
      >
        ＋ 教材を追加
      </button>
      <div className="karte-hint">
        <span>💡</span>
        <span>PROGOS結果に基づいて初期教材を選定してください。選定した教材は会員に自動で割り当てられます。</span>
      </div>
    </div>
  )
}

// ───────────────────── テスト内容セクション ─────────────────────
function TestSection({
  fields,
  append,
  remove,
  register,
  watch,
  candidates,
}: {
  fields: TestRow[]
  append: (v: TestRow) => void
  remove: (i: number) => void
  register: UseFormRegister<FormValues>
  watch: UseFormWatch<FormValues>
  control: Control<FormValues>
  candidates: { id: string; label: string }[]
}) {
  return (
    <div style={{ marginTop: 14 }} data-testid="cr-test-section">
      <div className="form-label">テスト内容（教材ごと）</div>
      {fields.length === 0 && (
        <div style={{ fontSize: 12, color: '#999', padding: '10px 0' }}>割り当て教材がありません。「＋ 新教材を追加」から追加できます。</div>
      )}
      {fields.map((f, i) => {
        const status = watch(`tests.${i}.testStatus`)
        return (
          <div key={`${f.textbookId}-${i}`} data-testid={`cr-test-row-${i}`} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>📖 {f.textbookLabel}</div>
              <select {...register(`tests.${i}.testStatus` as const)} data-testid={`cr-test-status-${i}`} style={{ minWidth: 100 }}>
                <option value="未選択">未選択</option>
                <option value="未実施">未実施</option>
                <option value="実施済み">実施済み</option>
              </select>
            </div>
            {status === '実施済み' && (
              <div style={{ marginTop: 10, padding: 10, background: '#F8F9FA', borderRadius: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <label className="form-group">範囲<input {...register(`tests.${i}.range` as const)} placeholder="例：全範囲、Day1〜30" /></label>
                  <label className="form-group">形式<input {...register(`tests.${i}.format` as const)} placeholder="例：筆記、口頭" /></label>
                  <label className="form-group">点数<input {...register(`tests.${i}.score` as const)} placeholder="例：80点、合格" data-testid={`cr-test-score-${i}`} /></label>
                  <label className="form-group">備考<input {...register(`tests.${i}.note` as const)} placeholder="例：発音注意" /></label>
                </div>
                <label className="form-group" style={{ display: 'block' }}>
                  ⭐ 次回ステータス
                  <select {...register(`tests.${i}.nextStatus` as const)} data-testid={`cr-test-next-${i}`}>
                    <option value="継続">継続</option>
                    <option value="卒業">卒業</option>
                  </select>
                  <span style={{ fontSize: 11, color: '#888' }}>「卒業」を選ぶと、次回からテスト対象外となり卒業教材一覧に移動します</span>
                </label>
              </div>
            )}
            {f.isNew && (
              <button type="button" className="secondary-btn" onClick={() => remove(i)} style={{ marginTop: 6, fontSize: 11 }}>この新教材を取り消す</button>
            )}
          </div>
        )
      })}
      {candidates.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <select data-testid="cr-new-textbook-select" id="cr-new-textbook-select" defaultValue="">
            <option value="">新教材を選択</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="karte-add-row"
            style={{ width: 'auto', marginTop: 0, whiteSpace: 'nowrap' }}
            data-testid="cr-new-textbook-add"
            onClick={() => {
              const sel = document.getElementById('cr-new-textbook-select') as HTMLSelectElement | null
              const id = sel?.value
              if (!id) return
              const label = candidates.find((c) => c.id === id)?.label ?? id
              append({ textbookId: id, textbookLabel: label, testStatus: '未実施', range: '', format: '', score: '', note: '', nextStatus: '継続', isNew: true, dailyGoalMinutes: '' })
              if (sel) sel.value = ''
            }}
          >
            ＋ 新教材を追加
          </button>
        </div>
      )}
    </div>
  )
}
