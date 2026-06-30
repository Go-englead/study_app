import { eq, or, ilike } from 'drizzle-orm';
import { Database } from '../db/client';
import { staff, staffCredentials } from '../db/schema';

/** staff（プロフィール）＋ staff_credentials（認証）の DB アクセス（driver層）。 */

export interface StaffAuthRow {
  staffId: string;
  staffCode: string;
  name: string;
  role: string;
  loginId: string;
  passwordHash: string | null;
}

const authSelection = {
  staffId: staff.id,
  staffCode: staff.staffCode,
  name: staff.name,
  role: staff.role,
  loginId: staffCredentials.loginId,
  passwordHash: staffCredentials.passwordHash,
};

export async function findAuthByLoginId(db: Database, loginId: string): Promise<StaffAuthRow | undefined> {
  const rows = await db
    .select(authSelection)
    .from(staffCredentials)
    .innerJoin(staff, eq(staff.id, staffCredentials.staffId))
    .where(eq(staffCredentials.loginId, loginId))
    .limit(1);
  return rows[0];
}

export async function findAuthById(db: Database, staffId: string): Promise<StaffAuthRow | undefined> {
  const rows = await db
    .select(authSelection)
    .from(staffCredentials)
    .innerJoin(staff, eq(staff.id, staffCredentials.staffId))
    .where(eq(staff.id, staffId))
    .limit(1);
  return rows[0];
}

export async function findAuthByStaffCode(db: Database, staffCode: string): Promise<StaffAuthRow | undefined> {
  const rows = await db
    .select(authSelection)
    .from(staffCredentials)
    .innerJoin(staff, eq(staff.id, staffCredentials.staffId))
    .where(eq(staff.staffCode, staffCode))
    .limit(1);
  return rows[0];
}

export interface InsertStaffParams {
  id: string;
  staffCode: string;
  name: string;
  role: string;
  loginId: string;
  passwordHash: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

/** プロフィール＋資格情報を1トランザクションで登録。 */
export async function insertStaffWithCredential(db: Database, p: InsertStaffParams): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(staff).values({
      id: p.id,
      staffCode: p.staffCode,
      name: p.name,
      role: p.role,
      iconUrl: p.iconUrl,
      meetUrl: p.meetUrl,
      groupContent: p.groupContent,
    });
    await tx.insert(staffCredentials).values({
      staffId: p.id,
      loginId: p.loginId,
      passwordHash: p.passwordHash,
    });
  });
}

// ── 管理（CRUD） ──
export async function listAllAuth(db: Database): Promise<StaffAuthRow[]> {
  return db.select(authSelection).from(staffCredentials).innerJoin(staff, eq(staff.id, staffCredentials.staffId));
}

/** 社員ID・氏名・メール（loginId）の部分一致で検索。keyword 空なら全件。 */
export async function searchAuth(db: Database, keyword: string): Promise<StaffAuthRow[]> {
  const like = `%${keyword}%`;
  return db
    .select(authSelection)
    .from(staffCredentials)
    .innerJoin(staff, eq(staff.id, staffCredentials.staffId))
    .where(or(ilike(staff.staffCode, like), ilike(staff.name, like), ilike(staffCredentials.loginId, like)));
}

export interface UpdateStaffProfileParams {
  id: string;
  name: string;
  role: string;
  email: string;
  iconUrl?: string;
  meetUrl?: string;
  groupContent?: string;
}

/** プロフィール（staff）＋ loginId（staff_credentials）を1トランザクションで更新。 */
export async function updateProfile(db: Database, p: UpdateStaffProfileParams): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(staff)
      .set({ name: p.name, role: p.role, iconUrl: p.iconUrl, meetUrl: p.meetUrl, groupContent: p.groupContent })
      .where(eq(staff.id, p.id));
    await tx.update(staffCredentials).set({ loginId: p.email }).where(eq(staffCredentials.staffId, p.id));
  });
}

export async function setPasswordHash(db: Database, staffId: string, passwordHash: string): Promise<void> {
  await db.update(staffCredentials).set({ passwordHash }).where(eq(staffCredentials.staffId, staffId));
}

export async function deleteById(db: Database, staffId: string): Promise<void> {
  await db.delete(staff).where(eq(staff.id, staffId)); // credential は CASCADE
}
