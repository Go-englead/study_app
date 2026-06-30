import { randomBytes, randomUUID } from 'node:crypto';
import {
  MemberRepository,
  MemberSearchCriteria,
} from '../../domain/member/member-repository';
import {
  Member,
  MemberId,
  CreateMemberInput,
  UpdateMemberInput,
} from '../../domain/member/member';
import { ContinuationPlan, ContinuationPlanId } from '../../domain/continuation-plan/continuation-plan';
import { MemberDto, toMemberDto } from './MemberDto';

/** 会員一覧/検索のクエリ（UIのトークンそのまま。__unset__ や within3m を含む）。 */
export interface MemberListQuery {
  keyword?: string;
  /** 'name'（既定）= 氏名・ニックネーム / 'code' = 会員番号 */
  keywordType?: string;
  startMonth?: string;
  occupation?: string;
  residence?: string;
  orientStaffId?: string;
  travelCountry?: string;
  travelReason?: string;
  /** within3m | within6m | within12m | over12m | __unset__ */
  travelDate?: string;
  textbookIds?: string[];
}

const UNSET = '__unset__';

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** UIクエリ（トークン）→ 解決済み検索条件。渡航時期は今日基準で日付に変換。 */
function toCriteria(q: MemberListQuery, today: Date): MemberSearchCriteria {
  const c: MemberSearchCriteria = {};
  if (q.keyword) {
    if (q.keywordType === 'code') c.codeLike = q.keyword;
    else c.nameLike = q.keyword;
  }
  if (q.startMonth) c.startMonth = q.startMonth;

  if (q.occupation === UNSET) c.occupationUnset = true;
  else if (q.occupation) c.occupation = q.occupation;

  if (q.residence === UNSET) c.residenceUnset = true;
  else if (q.residence) c.residence = q.residence;

  if (q.travelCountry === UNSET) c.travelCountryUnset = true;
  else if (q.travelCountry) c.travelCountry = q.travelCountry;

  if (q.travelReason === UNSET) c.travelReasonUnset = true;
  else if (q.travelReason) c.travelReason = q.travelReason;

  if (q.orientStaffId) c.orientStaffId = q.orientStaffId;
  if (q.textbookIds && q.textbookIds.length > 0) c.textbookIds = q.textbookIds;

  const from = fmtDate(today);
  switch (q.travelDate) {
    case 'within3m':
      c.travelDateFrom = from;
      c.travelDateTo = fmtDate(addMonths(today, 3));
      break;
    case 'within6m':
      c.travelDateFrom = from;
      c.travelDateTo = fmtDate(addMonths(today, 6));
      break;
    case 'within12m':
      c.travelDateFrom = from;
      c.travelDateTo = fmtDate(addMonths(today, 12));
      break;
    case 'over12m':
      c.travelDateAfter = fmtDate(addMonths(today, 12));
      break;
    case UNSET:
      c.travelDateUnset = true;
      break;
  }
  return c;
}

/** 登録結果。仮パスワードはこの一度だけ平文で返す（コーチが会員へ伝える用）。 */
export interface RegisterResult {
  member: MemberDto;
  tempPassword: string;
}

/** 仮パスワードを生成（英数字8文字）。 */
function generateTempPassword(): string {
  return randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).padEnd(8, '0');
}

/**
 * Member ユースケース。
 * リポジトリからドメインを取得し、ドメイン操作（create/update）を行い、
 * 結果を UseCase 専用 DTO（MemberDto）で返す。
 */
export class MemberUseCase {
  constructor(private readonly members: MemberRepository) {}

  /** 1件取得 */
  async get(id: string): Promise<MemberDto | undefined> {
    const member = await this.members.findById(MemberId.create(id));
    return member ? toMemberDto(member) : undefined;
  }

  /** 一覧取得 */
  async list(): Promise<MemberDto[]> {
    const members = await this.members.findAll();
    return members.map(toMemberDto);
  }

  /** 一覧/検索（条件なし＝全件）。UIトークンを解決して検索する。 */
  async search(query: MemberListQuery = {}): Promise<MemberDto[]> {
    const criteria = toCriteria(query, new Date());
    const members = await this.members.search(criteria);
    return members.map(toMemberDto);
  }

  /**
   * 新規登録（ドメインのバリデーションは DomainError を throw）。
   * 仮パスワードはサーバーで生成し、認証情報として保存しつつ平文を一度だけ返す。
   */
  async register(input: CreateMemberInput): Promise<RegisterResult> {
    const tempPassword = generateTempPassword();
    const member = Member.create({
      ...input,
      password: tempPassword,
      requirePasswordChange: true,
    });
    await this.members.save(member);
    return { member: toMemberDto(member), tempPassword };
  }

  /** 更新（存在しなければ undefined） */
  async update(id: string, patch: UpdateMemberInput): Promise<MemberDto | undefined> {
    const existing = await this.members.findById(MemberId.create(id));
    if (!existing) return undefined;
    const updated = existing.update(patch);
    await this.members.save(updated);
    return toMemberDto(updated);
  }

  /** 継続プランを追加（applyGraduateDate=true で卒業予定日を終了日に反映）。会員保存トランザクションで永続化。 */
  async addContinuationPlan(
    memberId: string,
    input: { planType: string; months: number; startDate: string; note?: string },
    applyGraduateDate = false,
  ): Promise<MemberDto | undefined> {
    const member = await this.members.findById(MemberId.create(memberId));
    if (!member) return undefined;
    const plan = ContinuationPlan.create({ id: randomUUID(), ...input });
    const updated = member.addContinuationPlan(plan, applyGraduateDate);
    await this.members.save(updated);
    return toMemberDto(updated);
  }

  /** 継続プランを更新。 */
  async updateContinuationPlan(
    memberId: string,
    planId: string,
    input: { planType: string; months: number; startDate: string; note?: string },
    applyGraduateDate = false,
  ): Promise<MemberDto | undefined> {
    const member = await this.members.findById(MemberId.create(memberId));
    if (!member) return undefined;
    const plan = ContinuationPlan.create({ id: planId, ...input });
    const updated = member.updateContinuationPlan(plan, applyGraduateDate);
    await this.members.save(updated);
    return toMemberDto(updated);
  }

  /** 継続プランを削除。 */
  async removeContinuationPlan(memberId: string, planId: string): Promise<MemberDto | undefined> {
    const member = await this.members.findById(MemberId.create(memberId));
    if (!member) return undefined;
    const updated = member.removeContinuationPlan(ContinuationPlanId.create(planId));
    await this.members.save(updated);
    return toMemberDto(updated);
  }

  /** 途中退会にする（手動ステータス。存在しなければ undefined）。 */
  async withdraw(id: string): Promise<MemberDto | undefined> {
    const existing = await this.members.findById(MemberId.create(id));
    if (!existing) return undefined;
    const updated = existing.withdraw();
    await this.members.save(updated);
    return toMemberDto(updated);
  }

  /** 途中退会を取り消す（ステータスを日付からの自動算出へ戻す。存在しなければ undefined）。 */
  async reinstate(id: string): Promise<MemberDto | undefined> {
    const existing = await this.members.findById(MemberId.create(id));
    if (!existing) return undefined;
    const updated = existing.reinstate();
    await this.members.save(updated);
    return toMemberDto(updated);
  }

  /** 削除 */
  async remove(id: string): Promise<void> {
    await this.members.delete(MemberId.create(id));
  }
}
