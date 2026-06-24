import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';
import { DateOnly, createDateOnly, CefrLevel, createCefrLevel, compareCefr } from '../shared/value-objects';
import { MemberId, createMemberId } from '../member/member';

export type ProgosScoreId = Brand<string, 'ProgosScoreId'>;

export function createProgosScoreId(raw: string): ProgosScoreId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('PROGOSスコアIDは必須です');
  return value as ProgosScoreId;
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

const SKILL_KEYS = ['range', 'accuracy', 'fluency', 'interaction', 'coherence', 'phonology'] as const;

function createProgosSkillSet(input: Record<string, string>): ProgosSkillSet {
  const result = {} as Record<string, CefrLevel>;
  for (const key of SKILL_KEYS) {
    if (!input[key]) throw new DomainError(`PROGOS技能スコア(${key})は必須です`);
    result[key] = createCefrLevel(input[key]);
  }
  return result as unknown as ProgosSkillSet;
}

// ═══════════════════════ 集約ルート：ProgosScore ═══════════════════════
export interface ProgosScore {
  readonly id: ProgosScoreId;
  readonly memberId: MemberId;
  readonly examDate: DateOnly;
  readonly overall: CefrLevel;
  readonly skills: ProgosSkillSet;
  readonly comment?: string;
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

export function createProgosScore(input: CreateProgosScoreInput): ProgosScore {
  return {
    id: createProgosScoreId(input.id),
    memberId: createMemberId(input.memberId),
    examDate: createDateOnly(input.examDate),
    overall: createCefrLevel(input.overall),
    skills: createProgosSkillSet(input.skills),
    comment: input.comment,
  };
}

export interface UpdateProgosScoreInput {
  examDate?: string;
  overall?: string;
  skills?: CreateProgosScoreInput['skills'];
  comment?: string;
}

export function updateProgosScore(current: ProgosScore, patch: UpdateProgosScoreInput): ProgosScore {
  return {
    ...current,
    examDate: patch.examDate ? createDateOnly(patch.examDate) : current.examDate,
    overall: patch.overall ? createCefrLevel(patch.overall) : current.overall,
    skills: patch.skills ? createProgosSkillSet(patch.skills) : current.skills,
    comment: patch.comment ?? current.comment,
  };
}

// ═══════════════════════ ドメインサービス：レベル変動 ═══════════════════════
export type ProgosTrend = 'up' | 'flat' | 'down';

/** 前回 vs 最新の overall を比較してレベル変動を判定する */
export function analyzeProgosTrend(previous: ProgosScore, latest: ProgosScore): ProgosTrend {
  const diff = compareCefr(latest.overall, previous.overall);
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
}
