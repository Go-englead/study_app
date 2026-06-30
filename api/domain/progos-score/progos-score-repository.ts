import { MemberId } from '../member/member';
import { ProgosScore, ProgosScoreId } from './progos-score';

/**
 * ProgosScore 集約のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 */
export interface ProgosScoreRepository {
  /** IDで1件取得（削除の対象特定）。 */
  findById(id: ProgosScoreId): Promise<ProgosScore | undefined>;

  /** 会員のPROGOSスコア履歴（カルテ・会員側の推移グラフ）。 */
  findByMember(memberId: MemberId): Promise<ProgosScore[]>;

  /** 全会員のスコア（PROGOS分析：レベル分布・レベル変動・一覧）。 */
  findAll(): Promise<ProgosScore[]>;

  /** 登録。 */
  save(score: ProgosScore): Promise<void>;

  /** 削除。 */
  delete(id: ProgosScoreId): Promise<void>;
}
