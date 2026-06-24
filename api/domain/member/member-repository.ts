import { Email } from '../shared/value-objects';
import { Member, MemberId } from './member';

/**
 * 会員検索条件（解決済み）。UIのトークン（within3m や __unset__ 等）は
 * アプリ層（UseCase）で具体値に変換してからこの形にする。全条件 AND 結合。
 * ステータス絞り込み・達成率/ログイン系は集計未実装のため含まない。
 */
export interface MemberSearchCriteria {
  /** 氏名・ニックネーム部分一致 */
  nameLike?: string;
  /** 会員番号部分一致 */
  codeLike?: string;
  /** 受講開始月（'YYYY-MM' 前方一致） */
  startMonth?: string;
  occupation?: string;
  occupationUnset?: boolean;
  residence?: string;
  residenceUnset?: boolean;
  /** オリエン担当スタッフID */
  orientStaffId?: string;
  travelCountry?: string;
  travelCountryUnset?: boolean;
  travelReason?: string;
  travelReasonUnset?: boolean;
  /** 渡航時期の範囲（'YYYY-MM-DD' 文字列比較・両端 inclusive） */
  travelDateFrom?: string;
  travelDateTo?: string;
  /** 渡航時期がこの日より後（'YYYY-MM-DD'・exclusive） */
  travelDateAfter?: string;
  travelDateUnset?: boolean;
  /** 使用教材ID（OR：いずれかを使っている会員） */
  textbookIds?: string[];
}

/**
 * Member 集約のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 * 実装クラスは後で用意する。
 */
export interface MemberRepository {
  /** 会員IDで1件取得（詳細・編集・カルテ等）。 */
  findById(id: MemberId): Promise<Member | undefined>;

  /** メールアドレスで1件取得（会員ログインの照合）。 */
  findByEmail(email: Email): Promise<Member | undefined>;

  /** 全会員（会員一覧・管理ダッシュボードの全会員集計）。 */
  findAll(): Promise<Member[]>;

  /** 条件で検索（会員検索。条件なし＝全件）。 */
  search(criteria: MemberSearchCriteria): Promise<Member[]>;

  /** 登録・編集（新規/更新の永続化）。 */
  save(member: Member): Promise<void>;

  /** 会員CSVの一括登録。 */
  saveAll(members: readonly Member[]): Promise<void>;

  /** 会員の削除。 */
  delete(id: MemberId): Promise<void>;
}
