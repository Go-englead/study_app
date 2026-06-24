import { MemberId } from '../member/member';
import { CoachingRecord, CoachingRecordId } from './coaching-record';

/**
 * CoachingRecord 集約のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 */
export interface CoachingRecordRepository {
  /** IDで1件取得（詳細閲覧・編集・削除の対象特定）。 */
  findById(id: CoachingRecordId): Promise<CoachingRecord | undefined>;

  /** 会員のコーチング記録一覧（カルテ履歴・リマインダー判定・教材卒業判定）。 */
  findByMember(memberId: MemberId): Promise<CoachingRecord[]>;

  /** 登録・更新。 */
  save(record: CoachingRecord): Promise<void>;

  /** 削除。 */
  delete(id: CoachingRecordId): Promise<void>;
}
