import { MemberForm } from './member-form'
import { useMember } from '../api/get-member'
import { useUpdateMember } from '../api/update-member'
import { useDeleteMember } from '../api/delete-member'
import { useSetMemberWithdrawn } from '../api/withdraw-member'
import { ContinuationPlanSection } from './continuation-plan-section'
import { memberToFormValues } from '../schemas'
import { alertServerError } from '../../../lib/form-error'

const FORM_ID = 'member-edit-form'

/**
 * 会員編集スライドパネル（admin.html の slide-panel 構造に準拠）。
 * 右からスライドインし、フッターに「削除（左）／ キャンセル・変更を保存（右）」を固定配置する。
 */
export function EditMemberPanel({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const { data: member, isLoading, isError } = useMember(memberId)
  const update = useUpdateMember(memberId)
  const del = useDeleteMember()
  const withdraw = useSetMemberWithdrawn(memberId)

  const onDelete = () => {
    if (!confirm(`会員「${member?.name ?? ''}」を削除します。よろしいですか？`)) return
    del.mutate(memberId, { onSuccess: onClose, onError: (e) => alertServerError(e, '削除に失敗しました') })
  }

  const isWithdrawn = member?.status === '途中退会'
  const onToggleWithdrawn = () => {
    const msg = isWithdrawn ? '途中退会を取り消しますか？' : 'この会員を途中退会にしますか？'
    if (!confirm(msg)) return
    withdraw.mutate(!isWithdrawn, { onError: (e) => alertServerError(e, '操作に失敗しました') })
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
          {member && (
            <div
              className="card"
              style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12 }}
            >
              <div>
                ステータス：
                <span data-testid="member-status" style={{ fontWeight: 700 }}>{member.status}</span>
                <div style={{ fontSize: 11, color: '#888' }}>※ 日付から自動判定（編集不可）。途中退会のみ手動。</div>
              </div>
              <button
                type="button"
                className="secondary-btn"
                data-testid="member-withdraw-toggle"
                onClick={onToggleWithdrawn}
                disabled={withdraw.isPending}
                style={{ color: isWithdrawn ? undefined : '#C0392B', whiteSpace: 'nowrap' }}
              >
                {isWithdrawn ? '途中退会を取り消す' : '途中退会にする'}
              </button>
            </div>
          )}
          {member && (
            <MemberForm
              lockCode
              hideActions
              formId={FORM_ID}
              defaultValues={memberToFormValues(member)}
              onSubmit={(input) =>
                update.mutate(input, { onSuccess: onClose, onError: (e) => alertServerError(e, '更新に失敗しました') })
              }
            />
          )}
          {member && <ContinuationPlanSection memberId={memberId} plans={member.continuationPlans ?? []} />}
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
