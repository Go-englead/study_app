import { createRootRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { getToken, getUser, clearAuth } from '../../lib/auth'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    // 未ログインで /login 以外にアクセスしたらログイン画面へ
    if (!getToken() && location.pathname !== '/login') {
      throw redirect({ to: '/login' })
    }
  },
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

function logout() {
  clearAuth()
  window.location.assign('/login')
}

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // ログイン画面はサイドバー等を出さない（ベアレイアウト）
  if (pathname === '/login') {
    return <Outlet />
  }

  const title = TITLES[`/${pathname.split('/')[1]}`] ?? 'ダッシュボード'
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const user = getUser()
  const initial = (user?.name ?? 'コ').charAt(0)

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
              <div className="admin-avatar">{initial}</div>
              <div>
                <div className="admin-name">{user?.name ?? '-'}</div>
                <div className="admin-role">{user?.role ?? ''}</div>
              </div>
            </div>
            <button className="logout-btn" data-testid="logout" onClick={logout}>
              ログアウト
            </button>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
