import { MemberId } from '../../domain/member/member';
import { Textbook, TextbookId } from '../../domain/textbook/textbook';
import { TextbookAssignment } from '../../domain/textbook-assignment/textbook-assignment';
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
    const mid = MemberId.create(memberId);
    const assigns = await this.assignments.findByMember(mid);
    const masters = await this.textbooks.findAll();
    const byId = new Map(masters.map((t) => [t.id.value, t]));
    return assigns.map((a) => this.toDto(a, byId.get(a.textbookId.value)));
  }

  /** 会員に教材を割り当て（会員・教材の存在を確認）。 */
  async assign(
    memberId: string,
    input: { textbookId: string; dailyGoalMinutes?: number | null; note?: string },
  ): Promise<AssignedTextbookDto> {
    const member = await this.members.findById(MemberId.create(memberId));
    if (!member) throw new DomainError('会員が見つかりません');
    const textbook = await this.textbooks.findById(TextbookId.create(input.textbookId));
    if (!textbook) throw new DomainError('教材が見つかりません');

    const assignment = TextbookAssignment.create({
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
    await this.assignments.delete(MemberId.create(memberId), TextbookId.create(textbookId));
  }

  private toDto(
    a: TextbookAssignment,
    textbook?: Textbook,
  ): AssignedTextbookDto {
    return {
      textbookId: a.textbookId.value,
      textbookCode: textbook?.code ?? '',
      name: textbook?.name ?? '(削除済み教材)',
      category: textbook?.category ?? '',
      unit: textbook?.unit.value ?? '',
      color: textbook?.color ?? '#999999',
      dailyGoalMinutes: a.dailyGoalMinutes,
      note: a.note,
    };
  }
}
