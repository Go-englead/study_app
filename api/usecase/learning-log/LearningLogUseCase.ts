import { randomUUID } from 'node:crypto';
import { MemberId } from '../../domain/member/member';
import { TextbookId } from '../../domain/textbook/textbook';
import { LearningLogId, LearningLog } from '../../domain/learning-log/learning-log';
import { LearningLogRepository } from '../../domain/learning-log/learning-log-repository';
import { MemberRepository } from '../../domain/member/member-repository';
import { TextbookRepository } from '../../domain/textbook/textbook-repository';
import { DomainError } from '../../domain/shared/domain-error';
import { LearningLogDto } from './LearningLogDto';

export interface LearningLogWriteInput {
  textbookId: string;
  date: string;
  durationMinutes: number;
  comment?: string;
}

/** 学習記録ユースケース（会員カルテ）。 */
export class LearningLogUseCase {
  constructor(
    private readonly logs: LearningLogRepository,
    private readonly members: MemberRepository,
    private readonly textbooks: TextbookRepository,
  ) {}

  async listByMember(memberId: string): Promise<LearningLogDto[]> {
    const list = await this.logs.findByMember(MemberId.create(memberId));
    return list.map(toDto);
  }

  async add(memberId: string, input: LearningLogWriteInput): Promise<LearningLogDto> {
    const member = await this.members.findById(MemberId.create(memberId));
    if (!member) throw new DomainError('会員が見つかりません');
    const textbook = await this.textbooks.findById(TextbookId.create(input.textbookId));
    if (!textbook) throw new DomainError('教材が見つかりません');

    const log = LearningLog.create({
      id: randomUUID(),
      memberId,
      textbookId: input.textbookId,
      date: input.date,
      durationMinutes: input.durationMinutes,
      comment: input.comment,
    });
    await this.logs.save(log);
    return toDto(log);
  }

  async delete(logId: string): Promise<void> {
    await this.logs.delete(LearningLogId.create(logId));
  }
}

function toDto(l: LearningLog): LearningLogDto {
  return {
    id: l.id.value,
    memberId: l.memberId.value,
    textbookId: l.textbookId.value,
    date: l.date.value,
    durationMinutes: l.durationMinutes,
    comment: l.comment,
  };
}
