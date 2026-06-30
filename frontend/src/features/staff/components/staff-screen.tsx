import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useStaffList } from '../api/get-staff'
import { useCreateStaff } from '../api/create-staff'
import { useUpdateStaff } from '../api/update-staff'
import { useDeleteStaff } from '../api/delete-staff'
import { STAFF_ROLES, ROLE_LABELS, roleLabel, type StaffSummary } from '../types'
import {
  staffCreateSchema,
  staffEditSchema,
  toStaffRegisterInput,
  toStaffUpdateInput,
  type StaffFormValues,
} from '../schemas'
import { alertServerError } from '../../../lib/form-error'

type ModalState = { mode: 'create' } | { mode: 'edit'; staff: StaffSummary } | null

/** スタッフ管理画面（一覧＋検索＋登録/編集＋削除）。client再現。 */
export function StaffScreen() {
  // input は手元の状態、query は debounce 後の確定検索語（サーバー検索のキー＝多重呼び出し防止）。
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQuery(input), 300)
    return () => clearTimeout(t)
  }, [input])
  const { data: filtered = [], isLoading } = useStaffList(query.trim())
  const [modal, setModal] = useState<ModalState>(null)

  return (
    <div className="screen active">
      <div className="page-title">スタッフ管理</div>
      <div className="page-sub">コーチ・講師・コンサル・CS・運営の情報を管理</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            data-testid="staff-search"
            className="form-input"
            placeholder="氏名・社員ID・メールで検索"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="primary-btn" data-testid="staff-create-open" onClick={() => setModal({ mode: 'create' })}>
            ＋ 新規スタッフを登録
          </button>
        </div>
      </div>

      <div className="card" data-testid="staff-table-card">
        <div className="card-body">
          {isLoading && <p>読み込み中…</p>}
          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>
              スタッフがいません
            </div>
          )}
          {filtered.length > 0 && (
            <table className="staff-table" data-testid="staff-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '8px 4px' }}>社員ID</th>
                  <th style={{ padding: '8px 4px' }}>氏名</th>
                  <th style={{ padding: '8px 4px' }}>メール</th>
                  <th style={{ padding: '8px 4px' }}>役割</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} data-testid={`staff-row-${s.staffCode}`} style={{ borderBottom: '1px solid #f3f3f3' }}>
                    <td style={{ padding: '8px 4px' }}>{s.staffCode}</td>
                    <td style={{ padding: '8px 4px' }}>{s.name}</td>
                    <td style={{ padding: '8px 4px', color: '#666' }}>{s.email}</td>
                    <td style={{ padding: '8px 4px' }}>
                      <span className="role-badge" style={{ background: '#EAF2F8', color: '#2E5A7E', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>
                        {roleLabel(s.role)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                      <button
                        className="secondary-btn"
                        data-testid={`staff-edit-${s.staffCode}`}
                        onClick={() => setModal({ mode: 'edit', staff: s })}
                        style={{ fontSize: 12 }}
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && <StaffFormModal state={modal} onClose={() => setModal(null)} />}
    </div>
  )
}

function StaffFormModal({ state, onClose }: { state: NonNullable<ModalState>; onClose: () => void }) {
  const isEdit = state.mode === 'edit'
  const editing = isEdit ? state.staff : undefined
  const create = useCreateStaff()
  const update = useUpdateStaff(editing?.id ?? '')
  const remove = useDeleteStaff()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(isEdit ? staffEditSchema : staffCreateSchema),
    defaultValues: {
      staffCode: editing?.staffCode ?? '',
      name: editing?.name ?? '',
      role: (editing?.role as StaffFormValues['role']) ?? 'Coach',
      email: editing?.email ?? '',
      password: '',
    },
  })

  const field = (name: keyof StaffFormValues) => ({
    ...register(name),
    'data-testid': `staff-field-${name}`,
  })
  const err = (k: keyof StaffFormValues) =>
    errors[k] ? (
      <span className="form-error" data-testid={`staff-error-${k}`}>
        {errors[k]?.message as string}
      </span>
    ) : null

  const pending = create.isPending || update.isPending || remove.isPending

  const submit = handleSubmit((values) => {
    if (isEdit) {
      update.mutate(toStaffUpdateInput(values), { onSuccess: onClose, onError: (e) => alertServerError(e) })
    } else {
      create.mutate(toStaffRegisterInput(values), { onSuccess: onClose, onError: (e) => alertServerError(e) })
    }
  })

  const onDelete = () => {
    if (!editing) return
    if (!confirm(`「${editing.name}」を削除します。よろしいですか？`)) return
    remove.mutate(editing.id!, { onSuccess: onClose, onError: (e) => alertServerError(e) })
  }

  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div className="center-modal" data-testid="staff-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="center-modal-header">
          <div className="panel-title">{isEdit ? 'スタッフ情報の編集' : '＋ 新規スタッフを登録'}</div>
          <button className="panel-close" data-testid="staff-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="karte-form">
          <div className="center-modal-body">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="form-group">
                社員ID *
                <input
                  {...field('staffCode')}
                  readOnly={isEdit}
                  aria-disabled={isEdit}
                  className={isEdit ? 'input-locked' : undefined}
                  placeholder="例：MW001"
                />
                {err('staffCode')}
              </label>
              <label className="form-group">
                氏名 *
                <input {...field('name')} />
                {err('name')}
              </label>
              <label className="form-group">
                役割 *
                <select {...field('role')}>
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                {err('role')}
              </label>
              <label className="form-group">
                メール *
                <input type="email" {...field('email')} />
                {err('email')}
              </label>
              <label className="form-group">
                パスワード {isEdit ? '（変更する場合のみ）' : '*'}
                <input
                  type="password"
                  {...field('password')}
                  placeholder={isEdit ? '空欄なら据え置き' : '8文字以上'}
                />
                {err('password')}
              </label>
            </div>
          </div>
          <div className="center-modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {isEdit && (
                <button type="button" className="secondary-btn" data-testid="staff-delete" onClick={onDelete} style={{ color: '#C0392B' }}>
                  🗑 削除
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
              <button type="submit" className="primary-btn" data-testid="staff-submit" disabled={pending}>
                {pending ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
