import { Database } from '../db/client';
import * as driver from '../driver/coachingRecordDriver';
import { CoachingRecordFullRow, CoachingRecordWriteBundle } from '../driver/coachingRecordDriver';
import { MemberId } from '../domain/member/member';
import { TextbookId } from '../domain/textbook/textbook';
import { DateOnly } from '../domain/shared/value-objects';
import {
  CoachingRecord,
  CoachingRecordId,
  TestStatus,
  NextTextbookStatus,
} from '../domain/coaching-record/coaching-record';
import { CoachingRecordRepository } from '../domain/coaching-record/coaching-record-repository';

// ───────────────────── Row → ドメイン ─────────────────────

function freeTextOf(src: { monthlyReview: string; coachAdvice: string; otherNotes: string } | undefined) {
  return {
    monthlyReview: src?.monthlyReview ?? '',
    coachAdvice: src?.coachAdvice ?? '',
    otherNotes: src?.otherNotes ?? '',
  };
}

function toDomain(f: CoachingRecordFullRow): CoachingRecord {
  const base = {
    id: f.record.id as CoachingRecordId,
    memberId: f.record.memberId as MemberId,
    date: f.record.heldOn as DateOnly,
    coachName: f.record.coachName,
  };
  const tests = f.sessionTests.map((t) => ({
    textbookId: t.textbookId as TextbookId,
    testStatus: t.testStatus as TestStatus,
    range: t.testRange ?? '',
    format: t.format ?? '',
    score: t.score ?? '',
    note: t.note ?? '',
    nextStatus: t.nextStatus as NextTextbookStatus,
  }));

  switch (f.record.type) {
    case '教材選定':
      return {
        ...base,
        type: '教材選定',
        selectedTextbooks: f.selectionItems.map((i) => ({
          textbookId: i.textbookId as TextbookId,
          dailyGoalMinutes: i.dailyGoalMinutes ?? null,
          note: i.note,
        })),
        sharedNote: f.selection?.sharedNote ?? '',
      };
    case 'オリエンテーション':
      return { ...base, type: 'オリエンテーション', ...freeTextOf(f.orientation) };
    case '初回コーチング':
      return {
        ...base,
        type: '初回コーチング',
        coachingNumber: f.session?.coachingNumber ?? 1,
        ...freeTextOf(f.session),
        textbookTests: tests,
      };
    case '通常コーチング':
      return {
        ...base,
        type: '通常コーチング',
        coachingNumber: f.session?.coachingNumber ?? 2,
        ...freeTextOf(f.session),
        textbookTests: tests,
      };
    case 'その他':
      return { ...base, type: 'その他', ...freeTextOf(f.other) };
    default:
      throw new Error(`未知のコーチング種別: ${f.record.type}`);
  }
}

// ───────────────────── ドメイン → Row（保存用 bundle） ─────────────────────

function toWriteBundle(r: CoachingRecord): CoachingRecordWriteBundle {
  const record = {
    id: r.id as string,
    memberId: r.memberId as string,
    type: r.type,
    heldOn: r.date as string,
    coachName: r.coachName,
  };
  const empty: CoachingRecordWriteBundle = { record, selectionItems: [], sessionTests: [] };

  switch (r.type) {
    case '教材選定':
      return {
        ...empty,
        selection: { coachingRecordId: record.id, sharedNote: r.sharedNote },
        selectionItems: r.selectedTextbooks.map((s) => ({
          coachingRecordId: record.id,
          textbookId: s.textbookId as string,
          dailyGoalMinutes: s.dailyGoalMinutes,
          note: s.note,
        })),
      };
    case 'オリエンテーション':
      return {
        ...empty,
        orientation: {
          coachingRecordId: record.id,
          monthlyReview: r.monthlyReview,
          coachAdvice: r.coachAdvice,
          otherNotes: r.otherNotes,
        },
      };
    case '初回コーチング':
    case '通常コーチング':
      return {
        ...empty,
        session: {
          coachingRecordId: record.id,
          coachingNumber: r.coachingNumber,
          monthlyReview: r.monthlyReview,
          coachAdvice: r.coachAdvice,
          otherNotes: r.otherNotes,
        },
        sessionTests: r.textbookTests.map((t) => ({
          coachingRecordId: record.id,
          coachingNumber: r.coachingNumber,
          textbookId: t.textbookId as string,
          testStatus: t.testStatus,
          testRange: t.range,
          format: t.format,
          score: t.score,
          note: t.note,
          nextStatus: t.nextStatus,
        })),
      };
    case 'その他':
      return {
        ...empty,
        other: {
          coachingRecordId: record.id,
          monthlyReview: r.monthlyReview,
          coachAdvice: r.coachAdvice,
          otherNotes: r.otherNotes,
        },
      };
  }
}

/** CoachingRecordRepository の実装（gateway層）。CTI の行束⇔判別共用体を変換する。 */
export class CoachingRecordRepositoryImpl implements CoachingRecordRepository {
  constructor(private readonly db: Database) {}

  async findById(id: CoachingRecordId): Promise<CoachingRecord | undefined> {
    const full = await driver.findById(this.db, id as string);
    return full ? toDomain(full) : undefined;
  }

  async findByMember(memberId: MemberId): Promise<CoachingRecord[]> {
    const fulls = await driver.findByMember(this.db, memberId as string);
    return fulls.map(toDomain);
  }

  async save(record: CoachingRecord): Promise<void> {
    await driver.save(this.db, toWriteBundle(record));
  }

  async delete(id: CoachingRecordId): Promise<void> {
    await driver.deleteById(this.db, id as string);
  }
}
