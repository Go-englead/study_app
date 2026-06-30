import { randomUUID } from 'node:crypto';
import { MemberId } from '../../domain/member/member';
import { ProgosScore } from '../../domain/progos-score/progos-score';
import { ProgosScoreRepository } from '../../domain/progos-score/progos-score-repository';
import { MemberRepository } from '../../domain/member/member-repository';
import { DomainError } from '../../domain/shared/domain-error';
import { AuthError } from '../../domain/shared/auth-error';
import { ForbiddenError } from '../../domain/shared/forbidden-error';
import { StaffId, StaffBase, CoachStaff } from '../../domain/staff/staff';
import { StaffAuthRepository } from '../../domain/staff/staff-auth-repository';
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
    private readonly staffAuth: StaffAuthRepository,
  ) {}

  async listByMember(memberId: string): Promise<ProgosScoreDto[]> {
    const list = await this.scores.findByMember(MemberId.create(memberId));
    return list.map(toDto);
  }

  /** PROGOS登録。記録には CoachStaff が必要（ドメインの型が要求）。 */
  async add(memberId: string, input: ProgosScoreWriteInput, actorStaffId: string): Promise<ProgosScoreDto> {
    const rec = await this.staffAuth.findById(StaffId.create(actorStaffId));
    if (!rec) throw new AuthError('操作職員が見つかりません');
    const actor = StaffBase.fromRecord(rec);
    // アプリ都合：ドメインが要求する CoachStaff 型に確定できなければ弾く（Coach 以外は記録不可）。
    if (!(actor instanceof CoachStaff)) {
      throw new ForbiddenError(`PROGOSスコアの操作はコーチのみ可能です（役割: ${actor.role.label}）`);
    }

    const member = await this.members.findById(MemberId.create(memberId));
    if (!member) throw new DomainError('会員が見つかりません');

    const score = ProgosScore.create(
      {
        id: randomUUID(),
        memberId,
        examDate: input.examDate,
        overall: input.overall,
        skills: input.skills,
        comment: input.comment,
      },
      actor,
    );
    await this.scores.save(score);
    return toDto(score);
  }
}

function toDto(s: ProgosScore): ProgosScoreDto {
  return {
    id: s.id.value,
    memberId: s.memberId.value,
    examDate: s.examDate.value,
    overall: s.overall.value,
    skills: {
      range: s.skills.range.value,
      accuracy: s.skills.accuracy.value,
      fluency: s.skills.fluency.value,
      interaction: s.skills.interaction.value,
      coherence: s.skills.coherence.value,
      phonology: s.skills.phonology.value,
    },
    comment: s.comment,
  };
}
