import { eq, inArray, asc } from 'drizzle-orm';
import { Database } from '../db/client';
import {
  coachingRecords,
  crTextbookSelections,
  crSelectionItems,
  crOrientations,
  crCoachingSessions,
  crSessionTests,
  crOthers,
  CoachingRecordRow,
  NewCoachingRecordRow,
  CrTextbookSelectionRow,
  NewCrTextbookSelectionRow,
  CrSelectionItemRow,
  NewCrSelectionItemRow,
  CrOrientationRow,
  NewCrOrientationRow,
  CrCoachingSessionRow,
  NewCrCoachingSessionRow,
  CrSessionTestRow,
  NewCrSessionTestRow,
  CrOtherRow,
  NewCrOtherRow,
} from '../db/schema';

/**
 * CoachingRecord（CTI：親＋種別別子テーブル）の DB アクセス（driver層）。
 * 取得は親行＋該当する子テーブル行を束ねた構造を返し、ドメインへの変換は gateway が行う。
 * 保存は「対象の子テーブルを全削除→新 type の子だけ挿入」で type 変更にも対応する。
 */

/** 1件分の親＋子の生行（取得用）。 */
export interface CoachingRecordFullRow {
  record: CoachingRecordRow;
  selection?: CrTextbookSelectionRow;
  selectionItems: CrSelectionItemRow[];
  orientation?: CrOrientationRow;
  session?: CrCoachingSessionRow;
  sessionTests: CrSessionTestRow[];
  other?: CrOtherRow;
}

/** 1件分の親＋子の挿入行（保存用。gateway が record から組み立てて渡す）。 */
export interface CoachingRecordWriteBundle {
  record: NewCoachingRecordRow;
  selection?: NewCrTextbookSelectionRow;
  selectionItems: NewCrSelectionItemRow[];
  orientation?: NewCrOrientationRow;
  session?: NewCrCoachingSessionRow;
  sessionTests: NewCrSessionTestRow[];
  other?: NewCrOtherRow;
}

/** 親行リストに子テーブルを束ねて CoachingRecordFullRow[] にする。 */
async function attachChildren(db: Database, records: CoachingRecordRow[]): Promise<CoachingRecordFullRow[]> {
  if (records.length === 0) return [];
  const ids = records.map((r) => r.id);

  const [selections, items, orientations, sessions, tests, others] = await Promise.all([
    db.select().from(crTextbookSelections).where(inArray(crTextbookSelections.coachingRecordId, ids)),
    db.select().from(crSelectionItems).where(inArray(crSelectionItems.coachingRecordId, ids)),
    db.select().from(crOrientations).where(inArray(crOrientations.coachingRecordId, ids)),
    db.select().from(crCoachingSessions).where(inArray(crCoachingSessions.coachingRecordId, ids)),
    db.select().from(crSessionTests).where(inArray(crSessionTests.coachingRecordId, ids)),
    db.select().from(crOthers).where(inArray(crOthers.coachingRecordId, ids)),
  ]);

  const selectionBy = new Map(selections.map((s) => [s.coachingRecordId, s]));
  const orientationBy = new Map(orientations.map((o) => [o.coachingRecordId, o]));
  const sessionBy = new Map(sessions.map((s) => [s.coachingRecordId, s]));
  const otherBy = new Map(others.map((o) => [o.coachingRecordId, o]));
  const itemsBy = groupBy(items, (i) => i.coachingRecordId);
  const testsBy = groupBy(tests, (t) => t.coachingRecordId);

  return records.map((r) => ({
    record: r,
    selection: selectionBy.get(r.id),
    selectionItems: itemsBy.get(r.id) ?? [],
    orientation: orientationBy.get(r.id),
    session: sessionBy.get(r.id),
    sessionTests: testsBy.get(r.id) ?? [],
    other: otherBy.get(r.id),
  }));
}

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k) ?? [];
    list.push(r);
    m.set(k, list);
  }
  return m;
}

export async function findByMember(db: Database, memberId: string): Promise<CoachingRecordFullRow[]> {
  const records = await db
    .select()
    .from(coachingRecords)
    .where(eq(coachingRecords.memberId, memberId))
    .orderBy(asc(coachingRecords.heldOn));
  return attachChildren(db, records);
}

export async function findById(db: Database, id: string): Promise<CoachingRecordFullRow | undefined> {
  const records = await db.select().from(coachingRecords).where(eq(coachingRecords.id, id)).limit(1);
  if (!records[0]) return undefined;
  return (await attachChildren(db, records))[0];
}

/** 1件を保存（親 upsert → 子を全削除 → 新 type の子だけ挿入）。1トランザクション。 */
export async function save(db: Database, b: CoachingRecordWriteBundle): Promise<void> {
  const id = b.record.id!;
  await db.transaction(async (tx) => {
    await tx
      .insert(coachingRecords)
      .values(b.record)
      .onConflictDoUpdate({ target: coachingRecords.id, set: b.record });

    // 既存の子をすべて削除（type 変更にも追従。明細は 1:1 子の CASCADE で同時に消える）。
    await tx.delete(crTextbookSelections).where(eq(crTextbookSelections.coachingRecordId, id));
    await tx.delete(crOrientations).where(eq(crOrientations.coachingRecordId, id));
    await tx.delete(crCoachingSessions).where(eq(crCoachingSessions.coachingRecordId, id));
    await tx.delete(crOthers).where(eq(crOthers.coachingRecordId, id));

    // 新しい type の子だけ挿入。
    if (b.selection) {
      await tx.insert(crTextbookSelections).values(b.selection);
      if (b.selectionItems.length > 0) await tx.insert(crSelectionItems).values(b.selectionItems);
    }
    if (b.orientation) await tx.insert(crOrientations).values(b.orientation);
    if (b.session) {
      await tx.insert(crCoachingSessions).values(b.session);
      if (b.sessionTests.length > 0) await tx.insert(crSessionTests).values(b.sessionTests);
    }
    if (b.other) await tx.insert(crOthers).values(b.other);
  });
}

export async function deleteById(db: Database, id: string): Promise<void> {
  // 子テーブルは ON DELETE CASCADE で同時に削除される。
  await db.delete(coachingRecords).where(eq(coachingRecords.id, id));
}
