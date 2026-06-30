import { DateOnly } from '../shared/value-objects';
import { MemberId } from '../member/member';
import { LearningLog, LearningLogId } from './learning-log';

/**
 * LearningLog 集約のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 */
export interface LearningLogRepository {
  /** IDで1件取得（編集・削除の対象特定）。 */
  findById(id: LearningLogId): Promise<LearningLog | undefined>;

  /** 会員の全学習記録（カレンダー・ストリーク・達成率の算出元）。 */
  findByMember(memberId: MemberId): Promise<LearningLog[]>;

  /** 会員の特定日の記録（記録確認モーダル。教材ごとに複数あり得る）。 */
  findByMemberAndDate(memberId: MemberId, date: DateOnly): Promise<LearningLog[]>;

  /** 全会員の学習記録（ランキング・ダッシュボードの全会員集計）。 */
  findAll(): Promise<LearningLog[]>;

  /** 登録・更新。 */
  save(log: LearningLog): Promise<void>;

  /** 削除。 */
  delete(id: LearningLogId): Promise<void>;
}
