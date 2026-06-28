/**
 * パスワードハッシュのポート（ドメイン層）。
 * 具体アルゴリズム（argon2 等）は gateway 層の実装に閉じ込め、ドメインは依存しない。
 */
export interface PasswordHasher {
  /** 生パスワードをハッシュ化する（ソルト・パラメータはハッシュ文字列に内包）。 */
  hash(rawPassword: string): Promise<string>;
  /** 保存済みハッシュと生パスワードを照合する。 */
  verify(hash: string, rawPassword: string): Promise<boolean>;
}
