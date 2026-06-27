import { randomUUID } from 'node:crypto';
import { createMemberId } from '../../domain/member/member';
import { createProgosScore, ProgosScore } from '../../domain/progos-score/progos-score';
import { ProgosScoreRepository } from '../../domain/progos-score/progos-score-repository';
import { MemberRepository } from '../../domain/member/member-repository';
import { DomainError } from '../../domain/shared/domain-error';
import { ProgosScoreDto } from './ProgosScoreDto';

export interface ProgosScoreWriteInput {
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

/** PROGOSスコアユースケース（会員カルテ）。 */
export class ProgosScoreUseCase {
  constructor(
    private readonly scores: ProgosScoreRepository,
    private readonly members: MemberRepository,
  ) {}

  async listByMember(memberId: string): Promise<ProgosScoreDto[]> {
    const list = await this.scores.findByMember(createMemberId(memberId));
    return list.map(toDto);
  }

  async add(memberId: string, input: ProgosScoreWriteInput): Promise<ProgosScoreDto> {
    const member = await this.members.findById(createMemberId(memberId));
    if (!member) throw new DomainError('会員が見つかりません');

    const score = createProgosScore({
      id: randomUUID(),
      memberId,
      examDate: input.examDate,
      overall: input.overall,
      skills: input.skills,
      comment: input.comment,
    });
    await this.scores.save(score);
    return toDto(score);
  }
}

function toDto(s: ProgosScore): ProgosScoreDto {
  return {
    id: s.id as string,
    memberId: s.memberId as string,
    examDate: s.examDate as string,
    overall: s.overall as string,
    skills: {
      range: s.skills.range as string,
      accuracy: s.skills.accuracy as string,
      fluency: s.skills.fluency as string,
      interaction: s.skills.interaction as string,
      coherence: s.skills.coherence as string,
      phonology: s.skills.phonology as string,
    },
    comment: s.comment,
  };
}
