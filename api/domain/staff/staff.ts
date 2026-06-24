import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';
import { Email, createEmail } from '../shared/value-objects';

export type StaffId = Brand<string, 'StaffId'>;

export function createStaffId(raw: string): StaffId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('社員IDは必須です');
  return value as StaffId;
}

/** 役割。管理画面に入れるのは Coach / Teacher のみ。 */
export type Role = 'Coach' | 'Teacher' | 'Consultant' | 'CS';

const ROLES: readonly Role[] = ['Coach', 'Teacher', 'Consultant', 'CS'];

export function createRole(raw: string): Role {
  if (!(ROLES as readonly string[]).includes(raw)) {
    throw new DomainError(`役割が不正です: ${raw}`);
  }
  return raw as Role;
}

/** スタッフの認証情報 */
export interface StaffCredential {
  readonly password: string;
}

const MIN_PASSWORD_LENGTH = 8;

// ═══════════════════════ 集約ルート：Staff ═══════════════════════
export interface Staff {
  readonly id: StaffId;
  readonly name: string;
  readonly role: Role;
  readonly email: Email;
  readonly credential: StaffCredential;
  readonly iconUrl?: string;
  readonly meetUrl?: string;
  readonly groupContent?: string;
}

export interface CreateStaffInput {
  id: string;
  name: string;
  role: string;
  email: string;
  password: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

export function createStaff(input: CreateStaffInput): Staff {
  if (!input.name?.trim()) throw new DomainError('スタッフ氏名は必須です');
  if ((input.password ?? '').length < MIN_PASSWORD_LENGTH) {
    throw new DomainError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で設定してください`);
  }
  return {
    id: createStaffId(input.id),
    name: input.name,
    role: createRole(input.role),
    email: createEmail(input.email),
    credential: { password: input.password },
    iconUrl: input.iconUrl,
    meetUrl: input.meetUrl,
    groupContent: input.groupContent,
  };
}

export interface UpdateStaffInput {
  name?: string;
  role?: string;
  email?: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

export function updateStaff(current: Staff, patch: UpdateStaffInput): Staff {
  if (patch.name !== undefined && !patch.name.trim()) {
    throw new DomainError('スタッフ氏名は必須です');
  }
  return {
    ...current,
    name: patch.name ?? current.name,
    role: patch.role ? createRole(patch.role) : current.role,
    email: patch.email ? createEmail(patch.email) : current.email,
    iconUrl: patch.iconUrl ?? current.iconUrl,
    meetUrl: patch.meetUrl ?? current.meetUrl,
    groupContent: patch.groupContent ?? current.groupContent,
  };
}

/** 自身のパスワードを変更する */
export function changeStaffPassword(current: Staff, newPassword: string): Staff {
  if ((newPassword ?? '').length < MIN_PASSWORD_LENGTH) {
    throw new DomainError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で設定してください`);
  }
  return { ...current, credential: { password: newPassword } };
}

/** 管理画面にアクセスできる役割か */
export function canAccessAdmin(staff: Staff): boolean {
  return staff.role === 'Coach' || staff.role === 'Teacher';
}
