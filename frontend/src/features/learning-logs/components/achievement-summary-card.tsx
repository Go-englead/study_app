import { useMemo, useState } from 'react'
import { useLearningLogs } from '../api/get-learning-logs'

interface Props {
  memberId: string
}

type Period = 'today' | 'week' | 'month' | 'all'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '今週' },
  { key: 'month', label: '今月' },
  { key: 'all', label: '累計' },
]

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function inPeriod(date: string, period: Period): boolean {
  const now = new Date()
  const today = toYmd(now)
  if (period === 'all') return true
  if (period === 'today') return date === today
  if (period === 'month') return date.startsWith(today.slice(0, 7))
  // week: 今日から過去6日
  const from = new Date(now)
  from.setDate(from.getDate() - 6)
  return date >= toYmd(from) && date <= today
}

/** 連続学習日数（今日または昨日を起点に、ログのある日が連続する数）。 */
function computeStreak(dates: Set<string>): number {
  const cur = new Date()
  if (!dates.has(toYmd(cur))) {
    // 今日未学習なら昨日起点（途切れていなければ継続中とみなす）
    cur.setDate(cur.getDate() - 1)
    if (!dates.has(toYmd(cur))) return 0
  }
  let streak = 0
  while (dates.has(toYmd(cur))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

/** 会員カルテ「達成サマリー」カード（学習記録から集計・期間切替）。 */
export function AchievementSummaryCard({ memberId }: Props) {
  const { data: logs = [] } = useLearningLogs(memberId)
  const [period, setPeriod] = useState<Period>('month')

  const summary = useMemo(() => {
    const filtered = logs.filter((l) => inPeriod(l.date ?? '', period))
    const totalMinutes = filtered.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
    const studiedDays = new Set(filtered.map((l) => l.date)).size
    const streak = computeStreak(new Set(logs.map((l) => l.date ?? '')))
    return { totalMinutes, studiedDays, streak }
  }, [logs, period])

  const hours = Math.floor(summary.totalMinutes / 60)
  const mins = summary.totalMinutes % 60

  return (
    <div className="card" data-testid="summary-card">
      <div className="card-header">
        <div>
          <div className="card-title">📊 達成サマリー</div>
          <div className="card-sub">期間を切り替えて確認できます</div>
        </div>
        <div className="search-tabs" style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              data-testid={`summary-period-${p.key}`}
              className={`search-tab ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <SummaryStat testid="summary-hours" label="学習時間" value={`${hours}時間${mins}分`} />
          <SummaryStat testid="summary-days" label="学習日数" value={`${summary.studiedDays}日`} />
          <SummaryStat testid="summary-streak" label="連続学習日数" value={`${summary.streak}日`} />
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ testid, label, value }: { testid: string; label: string; value: string }) {
  return (
    <div style={{ background: '#F8F9FA', borderRadius: 8, padding: '16px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
      <div data-testid={testid} style={{ fontSize: 24, fontWeight: 700, color: '#2E86C1', marginTop: 4 }}>{value}</div>
    </div>
  )
}
