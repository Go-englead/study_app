import { useState } from 'react'
import { useMembers } from '../api/get-members'
import { MemberFormModal } from './member-form-modal'
import { EditMemberPanel } from './edit-member-panel'
import { SearchPanel } from './search-panel'
import type { MemberListQuery } from '../types'

type ModalState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; memberId: string }

export function MembersScreen() {
  const [applied, setApplied] = useState<MemberListQuery>({})
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const { data: members = [], isLoading, isError } = useMembers(applied)

  return (
    <div className="screen active">
      <div className="page-title">会員管理</div>
      <div className="page-sub">会員情報の確認・編集</div>

      {/* 検索パネル（キーワードのみ。詳細条件は順次追加） */}
      <SearchPanel onSearch={setApplied} />

      <div className="page-header" style={{ marginTop: 12 }}>
        <span />
        <button className="primary-btn" data-testid="member-create-open" onClick={() => setModal({ mode: 'new' })}>＋ 会員を登録</button>
      </div>

      {tempPassword && (
        <div className="card" data-testid="member-temp-password" style={{ margin: '8px 0', padding: 12 }}>
          登録完了。仮パスワード：<strong>{tempPassword}</strong>
          <button className="action-btn" style={{ marginLeft: 12 }} onClick={() => setTempPassword(null)}>閉じる</button>
        </div>
      )}

      <div className="card">
        {isLoading && <p>読み込み中…</p>}
        {isError && <p className="form-error">取得に失敗しました</p>}
        {!isLoading && !isError && (
          <table data-testid="members-table">
            <thead>
              <tr>
                <th>会員ID</th>
                <th>氏名 / ニックネーム</th>
                <th>ステータス</th>
                <th>入会プラン</th>
                <th>受講期間</th>
                <th>現在のクラス</th>
                <th>今月達成率</th>
                <th>最終ログイン</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="member-row"
                  data-testid={`member-row-${m.code}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setModal({ mode: 'edit', memberId: m.id! })}
                >
                  <td>{m.code}</td>
                  <td>{m.name}{m.nickname ? ` / ${m.nickname}` : ''}</td>
                  <td>{m.status}</td>
                  <td>{m.plan}</td>
                  <td>{m.startDate ?? '-'} 〜 {m.graduateDate ?? '-'}</td>
                  <td>{m.currentClass}</td>
                  <td>{m.achievementRate ?? '-'}%</td>
                  <td>{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999' }}>会員がいません</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal.mode === 'new' && (
        <MemberFormModal
          onClose={() => setModal({ mode: 'closed' })}
          onRegistered={(pw) => setTempPassword(pw)}
        />
      )}
      {modal.mode === 'edit' && (
        <EditMemberPanel
          memberId={modal.memberId}
          onClose={() => setModal({ mode: 'closed' })}
        />
      )}
    </div>
  )
}
