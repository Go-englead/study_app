import { randomUUID } from 'node:crypto';
import { StaffBase, StaffPassword } from '../../domain/staff/staff';
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
    // プロフィールの検証（氏名/役割/メール/社員ID）＋パスワード強度。パスワードは保存前にハッシュ化。
    const password = StaffPassword.create(input.password);
    // 一意性（社員ID・メール）はアプリ層で事前検証（DB一意制約違反を400で返す）。
    if (await this.staffAuth.findByStaffCode(input.staffCode.trim())) {
      throw new DomainError(`社員ID「${input.staffCode.trim()}」は既に登録されています`);
    }
    if (await this.staffAuth.findByEmail((input.email ?? '').trim().toLowerCase())) {
      throw new DomainError(`メールアドレス「${input.email}」は既に使用されています`);
    }
    const staff = StaffBase.create({
      id: randomUUID(),
      staffCode: input.staffCode,
      name: input.name,
      role: input.role,
      email: input.email,
      iconUrl: input.iconUrl,
      meetUrl: input.meetUrl,
      groupContent: input.groupContent,
    });
    const passwordHash = await this.hasher.hash(password.value);
    await this.staffAuth.register({
      staffId: staff.id.value,
      staffCode: staff.staffCode,
      name: staff.name,
      role: staff.role.name,
      loginId: staff.email.value,
      passwordHash,
      iconUrl: staff.iconUrl,
      meetUrl: staff.meetUrl,
      groupContent: staff.groupContent,
    });
    return {
      id: staff.id.value,
      staffCode: staff.staffCode,
      name: staff.name,
      role: staff.role.name,
      email: staff.email.value,
    };
  }
}
