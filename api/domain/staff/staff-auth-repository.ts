import { Role, StaffId } from './staff';

/** ログイン照合に必要な、職員プロフィール＋資格情報（ハッシュ）の結合レコード。 */
export interface StaffAuthRecord {
  readonly staffId: StaffId;
  readonly staffCode: string;
  readonly name: string;
  readonly role: Role;
  readonly loginId: string;
  /** 保存済みパスワードハッシュ（平文ではない）。 */
  readonly passwordHash: string;
}

export interface RegisterStaffParams {
  staffId: StaffId;
  staffCode: string;
  name: string;
  role: Role;
  loginId: string;
  passwordHash: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

/**
 * 職員の認証情報リポジトリ（インターフェース）。
 * staff（プロフィール）と staff_credentials（loginId/ハッシュ）を別テーブルで扱う。
 */
export interface StaffAuthRepository {
  /** ログインID（＝メール）で照合用レコードを取得。 */
  findByLoginId(loginId: string): Promise<StaffAuthRecord | undefined>;

  /** 職員プロフィール＋資格情報を新規登録（1トランザクション）。 */
  register(params: RegisterStaffParams): Promise<void>;
}
