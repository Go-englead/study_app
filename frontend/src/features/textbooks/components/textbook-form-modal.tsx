import { TextbookForm } from './textbook-form'
import { useCreateTextbook } from '../api/create-textbook'
import { useUpdateTextbook } from '../api/update-textbook'
import { useDeleteTextbook } from '../api/delete-textbook'
import { useTextbook } from '../api/get-textbook'
import { textbookToFormValues } from '../schemas'

interface Props {
  /** 'new' = 新規登録 / textbookId = 編集 */
  mode: 'new' | string
  onClose: () => void
}

/** 教材の登録/編集モーダル（同一フォーム・会員フォームのデザインを流用）。 */
export function TextbookFormModal({ mode, onClose }: Props) {
  const isNew = mode === 'new'
  return (
    <div className="center-modal-overlay show" onClick={onClose}>
      <div
        className="center-modal center-modal-lg"
        data-testid="textbook-modal"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="center-modal-header">
          <div className="panel-title">{isNew ? '＋ 教材を追加' : '✏️ 教材を編集'}</div>
          <button className="panel-close" data-testid="textbook-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="center-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {isNew ? (
            <NewTextbookBody onClose={onClose} />
          ) : (
            <EditTextbookBody textbookId={mode} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}

function NewTextbookBody({ onClose }: { onClose: () => void }) {
  const create = useCreateTextbook()
  return (
    <>
      {create.isError && (
        <p className="form-error">{(create.error as { message?: string })?.message ?? '登録に失敗しました'}</p>
      )}
      <TextbookForm
        submitLabel="登録する"
        submitting={create.isPending}
        onCancel={onClose}
        onSubmit={(input) => create.mutate(input, { onSuccess: onClose })}
      />
    </>
  )
}

function EditTextbookBody({ textbookId, onClose }: { textbookId: string; onClose: () => void }) {
  const { data: textbook, isLoading, isError } = useTextbook(textbookId)
  const update = useUpdateTextbook(textbookId)
  const del = useDeleteTextbook()

  if (isLoading) return <p>読み込み中…</p>
  if (isError || !textbook) return <p className="form-error">教材が見つかりません</p>

  const onDelete = () => {
    if (!confirm(`教材「${textbook.name}」を削除します。よろしいですか？`)) return
    del.mutate(textbookId, { onSuccess: onClose })
  }

  return (
    <>
      {update.isError && (
        <p className="form-error">{(update.error as { message?: string })?.message ?? '更新に失敗しました'}</p>
      )}
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        <button
          type="button"
          className="secondary-btn"
          data-testid="textbook-delete"
          style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          onClick={onDelete}
        >
          🗑 この教材を削除
        </button>
      </div>
      <TextbookForm
        lockCode
        submitLabel="変更を保存"
        submitting={update.isPending}
        defaultValues={textbookToFormValues(textbook)}
        onCancel={onClose}
        onSubmit={(input) => update.mutate(input, { onSuccess: onClose })}
      />
    </>
  )
}
