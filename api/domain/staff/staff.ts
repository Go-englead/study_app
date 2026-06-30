import { DomainError } from '../shared/domain-error';
import { ForbiddenError } from '../shared/forbidden-error';
import { Email } from '../shared/value-objects';

// ═══════════════════════ 値オブジェクト（生成・検証は各 VO の create に閉じる） ═══════════════════════
export class StaffId {
  private constructor(readonly value: string) {}
  static create(raw: string): StaffId {
    const v = (raw ?? '').trim();
    if (!v) throw new DomainError('社員IDは必須です');
    return new StaffId(v);
  }
}

export type RoleName = 'Coach' | 'Teacher' | 'Consultant' | 'CS' | 'Staff';

/** 役割（内部値は英語、表示は日本語）。Staff=運営。 */
export class Role {
  private static readonly LABELS: Record<RoleName, string> = {
    Coach: 'コーチ',
    Teacher: '講師',
    Consultant: 'コンサルタント',
    CS: 'CS',
    Staff: '運営',
  };
  private constructor(readonly name: RoleName) {}
  static create(raw: string): Role {
    if (!(raw in Role.LABELS)) throw new DomainError(`役割が不正です: ${raw}`);
    return new Role(raw as RoleName);
  }
  get label(): string {
    return Role.LABELS[this.name];
  }
}

/** 生パスワード（強度検証を VO に閉じる。保存ハッシュは gateway）。 */
export class StaffPassword {
  private constructor(readonly value: string) {}
  static create(raw: string): StaffPassword {
    if ((raw ?? '').length < 8) throw new DomainError('パスワードは8文字以上で設定してください');
    return new StaffPassword(raw);
  }
}

export interface CreateStaffInput {
  id: string;
  staffCode: string;
  name: string;
  role: string;
  email: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

export interface UpdateStaffInput {
  name?: string;
  role?: string;
  email?: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

// ═══════════════════════ 集約ルート：Staff（基底プロフィール） ═══════════════════════
// 認証情報（パスワード）は別集約（staff_credentials）。ここはプロフィールのみ。
// 振る舞い（update / 能力）はクラスにカプセル化する。生成のみ static（create / fromRecord）。
export abstract class StaffBase {
  abstract readonly role: Role;

  constructor(
    readonly id: StaffId,
    readonly staffCode: string,
    readonly name: string,
    readonly email: Email,
    readonly iconUrl?: string,
    readonly meetUrl?: string,
    readonly groupContent?: string,
  ) {}

  /** プロフィール更新（不変条件をカプセル化）。role 変更時は適切な class を再生成。 */
  update(patch: UpdateStaffInput): Staff {
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new DomainError('スタッフ氏名は必須です');
    }
    return StaffBase.create({
      id: this.id.value,
      staffCode: this.staffCode,
      name: patch.name ?? this.name,
      role: patch.role ?? this.role.name,
      email: patch.email ?? this.email.value,
      iconUrl: patch.iconUrl ?? this.iconUrl,
      meetUrl: patch.meetUrl ?? this.meetUrl,
      groupContent: patch.groupContent ?? this.groupContent,
    });
  }

  /**
   * 管理画面に入れる職員として確定する（できなければ ForbiddenError）。
   * 「どの role が管理画面に入れるか」は staff/認証ドメイン固有のルール。
   * 能力（authenticateAsAdmin）は AdminStaffBase だけが持つ＝型で表す。
   */
  requireAdmin(): AdminStaff {
    if (this instanceof AdminStaffBase) return this.authenticateAsAdmin();
    throw new ForbiddenError(`${this.role.label}は管理画面にログインできません`);
  }

  /** 新規作成（入力検証つき）。role に応じた具象 class を生成。 */
  static create(input: CreateStaffInput): Staff {
    if (!input.staffCode?.trim()) throw new DomainError('社員IDは必須です');
    if (!input.name?.trim()) throw new DomainError('スタッフ氏名は必須です');
    const id = StaffId.create(input.id);
    const email = Email.create(input.email);
    const code = input.staffCode.trim();
    switch (Role.create(input.role).name) {
      case 'Coach':      return new CoachStaff(id, code, input.name, email, input.iconUrl, input.meetUrl, input.groupContent);
      case 'Teacher':    return new TeacherStaff(id, code, input.name, email, input.iconUrl, input.meetUrl, input.groupContent);
      case 'Consultant': return new ConsultantStaff(id, code, input.name, email, input.iconUrl, input.meetUrl, input.groupContent);
      case 'CS':         return new CsStaff(id, code, input.name, email, input.iconUrl, input.meetUrl, input.groupContent);
      case 'Staff':      return new OperatorStaff(id, code, input.name, email, input.iconUrl, input.meetUrl, input.groupContent);
    }
  }

  /** 永続/認証レコードから復元。 */
  static fromRecord(r: {
    staffId: string;
    staffCode: string;
    name: string;
    role: string;
    loginId: string;
  }): Staff {
    return StaffBase.create({ id: r.staffId, staffCode: r.staffCode, name: r.name, role: r.role, email: r.loginId });
  }
}

// ── 管理画面に入れる職員だけが持つ能力（throw しない・capable のみ） ──
abstract class AdminStaffBase extends StaffBase {
  authenticateAsAdmin(): AdminStaff {
    return this as unknown as AdminStaff;
  }
}

// ── role 別 class：自分の role と「できること」だけを書く（できないことは持たせない） ──
export class CoachStaff extends AdminStaffBase {
  readonly role = Role.create('Coach');
}
export class TeacherStaff extends AdminStaffBase {
  readonly role = Role.create('Teacher');
}
export class ConsultantStaff extends StaffBase {
  readonly role = Role.create('Consultant');
}
export class CsStaff extends StaffBase {
  readonly role = Role.create('CS');
}
/** 運営。 */
export class OperatorStaff extends StaffBase {
  readonly role = Role.create('Staff');
}

/** 職員（role 別 class の判別共用体）。 */
export type Staff = CoachStaff | TeacherStaff | ConsultantStaff | CsStaff | OperatorStaff;

/**
 * 管理画面にアクセスできる職員＝Coach か Teacher。
 * 「権限がある／ない」を boolean で持たず、能力を“型”で表す。
 */
export type AdminStaff = CoachStaff | TeacherStaff;
