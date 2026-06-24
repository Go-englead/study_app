import { useState } from 'react'
import { useMembers } from '../../members/api/get-members'
import { useMemberAssignments } from '../api/get-member-assignments'
import { useUnassignTextbook } from '../api/unassign-textbook'
import { AssignTextbookModal } from './assign-textbook-modal'

/** 教材管理「会員への割り当て」：左＝会員選択／右＝その会員の割り当て教材（追加/解除）。 */
export function AssignmentsScreen() {
  const { data: members = [] } = useMembers()
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const selectedMember = members.find((m) => m.id === selectedMemberId)

  return (
    <div className="assign-layout">
      {/* 左：会員選択 */}
      <div className="card" data-testid="assign-member-list">
        <div className="karte-list-header">会員を選択</div>
        <div>
          {members.map((m) => (
            <div
              key={m.id}
              className={`karte-list-item ${m.id === selectedMemberId ? 'active' : ''}`}
              data-testid={`assign-member-${m.code}`}
              onClick={() => setSelectedMemberId(m.id!)}
            >
              <div className="member-avatar">{(m.name ?? '?').charAt(0)}</div>
              <div>
                <div className="member-name">{m.name}</div>
                <div className="member-nickname">@{m.nickname || '-'}</div>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>
              会員がまだ登録されていません
            </div>
          )}
        </div>
      </div>

      {/* 右：割り当て教材 */}
      <div id="assign-main">
        {!selectedMember ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: '#999' }}>
            左の一覧から会員を選択してください
          </div>
        ) : (
          <MemberAssignments memberId={selectedMember.id!} memberName={selectedMember.name ?? ''} />
        )}
      </div>
    </div>
  )
}

function MemberAssignments({ memberId, memberName }: { memberId: string; memberName: string }) {
  const { data: assignments = [], isLoading } = useMemberAssignments(memberId)
  const unassign = useUnassignTextbook(memberId)
  const [showAssign, setShowAssign] = useState(false)

  const onUnassign = (textbookId: string, name: string) => {
    if (!confirm(`「${name}」の割り当てを解除します。よろしいですか？`)) return
    unassign.mutate(textbookId)
  }

  return (
    <div className="card" data-testid="assign-main">
      <div className="card-header">
        <div>
          <div className="card-title">{memberName} さんの割り当て教材</div>
          <div className="card-sub">{assignments.length}件の教材</div>
        </div>
        <button className="primary-btn" data-testid="assign-open" onClick={() => setShowAssign(true)}>
          ＋ 教材を追加
        </button>
      </div>

      <div className="card-body">
        {isLoading && <p>読み込み中…</p>}
        {!isLoading && assignments.length === 0 && (
          <div style={{ fontSize: 13, color: '#999', padding: 16, textAlign: 'center' }}>
            割り当て教材はまだありません
          </div>
        )}
        {assignments.map((a) => (
          <div className="assigned-item" key={a.textbookId} data-testid={`assignment-row-${a.textbookCode}`}>
            <span className="color-dot" style={{ background: a.color }} aria-hidden />
            <div style={{ flex: 1 }}>
              <div className="assigned-name">{a.textbookCode}：{a.name}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                {a.category || '-'} / {a.unit || '-'}
                {a.note ? `　📝 ${a.note}` : ''}
              </div>
            </div>
            <span className="assigned-target">
              1日の目標: <strong>{a.dailyGoalMinutes != null ? `${a.dailyGoalMinutes}分` : '未設定'}</strong>
            </span>
            <button
              className="assigned-remove"
              data-testid={`assignment-unassign-${a.textbookCode}`}
              onClick={() => onUnassign(a.textbookId!, a.name ?? '')}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {showAssign && (
        <AssignTextbookModal
          memberId={memberId}
          assignedTextbookIds={assignments.map((a) => a.textbookId!).filter(Boolean)}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  )
}
