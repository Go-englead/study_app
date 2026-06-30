import { Database } from '../db/client';
import * as driver from '../driver/staffDriver';
import { StaffId, RoleName, Staff, StaffBase } from '../domain/staff/staff';
import {
  StaffAuthRepository,
  StaffAuthRecord,
  RegisterStaffParams,
} from '../domain/staff/staff-auth-repository';

function toRecord(row: driver.StaffAuthRow | undefined): StaffAuthRecord | undefined {
  if (!row || !row.passwordHash) return undefined;
  return {
    staffId: row.staffId,
    staffCode: row.staffCode,
    name: row.name,
    role: row.role as RoleName,
    loginId: row.loginId,
    passwordHash: row.passwordHash,
  };
}

function toStaff(row: driver.StaffAuthRow): Staff {
  return StaffBase.fromRecord({
    staffId: row.staffId,
    staffCode: row.staffCode,
    name: row.name,
    role: row.role,
    loginId: row.loginId,
  });
}

/** StaffAuthRepository の実装（gateway層）。 */
export class StaffAuthRepositoryImpl implements StaffAuthRepository {
  constructor(private readonly db: Database) {}

  async findByLoginId(loginId: string): Promise<StaffAuthRecord | undefined> {
    return toRecord(await driver.findAuthByLoginId(this.db, loginId));
  }

  async findById(staffId: StaffId): Promise<StaffAuthRecord | undefined> {
    return toRecord(await driver.findAuthById(this.db, staffId.value));
  }

  async register(p: RegisterStaffParams): Promise<void> {
    await driver.insertStaffWithCredential(this.db, {
      id: p.staffId,
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

  async listAll(): Promise<Staff[]> {
    const rows = await driver.listAllAuth(this.db);
    return rows.map(toStaff);
  }

  async search(keyword: string): Promise<Staff[]> {
    const rows = await driver.searchAuth(this.db, keyword);
    return rows.map(toStaff);
  }

  async findProfileById(staffId: StaffId): Promise<Staff | undefined> {
    const row = await driver.findAuthById(this.db, staffId.value);
    return row ? toStaff(row) : undefined;
  }

  async findByEmail(email: string): Promise<Staff | undefined> {
    const row = await driver.findAuthByLoginId(this.db, email);
    return row ? toStaff(row) : undefined;
  }

  async findByStaffCode(staffCode: string): Promise<Staff | undefined> {
    const row = await driver.findAuthByStaffCode(this.db, staffCode);
    return row ? toStaff(row) : undefined;
  }

  async updateProfile(staff: Staff): Promise<void> {
    await driver.updateProfile(this.db, {
      id: staff.id.value,
      name: staff.name,
      role: staff.role.name,
      email: staff.email.value,
      iconUrl: staff.iconUrl,
      meetUrl: staff.meetUrl,
      groupContent: staff.groupContent,
    });
  }

  async setPasswordHash(staffId: StaffId, passwordHash: string): Promise<void> {
    await driver.setPasswordHash(this.db, staffId.value, passwordHash);
  }

  async deleteById(staffId: StaffId): Promise<void> {
    await driver.deleteById(this.db, staffId.value);
  }
}
