import { useMember } from '../api/get-member'

interface Props {
  memberId: string
}

/** 会員カルテ上部のプロフィールヘッダー（client のダークカード再現・表示のみ）。 */
export function KarteProfileHeader({ memberId }: Props) {
  const { data: m } = useMember(memberId)
  if (!m) return null

  const stats: { label: string; value: string }[] = [
    { label: '会員ID', value: m.code ?? '-' },
    { label: '生年月日', value: m.birthDate || '-' },
    { label: '受講開始日', value: m.startDate || '-' },
    { label: '卒業予定日', value: m.graduateDate || '-' },
  ]

  return (
    <div
      className="karte-profile"
      data-testid="karte-profile"
      style={{
        background: 'linear-gradient(135deg, #1B3A57 0%, #2E5A7E 100%)',
        color: '#fff',
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div
          className="member-avatar"
          style={{ width: 56, height: 56, fontSize: 22, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          {(m.name ?? '?').charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }} data-testid="karte-profile-name">{m.name}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            @{m.nickname || '-'} ／ {m.currentClass || '-'}
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.9, maxWidth: 320, textAlign: 'right' }}>
          {m.coachLearningGoal || ''}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
