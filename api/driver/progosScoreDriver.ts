import { eq, desc } from 'drizzle-orm';
import { Database } from '../db/client';
import { progosScores } from '../db/schema';

/** ProgosScore の DB アクセス（driver層）。ドメイン変換は gateway。 */
export type ProgosScoreRow = typeof progosScores.$inferSelect;
export type NewProgosScoreRow = typeof progosScores.$inferInsert;

export async function findByMember(db: Database, memberId: string): Promise<ProgosScoreRow[]> {
  return db
    .select()
    .from(progosScores)
    .where(eq(progosScores.memberId, memberId))
    .orderBy(desc(progosScores.examDate));
}

export async function findById(db: Database, id: string): Promise<ProgosScoreRow | undefined> {
  const rows = await db.select().from(progosScores).where(eq(progosScores.id, id)).limit(1);
  return rows[0];
}

export async function findAll(db: Database): Promise<ProgosScoreRow[]> {
  return db.select().from(progosScores);
}

export async function upsert(db: Database, row: NewProgosScoreRow): Promise<void> {
  await db.insert(progosScores).values(row).onConflictDoUpdate({ target: progosScores.id, set: row });
}

export async function deleteById(db: Database, id: string): Promise<void> {
  await db.delete(progosScores).where(eq(progosScores.id, id));
}
