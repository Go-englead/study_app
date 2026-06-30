import { StaffAuthRepository } from '../../domain/staff/staff-auth-repository';
import { PasswordHasher } from '../../domain/shared/password-hasher';
import { AuthError } from '../../domain/shared/auth-error';
import { StaffBase } from '../../domain/staff/staff';
import { issueStaffToken } from './token';

export interface StaffLoginResult {
  token: string;
  staff: { id: string; email: string; name: string; role: string };
}

/** 職員ログイン：loginId で資格情報を引き、ハッシュ照合 → JWT 発行。 */
export class StaffLoginUseCase {
  constructor(
    private readonly staffAuth: StaffAuthRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async login(loginId: string, password: string): Promise<StaffLoginResult> {
    const rec = await this.staffAuth.findByLoginId((loginId ?? '').trim().toLowerCase());
    // 存在有無を秘匿するため、見つからない場合もメッセージは同一にする。
    if (!rec) throw new AuthError('IDまたはパスワードが違います');
    const ok = await this.hasher.verify(rec.passwordHash, password ?? '');
    if (!ok) throw new AuthError('IDまたはパスワードが違います');

    // 認証済みの職員を組み立て、管理画面に入れる職員（AdminStaff）として確定する。
    // Coach / Teacher 以外はここで弾かれる（ForbiddenError → 403）＝そもそもトークンを発行しない。
    const admin = StaffBase.fromRecord(rec).requireAdmin();

    const token = await issueStaffToken(admin.id.value, admin.role.name);
    return {
      token,
      staff: { id: admin.id.value, email: admin.email.value, name: admin.name, role: admin.role.name },
    };
  }
}
