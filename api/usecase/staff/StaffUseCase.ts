import { StaffId, StaffPassword, Staff } from '../../domain/staff/staff';
import { StaffAuthRepository } from '../../domain/staff/staff-auth-repository';
import { PasswordHasher } from '../../domain/shared/password-hasher';
import { DomainError } from '../../domain/shared/domain-error';

export interface StaffSummaryDto {
  id: string;
  staffCode: string;
  name: string;
  role: string;
  email: string;
}

export interface UpdateStaffWriteInput {
  name?: string;
  role?: string;
  email?: string;
  /** 指定時のみパスワードを変更（空なら据え置き）。 */
  password?: string;
}

/**
 * スタッフ管理（一覧/詳細/更新/削除）。
 * ビジネスルール（プロフィール検証・パスワード強度）はドメインに委譲し、
 * usecase は取得→ドメイン適用→保存と、メール一意性などのアプリ整合だけを行う。
 */
export class StaffUseCase {
  constructor(
    private readonly staff: StaffAuthRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  /** 一覧／検索（社員ID・氏名・メールの部分一致。keyword 無しは全件）。 */
  async list(keyword?: string): Promise<StaffSummaryDto[]> {
    const trimmed = (keyword ?? '').trim();
    const all = trimmed ? await this.staff.search(trimmed) : await this.staff.listAll();
    return all.map(toDto);
  }

  async get(staffId: string): Promise<StaffSummaryDto | undefined> {
    const s = await this.staff.findProfileById(StaffId.create(staffId));
    return s ? toDto(s) : undefined;
  }

  async update(staffId: string, input: UpdateStaffWriteInput): Promise<StaffSummaryDto> {
    const current = await this.staff.findProfileById(StaffId.create(staffId));
    if (!current) throw new DomainError('スタッフが見つかりません');

    const updated = current.update({
      name: input.name,
      role: input.role,
      email: input.email,
    });

    // メール（loginId）の一意性（自分以外と重複しないこと）。
    if (input.email) {
      const other = await this.staff.findByEmail(updated.email.value);
      if (other && other.id.value !== staffId) {
        throw new DomainError(`メールアドレス「${updated.email}」は既に使用されています`);
      }
    }

    await this.staff.updateProfile(updated);

    if (input.password) {
      const password = StaffPassword.create(input.password);
      const hash = await this.hasher.hash(password.value);
      await this.staff.setPasswordHash(StaffId.create(staffId), hash);
    }

    return toDto(updated);
  }

  async delete(staffId: string): Promise<void> {
    await this.staff.deleteById(StaffId.create(staffId));
  }
}

function toDto(s: Staff): StaffSummaryDto {
  return {
    id: s.id.value,
    staffCode: s.staffCode,
    name: s.name,
    role: s.role.name,
    email: s.email.value,
  };
}
