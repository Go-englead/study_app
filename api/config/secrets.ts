/**
 * シークレット/環境の解決を集約する。
 * デプロイ環境（preview/production）で JWT_SECRET 未設定なら fail-fast にして、
 * 誤って 'test-key' のままデプロイされる事故を構造的に防ぐ。
 */
export type AppEnv = 'local' | 'preview' | 'production';

/** VERCEL_ENV から実行環境を判定（未定義＝ローカル）。 */
export function appEnv(): AppEnv {
  const v = process.env.VERCEL_ENV;
  return v === 'production' ? 'production' : v === 'preview' ? 'preview' : 'local';
}

/**
 * JWT 署名鍵を解決する。
 * - local: JWT_SECRET があれば使用、無ければ 'test-key'（ローカル限定）
 * - preview / production: Vercel の環境変数 JWT_SECRET 必須。無ければ throw。
 * 毎回 process.env を読む（テストで差し替え可能・固定しない）。
 */
export function jwtSecret(): string {
  const env = appEnv();
  const fromEnv = process.env.JWT_SECRET;
  if (env === 'local') return fromEnv && fromEnv.length > 0 ? fromEnv : 'test-key';
  if (!fromEnv) {
    throw new Error(
      `[secrets] JWT_SECRET is required in ${env} environment (set it in Vercel Environment Variables)`,
    );
  }
  return fromEnv;
}

/** アクセストークンの有効期限（秒）。Phase1 は 8時間（1営業日）。 */
export const TOKEN_TTL_SECONDS = 8 * 60 * 60;
