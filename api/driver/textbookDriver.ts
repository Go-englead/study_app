import { eq } from 'drizzle-orm';
import { Database } from '../db/client';
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

/** 1件を upsert（id 衝突時は更新）。 */
export async function upsert(db: Database, row: NewTextbookRow): Promise<void> {
  await db.insert(textbooks).values(row).onConflictDoUpdate({ target: textbooks.id, set: row });
}

export async function deleteById(db: Database, id: string): Promise<void> {
  await db.delete(textbooks).where(eq(textbooks.id, id));
}
