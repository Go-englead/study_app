import { MemberId } from '../member/member';
import { ContinuationPlan, ContinuationPlanId } from './continuation-plan';

/**
 * ContinuationPlan 集約のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 */
export interface ContinuationPlanRepository {
  /** 会員の継続プラン一覧（詳細表示・ステータス判定の入力）。 */
  findByMember(memberId: MemberId): Promise<ContinuationPlan[]>;

  /** IDで1件取得（更新・削除の対象特定）。 */
  findById(id: ContinuationPlanId): Promise<ContinuationPlan | undefined>;

  /** 登録・更新。 */
  save(plan: ContinuationPlan): Promise<void>;

  /** 削除。 */
  delete(id: ContinuationPlanId): Promise<void>;
}
