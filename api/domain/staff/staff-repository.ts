import { Email } from '../shared/value-objects';
import { Staff, StaffId } from './staff';

/**
 * Staff 集約のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 */
export interface StaffRepository {
  /** 社員IDで1件取得。 */
  findById(id: StaffId): Promise<Staff | undefined>;

  /** メールアドレスで1件取得（職員ログインの照合）。 */
  findByEmail(email: Email): Promise<Staff | undefined>;

  /** 全スタッフ（スタッフ一覧・担当者の選択肢）。 */
  findAll(): Promise<Staff[]>;

  /** 氏名または社員IDのキーワードで検索（スタッフ検索）。 */
  searchByKeyword(keyword: string): Promise<Staff[]>;

  /** 登録・更新。 */
  save(staff: Staff): Promise<void>;

  /** 削除。 */
  delete(id: StaffId): Promise<void>;
}
