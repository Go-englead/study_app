/**
 * アプリ全体の設定（環境変数の集約）。bulletproof-react の config 層。
 * 値は import.meta.env から読み、ここで一元的に正規化する。
 */
export const env = {
  /** API のベースパス。dev は Vite が '/api' → :3000 へプロキシ。 */
  API_URL: import.meta.env.VITE_API_URL ?? '/api',
  /**
   * 開発用の固定 JWT（職員/admin）。secret 'test-key'・claim { adminId }・期限ほぼ無限。
   * ※sample 段階のみ。ログインAPI ができたら差し替える。
   */
  DEV_ADMIN_TOKEN:
    import.meta.env.VITE_DEV_ADMIN_TOKEN ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiTVcwMDEiLCJleHAiOjQxMDI0NDQ4MDB9.avt56lg_LrJVbBEu8iq4SQN6E0l3uMuQcQCug-YP-eQ',
}
