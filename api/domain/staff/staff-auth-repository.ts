import { RoleName, StaffId, Staff } from './staff';

/** ログイン照合に必要な、職員プロフィール＋資格情報（ハッシュ）の結合レコード。 */
export interface StaffAuthRecord {
  readonly staffId: string;
  readonly staffCode: string;
  readonly name: string;
  readonly role: RoleName;
  readonly loginId: string;
  /** 保存済みパスワードハッシュ（平文ではない）。 */
  readonly passwordHash: string;
}

export interface RegisterStaffParams {
  staffId: string;
  staffCode: string;
  name: string;
  role: RoleName;
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

  /** 職員IDで照合用レコードを取得（操作職員の権限判定用）。 */
  findById(staffId: StaffId): Promise<StaffAuthRecord | undefined>;

  /** 職員プロフィール＋資格情報を新規登録（1トランザクション）。 */
  register(params: RegisterStaffParams): Promise<void>;

  // ── 管理（CRUD） ──
  /** 全職員のプロフィール一覧。 */
  listAll(): Promise<Staff[]>;

  /** 社員ID・氏名・メールの部分一致で検索（keyword 空なら全件）。 */
  search(keyword: string): Promise<Staff[]>;

  /** プロフィールを1件取得。 */
  findProfileById(staffId: StaffId): Promise<Staff | undefined>;

  /** メール（loginId）でプロフィール取得（重複チェック用）。 */
  findByEmail(email: string): Promise<Staff | undefined>;

  /** 社員IDでプロフィール取得（重複チェック用）。 */
  findByStaffCode(staffCode: string): Promise<Staff | undefined>;

  /** プロフィール（staff テーブル）を更新。 */
  updateProfile(staff: Staff): Promise<void>;

  /** パスワードハッシュを更新（staff_credentials）。 */
  setPasswordHash(staffId: StaffId, passwordHash: string): Promise<void>;

  /** 職員を削除（資格情報は CASCADE）。 */
  deleteById(staffId: StaffId): Promise<void>;
}
