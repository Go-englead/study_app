import { Database } from '../db/client';
import * as driver from '../driver/textbookAssignmentDriver';
import { TextbookAssignmentRow } from '../driver/textbookAssignmentDriver';
import { MemberId } from '../domain/member/member';
import { TextbookId } from '../domain/textbook/textbook';
import { DateOnly } from '../domain/shared/value-objects';
import { TextbookAssignment } from '../domain/textbook-assignment/textbook-assignment';
import { TextbookAssignmentRepository } from '../domain/textbook-assignment/textbook-assignment-repository';

function toDomain(r: TextbookAssignmentRow): TextbookAssignment {
  return {
    memberId: r.memberId as MemberId,
    textbookId: r.textbookId as TextbookId,
    dailyGoalMinutes: r.dailyGoalMinutes ?? null,
    note: r.note,
    graduatedOn: (r.graduatedOn ?? null) as DateOnly | null,
  };
}

function toRow(a: TextbookAssignment): driver.NewTextbookAssignmentRow {
  return {
    memberId: a.memberId,
    textbookId: a.textbookId,
    dailyGoalMinutes: a.dailyGoalMinutes,
    note: a.note,
    graduatedOn: a.graduatedOn,
  };
}

/** TextbookAssignmentRepository の実装（gateway層）。 */
export class TextbookAssignmentRepositoryImpl implements TextbookAssignmentRepository {
  constructor(private readonly db: Database) {}

  async findByMember(memberId: MemberId): Promise<TextbookAssignment[]> {
    const rows = await driver.findByMember(this.db, memberId);
    return rows.map(toDomain);
  }

  async find(memberId: MemberId, textbookId: TextbookId): Promise<TextbookAssignment | undefined> {
    const row = await driver.find(this.db, memberId, textbookId);
    return row ? toDomain(row) : undefined;
  }

  async findByTextbook(textbookId: TextbookId): Promise<TextbookAssignment[]> {
    const rows = await driver.findByTextbook(this.db, textbookId);
    return rows.map(toDomain);
  }

  async save(assignment: TextbookAssignment): Promise<void> {
    await driver.upsert(this.db, toRow(assignment));
  }

  async delete(memberId: MemberId, textbookId: TextbookId): Promise<void> {
    await driver.deleteOne(this.db, memberId, textbookId);
  }
}
