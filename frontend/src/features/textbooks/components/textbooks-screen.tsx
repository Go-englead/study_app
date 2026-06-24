import { useState } from 'react'
import { useTextbooks } from '../api/get-textbooks'
import { TextbookFormModal } from './textbook-form-modal'

type ModalState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; textbookId: string }

export function TextbooksScreen() {
  const { data: textbooks = [], isLoading, isError } = useTextbooks()
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  return (
    <div className="screen active">
      <div className="page-title">教材管理</div>
      <div className="page-sub">教材マスターと割り当ての管理</div>

      <div className="page-header" style={{ marginTop: 12 }}>
        <span />
        <button className="primary-btn" data-testid="textbook-create-open" onClick={() => setModal({ mode: 'new' })}>
          ＋ 教材を追加
        </button>
      </div>

      <div className="card">
        {isLoading && <p>読み込み中…</p>}
        {isError && <p className="form-error">取得に失敗しました</p>}
        {!isLoading && !isError && (
          <table data-testid="textbooks-table">
            <thead>
              <tr>
                <th>教材ID</th>
                <th>教材名</th>
                <th>タイプ</th>
                <th>単位</th>
                <th>カラー</th>
              </tr>
            </thead>
            <tbody>
              {textbooks.map((t) => (
                <tr
                  key={t.id}
                  className="member-row"
                  data-testid={`textbook-row-${t.textbookCode}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setModal({ mode: 'edit', textbookId: t.id! })}
                >
                  <td>{t.textbookCode}</td>
                  <td>{t.name}</td>
                  <td>{t.category ? <span className="type-badge">{t.category}</span> : '-'}</td>
                  <td>{t.unit}</td>
                  <td>
                    <span className="color-dot" style={{ background: t.color }} aria-label={t.color} />
                    {t.color}
                  </td>
                </tr>
              ))}
              {textbooks.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>教材がありません</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal.mode === 'new' && (
        <TextbookFormModal mode="new" onClose={() => setModal({ mode: 'closed' })} />
      )}
      {modal.mode === 'edit' && (
        <TextbookFormModal mode={modal.textbookId} onClose={() => setModal({ mode: 'closed' })} />
      )}
    </div>
  )
}
