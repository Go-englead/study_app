import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useLogin } from '../../features/auth/api/login'
import { getToken } from '../../lib/auth'

function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate({ to: '/dashboard' }) },
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1B3A57 0%, #2E5A7E 100%)',
        padding: 24,
      }}
    >
      <div
        className="login-card"
        data-testid="login-card"
        style={{ background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#27AE60', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22 }}>
            学
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>学習管理アプリ</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>アカウント情報を入力してください</div>
        </div>

        {login.isError && (
          <div className="form-error" data-testid="login-error" style={{ marginBottom: 12, background: '#FDEDEC', padding: '8px 12px', borderRadius: 6 }}>
            {(login.error as { message?: string })?.message ?? 'IDまたはパスワードが違います'}
          </div>
        )}

        <form onSubmit={submit}>
          <label className="form-group" style={{ display: 'block', marginBottom: 12 }}>
            ログインID
            <input
              type="text"
              className="form-input"
              data-testid="login-id"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label className="form-group" style={{ display: 'block', marginBottom: 20 }}>
            パスワード
            <input
              type="password"
              className="form-input"
              data-testid="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <button
            type="submit"
            className="primary-btn"
            data-testid="login-submit"
            disabled={login.isPending}
            style={{ width: '100%' }}
          >
            {login.isPending ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    // 既にログイン済みならダッシュボードへ
    if (getToken()) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})
