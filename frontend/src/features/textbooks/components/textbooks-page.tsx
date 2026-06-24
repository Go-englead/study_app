import { useState } from 'react'
import { TextbooksScreen } from './textbooks-screen'
import { AssignmentsScreen } from '../../textbook-assignments/components/assignments-screen'

type Tab = 'master' | 'assign'

/** 教材管理ページ。タブで「教材マスター」と「会員への割り当て」を切り替える（client準拠）。 */
export function TextbooksPage() {
  const [tab, setTab] = useState<Tab>('master')

  return (
    <div className="screen active">
      <div className="page-title">教材管理</div>
      <div className="page-sub">教材マスターと割り当ての管理</div>

      <div className="search-tabs" style={{ marginBottom: 16 }}>
        <button type="button" data-testid="textbook-tab-master" className={`search-tab ${tab === 'master' ? 'active' : ''}`} onClick={() => setTab('master')}>教材マスター</button>
        <button type="button" data-testid="textbook-tab-assign" className={`search-tab ${tab === 'assign' ? 'active' : ''}`} onClick={() => setTab('assign')}>会員への割り当て</button>
      </div>

      {tab === 'master' ? <TextbooksScreen /> : <AssignmentsScreen />}
    </div>
  )
}
