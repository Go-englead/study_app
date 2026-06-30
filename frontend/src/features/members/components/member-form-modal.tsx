import { MemberForm } from './member-form'
import { useCreateMember } from '../api/create-member'
import { alertServerError } from '../../../lib/form-error'

interface Props {
  onClose: () => void
  /** 登録完了時：仮パスワードを親へ通知 */
  onRegistered?: (tempPassword: string) => void
}

/** 新規会員登録モーダル（admin.html の center-modal 構造に準拠・中央表示）。 */
export function MemberFormModal({ onClose, onRegistered }: Props) {
  const create = useCreateMember()
  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div
        className="center-modal center-modal-lg"
        data-testid="member-modal"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="center-modal-header">
          <div className="panel-title">＋ 新規会員を登録</div>
          <button className="panel-close" data-testid="member-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="center-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <MemberForm
            submitLabel="登録する"
            submitting={create.isPending}
            onCancel={onClose}
            onSubmit={(input) =>
              create.mutate(input, {
                onSuccess: (res) => {
                  onRegistered?.(res.tempPassword ?? '(なし)')
                  onClose()
                },
                onError: (e) => alertServerError(e, '登録に失敗しました'),
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
