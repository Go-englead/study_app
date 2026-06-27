import { Database } from '../db/client';
import * as driver from '../driver/progosScoreDriver';
import { ProgosScoreRow } from '../driver/progosScoreDriver';
import { MemberId } from '../domain/member/member';
import { DateOnly, CefrLevel } from '../domain/shared/value-objects';
import { ProgosScore, ProgosScoreId } from '../domain/progos-score/progos-score';
import { ProgosScoreRepository } from '../domain/progos-score/progos-score-repository';

function toDomain(r: ProgosScoreRow): ProgosScore {
  return {
    id: r.id as ProgosScoreId,
    memberId: r.memberId as MemberId,
    examDate: r.examDate as DateOnly,
    overall: r.overall as CefrLevel,
    skills: {
      range: r.rangeLevel as CefrLevel,
      accuracy: r.accuracy as CefrLevel,
      fluency: r.fluency as CefrLevel,
      interaction: r.interaction as CefrLevel,
      coherence: r.coherence as CefrLevel,
      phonology: r.phonology as CefrLevel,
    },
    comment: r.comment ?? undefined,
  };
}

function toRow(s: ProgosScore): driver.NewProgosScoreRow {
  return {
    id: s.id as string,
    memberId: s.memberId as string,
    examDate: s.examDate as string,
    overall: s.overall as string,
    rangeLevel: s.skills.range as string,
    accuracy: s.skills.accuracy as string,
    fluency: s.skills.fluency as string,
    interaction: s.skills.interaction as string,
    coherence: s.skills.coherence as string,
    phonology: s.skills.phonology as string,
    comment: s.comment ?? null,
  };
}

/** ProgosScoreRepository の実装（gateway層）。 */
export class ProgosScoreRepositoryImpl implements ProgosScoreRepository {
  constructor(private readonly db: Database) {}

  async findById(id: ProgosScoreId): Promise<ProgosScore | undefined> {
    const row = await driver.findById(this.db, id as string);
    return row ? toDomain(row) : undefined;
  }

  async findByMember(memberId: MemberId): Promise<ProgosScore[]> {
    const rows = await driver.findByMember(this.db, memberId as string);
    return rows.map(toDomain);
  }

  async findAll(): Promise<ProgosScore[]> {
    const rows = await driver.findAll(this.db);
    return rows.map(toDomain);
  }

  async save(score: ProgosScore): Promise<void> {
    await driver.upsert(this.db, toRow(score));
  }

  async delete(id: ProgosScoreId): Promise<void> {
    await driver.deleteById(this.db, id as string);
  }
}
