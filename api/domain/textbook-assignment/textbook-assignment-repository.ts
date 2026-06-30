import { MemberId } from '../member/member';
import { TextbookId } from '../textbook/textbook';
import { TextbookAssignment } from './textbook-assignment';

/**
 * TextbookAssignment 集約のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 */
export interface TextbookAssignmentRepository {
  /** 会員の割り当て教材一覧（教材進捗・割り当て確認）。 */
  findByMember(memberId: MemberId): Promise<TextbookAssignment[]>;

  /** 会員＋教材で1件取得（重複チェック・更新/卒業の対象特定）。 */
  find(memberId: MemberId, textbookId: TextbookId): Promise<TextbookAssignment | undefined>;

  /** ある教材を導入している割り当て一覧（使用会員数・導入会員一覧）。 */
  findByTextbook(textbookId: TextbookId): Promise<TextbookAssignment[]>;

  /** 割り当ての登録・更新。 */
  save(assignment: TextbookAssignment): Promise<void>;

  /** 割り当ての解除。 */
  delete(memberId: MemberId, textbookId: TextbookId): Promise<void>;
}
