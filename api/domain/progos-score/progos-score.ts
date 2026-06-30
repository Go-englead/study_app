import { DomainError } from '../shared/domain-error';
import { DateOnly, CefrLevel } from '../shared/value-objects';
import { MemberId } from '../member/member';
import { CoachStaff } from '../staff/staff';

export class ProgosScoreId {
  private constructor(readonly value: string) {}
  static create(raw: string): ProgosScoreId {
    const v = (raw ?? '').trim();
    if (!v) throw new DomainError('PROGOSスコアIDは必須です');
    return new ProgosScoreId(v);
  }
}

/** 6技能スコア（各 CEFR） */
export interface ProgosSkillSet {
  readonly range: CefrLevel;
  readonly accuracy: CefrLevel;
  readonly fluency: CefrLevel;
  readonly interaction: CefrLevel;
  readonly coherence: CefrLevel;
  readonly phonology: CefrLevel;
}

export interface CreateProgosScoreInput {
  id: string;
  memberId: string;
  examDate: string;
  overall: string;
  skills: {
    range: string;
    accuracy: string;
    fluency: string;
    interaction: string;
    coherence: string;
    phonology: string;
  };
  comment?: string;
}

export interface UpdateProgosScoreInput {
  examDate?: string;
  overall?: string;
  skills?: CreateProgosScoreInput['skills'];
  comment?: string;
}

export type ProgosTrend = 'up' | 'flat' | 'down';

const SKILL_KEYS = ['range', 'accuracy', 'fluency', 'interaction', 'coherence', 'phonology'] as const;

// ═══════════════════════ 集約ルート：ProgosScore ═══════════════════════
export class ProgosScore {
  constructor(
    readonly id: ProgosScoreId,
    readonly memberId: MemberId,
    readonly examDate: DateOnly,
    readonly overall: CefrLevel,
    readonly skills: ProgosSkillSet,
    readonly comment?: string,
  ) {}

  update(patch: UpdateProgosScoreInput): ProgosScore {
    return new ProgosScore(
      this.id,
      this.memberId,
      patch.examDate ? DateOnly.create(patch.examDate) : this.examDate,
      patch.overall ? CefrLevel.create(patch.overall) : this.overall,
      patch.skills ? ProgosScore.skillSet(patch.skills) : this.skills,
      patch.comment ?? this.comment,
    );
  }

  /** 前回 vs この回の overall を比較してレベル変動を判定する。 */
  trendFrom(previous: ProgosScore): ProgosTrend {
    const diff = this.overall.compareTo(previous.overall);
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'flat';
  }

  /**
   * PROGOSスコアを記録する。記録できるのは Coach のみ＝引数で CoachStaff を要求することで
   * 「コーチでなければ記録できない」というルールを“型”で物語る（ここで権限の throw はしない）。
   * 実行時に actor を CoachStaff へ確定できなければ、呼び出し元の UseCase が弾く。
   */
  static create(input: CreateProgosScoreInput, recordedBy: CoachStaff): ProgosScore {
    void recordedBy;
    return new ProgosScore(
      ProgosScoreId.create(input.id),
      MemberId.create(input.memberId),
      DateOnly.create(input.examDate),
      CefrLevel.create(input.overall),
      ProgosScore.skillSet(input.skills),
      input.comment,
    );
  }

  static fromRecord(r: {
    id: string;
    memberId: string;
    examDate: string;
    overall: string;
    skills: CreateProgosScoreInput['skills'];
    comment?: string;
  }): ProgosScore {
    return new ProgosScore(
      ProgosScoreId.create(r.id),
      MemberId.create(r.memberId),
      DateOnly.create(r.examDate),
      CefrLevel.create(r.overall),
      ProgosScore.skillSet(r.skills),
      r.comment,
    );
  }

  private static skillSet(input: Record<string, string>): ProgosSkillSet {
    const result = {} as Record<string, CefrLevel>;
    for (const key of SKILL_KEYS) {
      if (!input[key]) throw new DomainError(`PROGOS技能スコア(${key})は必須です`);
      result[key] = CefrLevel.create(input[key]);
    }
    return result as unknown as ProgosSkillSet;
  }
}
