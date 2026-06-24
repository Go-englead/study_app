import { createMemberId } from '../../domain/member/member';
import { createTextbookId } from '../../domain/textbook/textbook';
import {
  createTextbookAssignment,
  TextbookAssignment,
} from '../../domain/textbook-assignment/textbook-assignment';
import { TextbookAssignmentRepository } from '../../domain/textbook-assignment/textbook-assignment-repository';
import { TextbookRepository } from '../../domain/textbook/textbook-repository';
import { MemberRepository } from '../../domain/member/member-repository';
import { DomainError } from '../../domain/shared/domain-error';
import { AssignedTextbookDto } from './AssignedTextbookDto';

/**
 * 教材割り当てユースケース。
 * 表示用DTOは TextbookAssignment 集約と Textbook 集約を**アプリ層でマージ**して作る
 * （リポジトリ間で join しない＝集約境界を守る）。
 */
export class TextbookAssignmentUseCase {
  constructor(
    private readonly assignments: TextbookAssignmentRepository,
    private readonly textbooks: TextbookRepository,
    private readonly members: MemberRepository,
  ) {}

  /** 会員の割り当て教材一覧（教材マスタ情報を結合して返す）。 */
  async listByMember(memberId: string): Promise<AssignedTextbookDto[]> {
    const mid = createMemberId(memberId);
    const assigns = await this.assignments.findByMember(mid);
    const masters = await this.textbooks.findAll();
    const byId = new Map(masters.map((t) => [t.id as string, t]));
    return assigns.map((a) => this.toDto(a, byId.get(a.textbookId as string)));
  }

  /** 会員に教材を割り当て（会員・教材の存在を確認）。 */
  async assign(
    memberId: string,
    input: { textbookId: string; dailyGoalMinutes?: number | null; note?: string },
  ): Promise<AssignedTextbookDto> {
    const member = await this.members.findById(createMemberId(memberId));
    if (!member) throw new DomainError('会員が見つかりません');
    const textbook = await this.textbooks.findById(createTextbookId(input.textbookId));
    if (!textbook) throw new DomainError('教材が見つかりません');

    const assignment = createTextbookAssignment({
      memberId,
      textbookId: input.textbookId,
      dailyGoalMinutes: input.dailyGoalMinutes,
      note: input.note,
    });
    await this.assignments.save(assignment);
    return this.toDto(assignment, textbook);
  }

  /** 割り当て解除。 */
  async unassign(memberId: string, textbookId: string): Promise<void> {
    await this.assignments.delete(createMemberId(memberId), createTextbookId(textbookId));
  }

  private toDto(
    a: TextbookAssignment,
    textbook?: { code: string; name: string; category: string; unit: string; color: string },
  ): AssignedTextbookDto {
    return {
      textbookId: a.textbookId,
      textbookCode: textbook?.code ?? '',
      name: textbook?.name ?? '(削除済み教材)',
      category: textbook?.category ?? '',
      unit: textbook?.unit ?? '',
      color: textbook?.color ?? '#999999',
      dailyGoalMinutes: a.dailyGoalMinutes,
      note: a.note,
    };
  }
}
