import { MemberForm } from './member-form'
import { useMember } from '../api/get-member'
import { useUpdateMember } from '../api/update-member'
import { useDeleteMember } from '../api/delete-member'
import { memberToFormValues } from '../schemas'

const FORM_ID = 'member-edit-form'

/**
 * 会員編集スライドパネル（admin.html の slide-panel 構造に準拠）。
 * 右からスライドインし、フッターに「削除（左）／ キャンセル・変更を保存（右）」を固定配置する。
 */
export function EditMemberPanel({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const { data: member, isLoading, isError } = useMember(memberId)
  const update = useUpdateMember(memberId)
  const del = useDeleteMember()

  const onDelete = () => {
    if (!confirm(`会員「${member?.name ?? ''}」を削除します。よろしいですか？`)) return
    del.mutate(memberId, { onSuccess: onClose })
  }

  return (
    <>
      <div className="overlay show" onClick={onClose} />
      <div className="slide-panel show" data-testid="member-modal">
        <div className="panel-header">
          <div className="panel-title">会員情報の編集</div>
          <button className="panel-close" data-testid="member-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body">
          {isLoading && <p>読み込み中…</p>}
          {isError && <p className="form-error">会員が見つかりません</p>}
          {update.isError && (
            <p className="form-error">{(update.error as { message?: string })?.message ?? '更新に失敗しました'}</p>
          )}
          {member && (
            <MemberForm
              lockCode
              hideActions
              formId={FORM_ID}
              defaultValues={memberToFormValues(member)}
              onSubmit={(input) => update.mutate(input, { onSuccess: onClose })}
            />
          )}
        </div>

        <div className="panel-footer">
          <button
            type="button"
            className="danger-btn"
            data-testid="member-delete"
            onClick={onDelete}
            disabled={!member}
          >
            🗑 削除
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="secondary-btn" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              form={FORM_ID}
              className="primary-btn"
              data-testid="member-form-submit"
              disabled={!member || update.isPending}
            >
              {update.isPending ? '送信中…' : '変更を保存'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
