import { useState } from 'react'
import { useTextbooks } from '../api/get-textbooks'
import { TextbookFormModal } from './textbook-form-modal'
import type { TextbookListQuery } from '../types'

type ModalState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; textbookId: string }

export function TextbooksScreen() {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [applied, setApplied] = useState<TextbookListQuery>({})
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const { data: textbooks = [], isLoading, isError } = useTextbooks(applied)

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setApplied({ name: name || undefined, category: category || undefined })
  }
  const onClear = () => {
    setName('')
    setCategory('')
    setApplied({})
  }

  return (
    <div className="screen active">
      <div className="page-title">教材管理</div>
      <div className="page-sub">教材マスターと割り当ての管理</div>

      {/* 検索フォーム（常時上部・同一一覧をフィルタ） */}
      <form className="search-panel" onSubmit={onSearch}>
        <div className="search-grid-3">
          <div>
            <div className="search-section-label">教材名</div>
            <input className="form-input" data-testid="textbook-search-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="教材名で検索" />
          </div>
          <div>
            <div className="search-section-label">カテゴリ</div>
            <input className="form-input" data-testid="textbook-search-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="カテゴリで検索" />
          </div>
        </div>
        <div className="search-actions">
          <button type="button" className="secondary-btn" data-testid="textbook-search-clear" onClick={onClear}>クリア</button>
          <button type="submit" className="search-submit-btn" data-testid="textbook-search-submit">この条件で検索する</button>
        </div>
      </form>

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
                <th>カテゴリ</th>
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
