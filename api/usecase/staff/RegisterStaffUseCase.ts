import { randomUUID } from 'node:crypto';
import { createStaff } from '../../domain/staff/staff';
import { StaffAuthRepository } from '../../domain/staff/staff-auth-repository';
import { PasswordHasher } from '../../domain/shared/password-hasher';
import { DomainError } from '../../domain/shared/domain-error';

export interface RegisterStaffInput {
  staffCode: string;
  name: string;
  role: string;
  email: string;
  password: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

export interface StaffDto {
  id: string;
  staffCode: string;
  name: string;
  role: string;
  email: string;
}

/** 職員登録：入力検証 → パスワードをハッシュ化 → staff＋staff_credentials に保存。 */
export class RegisterStaffUseCase {
  constructor(
    private readonly staffAuth: StaffAuthRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async register(input: RegisterStaffInput): Promise<StaffDto> {
    if (!input.staffCode?.trim()) throw new DomainError('社員コードは必須です');
    // 氏名/役割/メール/パスワード長を検証（パスワードは生のまま受け取り、保存前にハッシュ化）。
    const staff = createStaff({
      id: randomUUID(),
      name: input.name,
      role: input.role,
      email: input.email,
      password: input.password,
      iconUrl: input.iconUrl,
      meetUrl: input.meetUrl,
      groupContent: input.groupContent,
    });
    const passwordHash = await this.hasher.hash(input.password);
    await this.staffAuth.register({
      staffId: staff.id,
      staffCode: input.staffCode.trim(),
      name: staff.name,
      role: staff.role,
      loginId: staff.email as string,
      passwordHash,
      iconUrl: staff.iconUrl,
      meetUrl: staff.meetUrl,
      groupContent: staff.groupContent,
    });
    return {
      id: staff.id as string,
      staffCode: input.staffCode.trim(),
      name: staff.name,
      role: staff.role,
      email: staff.email as string,
    };
  }
}
