import { and, eq } from 'drizzle-orm';
import { Database } from '../db/client';
import { textbookAssignments } from '../db/schema';

/**
 * TextbookAssignment（会員⨯教材の割り当て）の DB アクセス（driver層）。
 * 教材マスタ情報の結合は usecase が別集約（Textbook）から取得して行うため、
 * ここでは割り当て行のみを扱う。
 */
export type TextbookAssignmentRow = typeof textbookAssignments.$inferSelect;
export type NewTextbookAssignmentRow = typeof textbookAssignments.$inferInsert;

export async function findByMember(db: Database, memberId: string): Promise<TextbookAssignmentRow[]> {
  return db.select().from(textbookAssignments).where(eq(textbookAssignments.memberId, memberId));
}

export async function find(
  db: Database,
  memberId: string,
  textbookId: string,
): Promise<TextbookAssignmentRow | undefined> {
  const rows = await db
    .select()
    .from(textbookAssignments)
    .where(and(eq(textbookAssignments.memberId, memberId), eq(textbookAssignments.textbookId, textbookId)))
    .limit(1);
  return rows[0];
}

export async function findByTextbook(db: Database, textbookId: string): Promise<TextbookAssignmentRow[]> {
  return db.select().from(textbookAssignments).where(eq(textbookAssignments.textbookId, textbookId));
}

/** 1件を upsert（member_id, textbook_id の複合PK衝突時は更新）。 */
export async function upsert(db: Database, row: NewTextbookAssignmentRow): Promise<void> {
  await db
    .insert(textbookAssignments)
    .values(row)
    .onConflictDoUpdate({
      target: [textbookAssignments.memberId, textbookAssignments.textbookId],
      set: row,
    });
}

export async function deleteOne(db: Database, memberId: string, textbookId: string): Promise<void> {
  await db
    .delete(textbookAssignments)
    .where(and(eq(textbookAssignments.memberId, memberId), eq(textbookAssignments.textbookId, textbookId)));
}
