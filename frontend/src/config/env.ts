/**
 * アプリ全体の設定（環境変数の集約）。bulletproof-react の config 層。
 * 値は import.meta.env から読み、ここで一元的に正規化する。
 */
export const env = {
  /** API のベースパス。dev は Vite が '/api' → :3000 へプロキシ。 */
  API_URL: import.meta.env.VITE_API_URL ?? '/api',
}
