import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { Database } from '../db/client';
import { learningLogs } from '../db/schema';

/** LearningLog（学習記録）の DB アクセス（driver層）。ドメイン変換は gateway。 */
export type LearningLogRow = typeof learningLogs.$inferSelect;
export type NewLearningLogRow = typeof learningLogs.$inferInsert;

export async function findByMember(db: Database, memberId: string): Promise<LearningLogRow[]> {
  return db
    .select()
    .from(learningLogs)
    .where(eq(learningLogs.memberId, memberId))
    .orderBy(desc(learningLogs.studiedOn));
}

export async function findByMemberInRange(
  db: Database,
  memberId: string,
  from?: string,
  to?: string,
): Promise<LearningLogRow[]> {
  const conds = [eq(learningLogs.memberId, memberId)]
  if (from) conds.push(gte(learningLogs.studiedOn, from))
  if (to) conds.push(lte(learningLogs.studiedOn, to))
  return db.select().from(learningLogs).where(and(...conds)).orderBy(desc(learningLogs.studiedOn));
}

export async function findById(db: Database, id: string): Promise<LearningLogRow | undefined> {
  const rows = await db.select().from(learningLogs).where(eq(learningLogs.id, id)).limit(1);
  return rows[0];
}

export async function findByMemberAndDate(
  db: Database,
  memberId: string,
  date: string,
): Promise<LearningLogRow[]> {
  return db
    .select()
    .from(learningLogs)
    .where(and(eq(learningLogs.memberId, memberId), eq(learningLogs.studiedOn, date)));
}

export async function findAll(db: Database): Promise<LearningLogRow[]> {
  return db.select().from(learningLogs);
}

export async function upsert(db: Database, row: NewLearningLogRow): Promise<void> {
  await db.insert(learningLogs).values(row).onConflictDoUpdate({ target: learningLogs.id, set: row });
}

export async function deleteById(db: Database, id: string): Promise<void> {
  await db.delete(learningLogs).where(eq(learningLogs.id, id));
}
