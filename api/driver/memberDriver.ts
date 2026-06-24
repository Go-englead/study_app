import { eq, or, and, ilike, like, isNull, gt, gte, lte, inArray, getTableColumns } from 'drizzle-orm';
import { Database } from '../db/client';
import { MemberSearchCriteria } from '../domain/member/member-repository';
import {
  members,
  memberContacts,
  memberEnrollments,
  memberResidenceTravels,
  memberEnglishScores,
  memberCoachInputs,
  memberStaffAssignments,
  memberCredentials,
  textbookAssignments,
  NewMemberRow,
  NewMemberContactRow,
  NewMemberEnrollmentRow,
  NewMemberResidenceTravelRow,
  NewMemberEnglishScoreRow,
  NewMemberCoachInputRow,
  NewMemberStaffAssignmentRow,
  NewMemberCredentialRow,
} from '../db/schema';

/**
 * Member の DB アクセス（driver層）。
 * 会員はセクション単位でサテライト分割されているため、取得系は 1:1 テーブルを JOIN して
 * 平坦な結合行を返し、担当者（0〜3行のジャンクション）は別取得で添える。
 * ドメインへの変換は gateway 層（RepositoryImpl）が行う。
 */

/** 担当者ジャンクション1行 */
export type AssignmentRow = { role: string; staffId: string };

// 1:1 サテライトを平坦に取得する select 定義（キー名は gateway が参照する名前に揃える）
const joinedSelection = {
  ...getTableColumns(members),
  // 2. 連絡先
  email: memberContacts.email,
  phone: memberContacts.phone,
  // 3. 受講情報
  plan: memberEnrollments.plan,
  manualStatusOverride: memberEnrollments.manualStatusOverride,
  enrollmentDate: memberEnrollments.enrollmentDate,
  startDate: memberEnrollments.startDate,
  graduateDate: memberEnrollments.graduateDate,
  initialClass: memberEnrollments.initialClass,
  currentClass: memberEnrollments.currentClass,
  nativecamp: memberEnrollments.nativecamp,
  dailyTargetMinutes: memberEnrollments.dailyTargetMinutes,
  // 5. 在住・渡航
  residence: memberResidenceTravels.residence,
  residenceOverseas: memberResidenceTravels.residenceOverseas,
  travelCountry: memberResidenceTravels.travelCountry,
  travelCity: memberResidenceTravels.travelCity,
  travelDate: memberResidenceTravels.travelDate,
  travelReason: memberResidenceTravels.travelReason,
  travelNote: memberResidenceTravels.travelNote,
  // 6. 英語スコア
  toeicLr: memberEnglishScores.toeicLr,
  toeicSw: memberEnglishScores.toeicSw,
  toefl: memberEnglishScores.toefl,
  ielts: memberEnglishScores.ielts,
  eiken: memberEnglishScores.eiken,
  englishOther: memberEnglishScores.englishOther,
  // 7. コーチ入力
  coachLearningGoal: memberCoachInputs.coachLearningGoal,
  note: memberCoachInputs.note,
  // 認証
  loginId: memberCredentials.loginId,
  passwordHash: memberCredentials.passwordHash,
  requirePasswordChange: memberCredentials.requirePasswordChange,
};

/** joinedSelection の結果行（平坦）。assignments を後付けして MemberFullRow にする。 */
export type MemberJoinedRow = Awaited<ReturnType<typeof selectJoined>>[number];
export type MemberFullRow = MemberJoinedRow & { assignments: AssignmentRow[] };

function selectJoined(db: Database) {
  return db
    .select(joinedSelection)
    .from(members)
    .innerJoin(memberContacts, eq(memberContacts.memberId, members.id))
    .innerJoin(memberEnrollments, eq(memberEnrollments.memberId, members.id))
    .innerJoin(memberResidenceTravels, eq(memberResidenceTravels.memberId, members.id))
    .innerJoin(memberEnglishScores, eq(memberEnglishScores.memberId, members.id))
    .innerJoin(memberCoachInputs, eq(memberCoachInputs.memberId, members.id))
    .innerJoin(memberCredentials, eq(memberCredentials.memberId, members.id));
}

async function attachAssignments(db: Database, rows: MemberJoinedRow[]): Promise<MemberFullRow[]> {
  const all = await db
    .select({
      memberId: memberStaffAssignments.memberId,
      role: memberStaffAssignments.role,
      staffId: memberStaffAssignments.staffId,
    })
    .from(memberStaffAssignments);
  const byMember = new Map<string, AssignmentRow[]>();
  for (const a of all) {
    const list = byMember.get(a.memberId) ?? [];
    list.push({ role: a.role, staffId: a.staffId });
    byMember.set(a.memberId, list);
  }
  return rows.map((r) => ({ ...r, assignments: byMember.get(r.id) ?? [] }));
}

export async function findById(db: Database, id: string): Promise<MemberFullRow | undefined> {
  const rows = await selectJoined(db).where(eq(members.id, id)).limit(1);
  if (!rows[0]) return undefined;
  return (await attachAssignments(db, rows))[0];
}

export async function findByEmail(db: Database, email: string): Promise<MemberFullRow | undefined> {
  const rows = await selectJoined(db).where(eq(memberCredentials.loginId, email)).limit(1);
  if (!rows[0]) return undefined;
  return (await attachAssignments(db, rows))[0];
}

export async function findAll(db: Database): Promise<MemberFullRow[]> {
  const rows = await selectJoined(db);
  return attachAssignments(db, rows);
}

export async function search(db: Database, c: MemberSearchCriteria): Promise<MemberFullRow[]> {
  const conds = [];
  // 未設定（NULL または 空文字）にマッチ
  const unset = (col: any) => or(isNull(col), eq(col, ''));

  if (c.nameLike) {
    const kw = `%${c.nameLike}%`;
    conds.push(
      or(
        ilike(members.lastNameKanji, kw),
        ilike(members.firstNameKanji, kw),
        ilike(members.nickname, kw),
      ),
    );
  }
  if (c.codeLike) conds.push(ilike(members.memberCode, `%${c.codeLike}%`));
  if (c.startMonth) conds.push(like(memberEnrollments.startDate, `${c.startMonth}%`));

  if (c.occupationUnset) conds.push(unset(members.occupation));
  else if (c.occupation) conds.push(eq(members.occupation, c.occupation));

  if (c.residenceUnset) conds.push(unset(memberResidenceTravels.residence));
  else if (c.residence) conds.push(eq(memberResidenceTravels.residence, c.residence));

  if (c.travelCountryUnset) conds.push(unset(memberResidenceTravels.travelCountry));
  else if (c.travelCountry) conds.push(eq(memberResidenceTravels.travelCountry, c.travelCountry));

  if (c.travelReasonUnset) conds.push(unset(memberResidenceTravels.travelReason));
  else if (c.travelReason) conds.push(eq(memberResidenceTravels.travelReason, c.travelReason));

  if (c.travelDateUnset) conds.push(unset(memberResidenceTravels.travelDate));
  if (c.travelDateFrom) conds.push(gte(memberResidenceTravels.travelDate, c.travelDateFrom));
  if (c.travelDateTo) conds.push(lte(memberResidenceTravels.travelDate, c.travelDateTo));
  if (c.travelDateAfter) conds.push(gt(memberResidenceTravels.travelDate, c.travelDateAfter));

  // オリエン担当（ジャンクションをサブクエリで）
  if (c.orientStaffId) {
    conds.push(
      inArray(
        members.id,
        db
          .select({ id: memberStaffAssignments.memberId })
          .from(memberStaffAssignments)
          .where(
            and(
              eq(memberStaffAssignments.role, 'Orient'),
              eq(memberStaffAssignments.staffId, c.orientStaffId),
            ),
          ),
      ),
    );
  }
  // 使用教材（OR：いずれかを使っている会員）
  if (c.textbookIds && c.textbookIds.length > 0) {
    conds.push(
      inArray(
        members.id,
        db
          .select({ id: textbookAssignments.memberId })
          .from(textbookAssignments)
          .where(inArray(textbookAssignments.textbookId, c.textbookIds)),
      ),
    );
  }

  const rows = conds.length ? await selectJoined(db).where(and(...conds)) : await selectJoined(db);
  return attachAssignments(db, rows);
}

/** 会員1人分の全テーブル行（1:1サテライト＋認証＋担当ジャンクション）。 */
export interface MemberRowBundle {
  member: NewMemberRow;
  contact: NewMemberContactRow;
  enrollment: NewMemberEnrollmentRow;
  residenceTravel: NewMemberResidenceTravelRow;
  englishScore: NewMemberEnglishScoreRow;
  coachInput: NewMemberCoachInputRow;
  credential: NewMemberCredentialRow;
  /** 0〜3行（Consultant/CS/Orient）。「その他」は含めない。 */
  assignments: NewMemberStaffAssignmentRow[];
}

/** 会員1人分を1トランザクションで upsert する。担当者は一旦消してから入れ直す。 */
export async function upsert(db: Database, b: MemberRowBundle): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(members)
      .values(b.member)
      .onConflictDoUpdate({ target: members.id, set: b.member });
    await tx
      .insert(memberContacts)
      .values(b.contact)
      .onConflictDoUpdate({ target: memberContacts.memberId, set: b.contact });
    await tx
      .insert(memberEnrollments)
      .values(b.enrollment)
      .onConflictDoUpdate({ target: memberEnrollments.memberId, set: b.enrollment });
    await tx
      .insert(memberResidenceTravels)
      .values(b.residenceTravel)
      .onConflictDoUpdate({ target: memberResidenceTravels.memberId, set: b.residenceTravel });
    await tx
      .insert(memberEnglishScores)
      .values(b.englishScore)
      .onConflictDoUpdate({ target: memberEnglishScores.memberId, set: b.englishScore });
    await tx
      .insert(memberCoachInputs)
      .values(b.coachInput)
      .onConflictDoUpdate({ target: memberCoachInputs.memberId, set: b.coachInput });
    await tx
      .insert(memberCredentials)
      .values(b.credential)
      .onConflictDoUpdate({ target: memberCredentials.memberId, set: b.credential });

    // 担当者：役割ごと1行。更新に備えて全消し→必要分だけ入れ直す（「その他」は行なし）。
    await tx
      .delete(memberStaffAssignments)
      .where(eq(memberStaffAssignments.memberId, b.member.id!));
    if (b.assignments.length > 0) {
      await tx.insert(memberStaffAssignments).values(b.assignments);
    }
  });
}

export async function deleteById(db: Database, id: string): Promise<void> {
  // サテライト・認証・担当は ON DELETE CASCADE で同時削除される
  await db.delete(members).where(eq(members.id, id));
}
