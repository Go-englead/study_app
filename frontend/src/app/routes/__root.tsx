import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

// サイドバー6タブ（admin.html の nav-menu に準拠）
const NAV = [
  { to: '/dashboard', label: 'ダッシュボード' },
  { to: '/members', label: '会員管理' },
  { to: '/karte', label: '会員カルテ' },
  { to: '/textbooks', label: '教材管理' },
  { to: '/progos', label: 'PROGOS分析' },
  { to: '/staff', label: 'スタッフ管理' },
] as const

const TITLES: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.to, n.label]))

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const title = TITLES[`/${pathname.split('/')[1]}`] ?? 'ダッシュボード'
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="layout">
      {/* ===== 左サイドバー ===== */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">学</div>
          <div>
            <div className="brand-text">学習管理アプリ</div>
            <div className="brand-sub">管理画面</div>
          </div>
        </div>
        <ul className="nav-menu">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                className="nav-item"
                activeProps={{ className: 'nav-item active' }}
              >
                <span className="nav-icon"></span>
                <span>{n.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* ===== メインエリア ===== */}
      <div className="main-area">
        <header className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{today}</div>
          </div>
          <div className="topbar-right">
            <div className="admin-info">
              <div className="admin-avatar">コ</div>
              <div>
                <div className="admin-name">コーチA</div>
                <div className="admin-role">Coach</div>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
