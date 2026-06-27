import { Database } from '../db/client';
import * as driver from '../driver/learningLogDriver';
import { LearningLogRow } from '../driver/learningLogDriver';
import { MemberId } from '../domain/member/member';
import { TextbookId } from '../domain/textbook/textbook';
import { DateOnly } from '../domain/shared/value-objects';
import { LearningLog, LearningLogId } from '../domain/learning-log/learning-log';
import { LearningLogRepository } from '../domain/learning-log/learning-log-repository';

function toDomain(r: LearningLogRow): LearningLog {
  return {
    id: r.id as LearningLogId,
    memberId: r.memberId as MemberId,
    textbookId: r.textbookId as TextbookId,
    date: r.studiedOn as DateOnly,
    durationMinutes: r.durationMinutes,
    comment: r.comment,
  };
}

function toRow(l: LearningLog): driver.NewLearningLogRow {
  return {
    id: l.id as string,
    memberId: l.memberId as string,
    textbookId: l.textbookId as string,
    studiedOn: l.date as string,
    durationMinutes: l.durationMinutes,
    comment: l.comment,
  };
}

/** LearningLogRepository の実装（gateway層）。 */
export class LearningLogRepositoryImpl implements LearningLogRepository {
  constructor(private readonly db: Database) {}

  async findById(id: LearningLogId): Promise<LearningLog | undefined> {
    const row = await driver.findById(this.db, id as string);
    return row ? toDomain(row) : undefined;
  }

  async findByMember(memberId: MemberId): Promise<LearningLog[]> {
    const rows = await driver.findByMember(this.db, memberId as string);
    return rows.map(toDomain);
  }

  async findByMemberAndDate(memberId: MemberId, date: DateOnly): Promise<LearningLog[]> {
    const rows = await driver.findByMemberAndDate(this.db, memberId as string, date as string);
    return rows.map(toDomain);
  }

  async findAll(): Promise<LearningLog[]> {
    const rows = await driver.findAll(this.db);
    return rows.map(toDomain);
  }

  async save(log: LearningLog): Promise<void> {
    await driver.upsert(this.db, toRow(log));
  }

  async delete(id: LearningLogId): Promise<void> {
    await driver.deleteById(this.db, id as string);
  }
}
