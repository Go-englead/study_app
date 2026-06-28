import { eq } from 'drizzle-orm';
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

export async function findAuthByLoginId(db: Database, loginId: string): Promise<StaffAuthRow | undefined> {
  const rows = await db
    .select({
      staffId: staff.id,
      staffCode: staff.staffCode,
      name: staff.name,
      role: staff.role,
      loginId: staffCredentials.loginId,
      passwordHash: staffCredentials.passwordHash,
    })
    .from(staffCredentials)
    .innerJoin(staff, eq(staff.id, staffCredentials.staffId))
    .where(eq(staffCredentials.loginId, loginId))
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
