import { useState } from 'react'
import { OCCUPATIONS, RESIDENCES, TRAVEL_COUNTRIES, TRAVEL_REASONS, STATUSES } from '../schemas'
import type { MemberListQuery } from '../types'

/** 受講開始月の選択肢（直近18ヶ月、'YYYY-MM'）。 */
function recentMonths(n = 18): string[] {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() - 1)
  }
  return out
}

/** 集計・マスタ未実装の条件（B群）。client 通り並べるが操作不可（準備中）。 */
function DisabledSelect({ label, testid }: { label: string; testid: string }) {
  return (
    <div>
      <div className="search-section-label">{label}</div>
      <select className="form-select" data-testid={testid} disabled defaultValue="">
        <option value="">準備中（集計実装後）</option>
      </select>
    </div>
  )
}

export function SearchPanel({ onSearch }: { onSearch: (q: MemberListQuery) => void }) {
  const [keywordType, setKeywordType] = useState<'name' | 'code'>('name')
  const [keyword, setKeyword] = useState('')
  const [startMonth, setStartMonth] = useState('')
  const [occupation, setOccupation] = useState('')
  const [residence, setResidence] = useState('')
  const [travelCountry, setTravelCountry] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [travelReason, setTravelReason] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q: MemberListQuery = {}
    if (keyword) {
      q.keyword = keyword
      q.keywordType = keywordType
    }
    if (startMonth) q.startMonth = startMonth
    if (occupation) q.occupation = occupation
    if (residence) q.residence = residence
    if (travelCountry) q.travelCountry = travelCountry
    if (travelDate) q.travelDate = travelDate
    if (travelReason) q.travelReason = travelReason
    onSearch(q)
  }

  const clear = () => {
    setKeyword('')
    setStartMonth('')
    setOccupation('')
    setResidence('')
    setTravelCountry('')
    setTravelDate('')
    setTravelReason('')
    onSearch({})
  }

  return (
    <form className="search-panel" onSubmit={submit}>
      {/* ① キーワード検索 */}
      <div className="search-section">
        <div className="search-section-label">キーワード検索</div>
        <div className="search-tabs">
          <button type="button" data-testid="member-search-tab-name" className={`search-tab ${keywordType === 'name' ? 'active' : ''}`} onClick={() => setKeywordType('name')}>氏名で検索</button>
          <button type="button" data-testid="member-search-tab-code" className={`search-tab ${keywordType === 'code' ? 'active' : ''}`} onClick={() => setKeywordType('code')}>会員IDで検索</button>
        </div>
        <input className="form-input" data-testid="member-search-keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={keywordType === 'name' ? '氏名またはニックネームを入力' : '会員IDを入力'} />
      </div>

      {/* 中段（B群はすべて準備中） */}
      <div className="search-grid-4">
        <DisabledSelect label="今月達成率" testid="member-search-rate" />
        <DisabledSelect label="最終ログイン" testid="member-search-lastLogin" />
        <DisabledSelect label="前回の学習記録から" testid="member-search-lastRecord" />
        <DisabledSelect label="前回コーチングから" testid="member-search-lastCoaching" />
      </div>

      <div className="search-grid-3">
        <DisabledSelect label="使用教材（複数選択可）" testid="member-search-textbook" />
        <DisabledSelect label="PROGOSオーバーオール" testid="member-search-progos" />
        <div>
          <div className="search-section-label">受講開始月</div>
          <select className="form-select" data-testid="member-search-startMonth" value={startMonth} onChange={(e) => setStartMonth(e.target.value)}>
            <option value="">すべて</option>
            {recentMonths().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* 詳細検索トグル */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--color-border)' }}>
        <button type="button" className="secondary-btn" data-testid="member-search-detail-toggle" style={{ width: '100%' }} onClick={() => setDetailOpen((v) => !v)}>
          {detailOpen ? '− 詳細検索を隠す' : '＋ 詳細検索を表示'}
        </button>
      </div>

      {detailOpen && (
        <div data-testid="member-search-detail" style={{ marginTop: 12 }}>
          <div className="search-grid-3">
            {/* ステータスは compute-on-read のため後回し（準備中） */}
            <div>
              <div className="search-section-label">ステータス</div>
              <select className="form-select" data-testid="member-search-status" disabled defaultValue="">
                <option value="">準備中</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="search-section-label">職業</div>
              <select className="form-select" data-testid="member-search-occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                <option value="">すべて</option>
                {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <div className="search-section-label">入学時の在住国</div>
              <select className="form-select" data-testid="member-search-residence" value={residence} onChange={(e) => setResidence(e.target.value)}>
                <option value="">すべて</option>
                {RESIDENCES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="search-grid-3" style={{ marginTop: 12 }}>
            {/* オリエン担当は staff マスタAPI未実装のため準備中 */}
            <DisabledSelect label="オリエン担当者" testid="member-search-orientStaff" />
            <div>
              <div className="search-section-label">渡航先（国）</div>
              <select className="form-select" data-testid="member-search-travelCountry" value={travelCountry} onChange={(e) => setTravelCountry(e.target.value)}>
                <option value="">すべて</option>
                {TRAVEL_COUNTRIES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div className="search-section-label">渡航時期</div>
              <select className="form-select" data-testid="member-search-travelDate" value={travelDate} onChange={(e) => setTravelDate(e.target.value)}>
                <option value="">すべて</option>
                <option value="within3m">3ヶ月以内</option>
                <option value="within6m">半年以内</option>
                <option value="within12m">1年以内</option>
                <option value="over12m">1年以上先</option>
              </select>
            </div>
          </div>

          <div className="search-grid-3" style={{ marginTop: 12 }}>
            <div>
              <div className="search-section-label">渡航理由</div>
              <select className="form-select" data-testid="member-search-travelReason" value={travelReason} onChange={(e) => setTravelReason(e.target.value)}>
                <option value="">すべて</option>
                {TRAVEL_REASONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="search-actions">
        <button type="button" className="secondary-btn" data-testid="member-search-clear" onClick={clear}>クリア</button>
        <button type="submit" className="search-submit-btn" data-testid="member-search-submit">この条件で検索する</button>
      </div>
    </form>
  )
}
