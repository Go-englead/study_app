import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMembers } from '../../features/members/api/get-members'
import { KarteProfileHeader } from '../../features/members/components/karte-profile-header'
import { AchievementSummaryCard } from '../../features/learning-logs/components/achievement-summary-card'
import { CoachingRecordsCard } from '../../features/coaching-records/components/coaching-records-card'
import { LearningLogsCard } from '../../features/learning-logs/components/learning-logs-card'
import { ProgosScoresCard } from '../../features/progos-scores/components/progos-scores-card'

/** ログイン中コーチ名（当面は固定。スタッフ認証導入後に置換）。 */
const CURRENT_COACH = 'コーチA'

function KartePage() {
  const { data: members = [] } = useMembers()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = members.find((m) => m.id === selectedId)

  return (
    <div className="screen active">
      <div className="page-title">会員カルテ</div>
      <div className="page-sub">会員ごとの学習状況とコーチング記録</div>

      <div className="karte-layout">
        {/* 左：会員選択 */}
        <div className="card karte-list" data-testid="karte-members">
          <div className="karte-list-header">会員を選択</div>
          <div>
            {members.map((m) => (
              <div
                key={m.id}
                className={`karte-list-item ${m.id === selectedId ? 'active' : ''}`}
                data-testid={`karte-member-${m.code}`}
                onClick={() => setSelectedId(m.id!)}
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

        {/* 右：カルテ本体 */}
        <div className="karte-main">
          {!selected ? (
            <div className="card karte-placeholder" style={{ padding: 48, textAlign: 'center', color: '#999' }}>
              左の一覧から会員を選択してください
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <KarteProfileHeader memberId={selected.id!} />
              <AchievementSummaryCard memberId={selected.id!} />
              <CoachingRecordsCard
                memberId={selected.id!}
                memberName={selected.name ?? ''}
                memberCode={selected.code}
                coachName={CURRENT_COACH}
              />
              <LearningLogsCard memberId={selected.id!} />
              <ProgosScoresCard memberId={selected.id!} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/karte')({
  component: KartePage,
})
