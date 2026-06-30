import { Database } from '../db/client';
import * as driver from '../driver/progosScoreDriver';
import { ProgosScoreRow } from '../driver/progosScoreDriver';
import { MemberId } from '../domain/member/member';
import { ProgosScore, ProgosScoreId } from '../domain/progos-score/progos-score';
import { ProgosScoreRepository } from '../domain/progos-score/progos-score-repository';

function toDomain(r: ProgosScoreRow): ProgosScore {
  return ProgosScore.fromRecord({
    id: r.id,
    memberId: r.memberId,
    examDate: r.examDate,
    overall: r.overall,
    skills: {
      range: r.rangeLevel,
      accuracy: r.accuracy,
      fluency: r.fluency,
      interaction: r.interaction,
      coherence: r.coherence,
      phonology: r.phonology,
    },
    comment: r.comment ?? undefined,
  });
}

function toRow(s: ProgosScore): driver.NewProgosScoreRow {
  return {
    id: s.id.value,
    memberId: s.memberId.value,
    examDate: s.examDate.value,
    overall: s.overall.value,
    rangeLevel: s.skills.range.value,
    accuracy: s.skills.accuracy.value,
    fluency: s.skills.fluency.value,
    interaction: s.skills.interaction.value,
    coherence: s.skills.coherence.value,
    phonology: s.skills.phonology.value,
    comment: s.comment ?? null,
  };
}

/** ProgosScoreRepository の実装（gateway層）。 */
export class ProgosScoreRepositoryImpl implements ProgosScoreRepository {
  constructor(private readonly db: Database) {}

  async findById(id: ProgosScoreId): Promise<ProgosScore | undefined> {
    const row = await driver.findById(this.db, id.value);
    return row ? toDomain(row) : undefined;
  }

  async findByMember(memberId: MemberId): Promise<ProgosScore[]> {
    const rows = await driver.findByMember(this.db, memberId.value);
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
    await driver.deleteById(this.db, id.value);
  }
}
