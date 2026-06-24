import { eq, and, ilike } from 'drizzle-orm';
import { Database } from '../db/client';
import { TextbookSearchCriteria } from '../domain/textbook/textbook-repository';
import { textbooks, TextbookRow, NewTextbookRow } from '../db/schema';

/**
 * Textbook（教材マスタ）の DB アクセス（driver層）。
 * Row の取得/upsert/削除のみを担い、ドメインへの変換は gateway 層が行う。
 */

export async function findById(db: Database, id: string): Promise<TextbookRow | undefined> {
  const rows = await db.select().from(textbooks).where(eq(textbooks.id, id)).limit(1);
  return rows[0];
}

export async function findAll(db: Database): Promise<TextbookRow[]> {
  return db.select().from(textbooks);
}

export async function search(db: Database, c: TextbookSearchCriteria): Promise<TextbookRow[]> {
  const conds = [];
  if (c.nameLike) conds.push(ilike(textbooks.name, `%${c.nameLike}%`));
  if (c.categoryLike) conds.push(ilike(textbooks.category, `%${c.categoryLike}%`));
  return conds.length ? db.select().from(textbooks).where(and(...conds)) : db.select().from(textbooks);
}

/** 1件を upsert（id 衝突時は更新）。 */
export async function upsert(db: Database, row: NewTextbookRow): Promise<void> {
  await db.insert(textbooks).values(row).onConflictDoUpdate({ target: textbooks.id, set: row });
}

export async function deleteById(db: Database, id: string): Promise<void> {
  await db.delete(textbooks).where(eq(textbooks.id, id));
}
