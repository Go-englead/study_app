/**
 * サーバー側のデータ整合性ルール違反（DomainError 等）を alert で通知する。
 *
 * バリデーションの方針：
 * - フィールド単位のバリデーション（必須・形式・範囲）は zod でクライアント側に行い、
 *   各フィールド下に赤文字で表示する。
 * - 「データそのものに対するルール違反」（例：初回オリエンが無いのに通常オリエンを記録、
 *   コード/メールの重複など）はサーバーが DomainError として返す。これは特定フィールドに
 *   紐づかない整合性ルールなので alert で通知する。
 */
export function alertServerError(error: unknown, fallback = '保存に失敗しました'): void {
  const message = (error as { message?: string } | null)?.message ?? fallback
  // eslint-disable-next-line no-alert
  alert(message)
}
