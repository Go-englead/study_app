import { Textbook, TextbookId } from './textbook';

/**
 * Textbook 集約（教材マスタ）のリポジトリ（インターフェース）。
 * 取得の戻り値は「単数 = T | undefined」「複数 = T[]」。永続化は非同期。
 */
export interface TextbookRepository {
  /** 教材IDで1件取得（各所からの教材参照）。 */
  findById(id: TextbookId): Promise<Textbook | undefined>;

  /** 全教材（教材マスター一覧・教材選定の選択肢）。 */
  findAll(): Promise<Textbook[]>;

  /** 登録・更新（マスタCRUD）。 */
  save(textbook: Textbook): Promise<void>;

  /** 削除（マスタCRUD）。 */
  delete(id: TextbookId): Promise<void>;
}
