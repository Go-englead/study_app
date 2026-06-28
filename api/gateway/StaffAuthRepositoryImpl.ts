import { Database } from '../db/client';
import * as driver from '../driver/staffDriver';
import { StaffId, Role } from '../domain/staff/staff';
import {
  StaffAuthRepository,
  StaffAuthRecord,
  RegisterStaffParams,
} from '../domain/staff/staff-auth-repository';

/** StaffAuthRepository の実装（gateway層）。 */
export class StaffAuthRepositoryImpl implements StaffAuthRepository {
  constructor(private readonly db: Database) {}

  async findByLoginId(loginId: string): Promise<StaffAuthRecord | undefined> {
    const row = await driver.findAuthByLoginId(this.db, loginId);
    if (!row || !row.passwordHash) return undefined;
    return {
      staffId: row.staffId as StaffId,
      staffCode: row.staffCode,
      name: row.name,
      role: row.role as Role,
      loginId: row.loginId,
      passwordHash: row.passwordHash,
    };
  }

  async register(p: RegisterStaffParams): Promise<void> {
    await driver.insertStaffWithCredential(this.db, {
      id: p.staffId as string,
      staffCode: p.staffCode,
      name: p.name,
      role: p.role,
      loginId: p.loginId,
      passwordHash: p.passwordHash,
      iconUrl: p.iconUrl,
      meetUrl: p.meetUrl,
      groupContent: p.groupContent,
    });
  }
}
