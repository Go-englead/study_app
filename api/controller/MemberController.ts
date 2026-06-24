import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { MemberUseCase } from '../usecase/member/MemberUseCase';
import { MemberDto } from '../usecase/member/MemberDto';
import {
  CreateMemberInput,
  UpdateMemberInput,
  NativecampStatus,
  EnglishScores,
} from '../domain/member/member';

// OpenAPI から自動生成した型
type MemberResponse = components['schemas']['Member'];
type MemberSummaryResponse = components['schemas']['MemberSummary'];
type MemberInputBody = components['schemas']['MemberInput'];

// ───────── リクエスト（flat な client 形）→ ドメイン入力 へマッピング ─────────
function toEnglishScores(b: MemberInputBody): EnglishScores | undefined {
  const e: EnglishScores = {
    toeicLR: b.scoreToeicLR,
    toeicSW: b.scoreToeicSW,
    toefl: b.scoreToefl,
    ielts: b.scoreIelts,
    eiken: b.scoreEiken,
    other: b.scoreOther,
  };
  return Object.values(e).some((v) => v !== undefined && v !== null && v !== '') ? e : undefined;
}

function toTravel(b: MemberInputBody) {
  if (!(b.travelCountry || b.travelCity || b.travelDate || b.travelReason || b.travelNote)) {
    return undefined;
  }
  return {
    country: b.travelCountry,
    city: b.travelCity,
    travelDate: b.travelDate,
    reason: b.travelReason,
    note: b.travelNote,
  };
}

/** 担当スタッフID。空文字・"OTHER" は「割り当てなし」= undefined に倒す。 */
function staffIdOrUndefined(v: string | undefined): string | undefined {
  if (!v || v === 'OTHER') return undefined;
  return v;
}

function hasNameFields(b: MemberInputBody): boolean {
  return Boolean(
    b.lastNameKanji ||
      b.firstNameKanji ||
      b.lastNameKana ||
      b.firstNameKana ||
      b.lastNameAlpha ||
      b.firstNameAlpha ||
      b.nickname,
  );
}

function toNameInput(b: MemberInputBody) {
  return {
    lastNameKanji: b.lastNameKanji ?? '',
    firstNameKanji: b.firstNameKanji ?? '',
    lastNameKana: b.lastNameKana ?? '',
    firstNameKana: b.firstNameKana ?? '',
    lastNameAlpha: b.lastNameAlpha ?? '',
    firstNameAlpha: b.firstNameAlpha ?? '',
    nickname: b.nickname,
  };
}

function toCreateInput(b: MemberInputBody): CreateMemberInput {
  return {
    id: randomUUID(), // UUID はアプリ側で採番
    code: b.code ?? '', // 会員番号（業務コード）
    name: toNameInput(b),
    email: b.email ?? '',
    plan: b.plan ?? '',
    // status は日付から計算するため、手動でしか決まらない「途中退会」のみ反映
    manualStatusOverride: b.status === '途中退会' ? '途中退会' : undefined,
    enrollmentDate: b.enrollmentDate,
    startDate: b.startDate,
    graduateDate: b.graduateDate,
    initialClass: b.initialClass ?? '',
    currentClass: b.currentClass ?? '',
    nativecamp: b.nativecamp as NativecampStatus | undefined,
    dailyTargetMinutes: b.dailyTargetMinutes ?? 0,
    gender: b.gender,
    birthDate: b.birthDate,
    phone: b.phone,
    occupation: b.occupation,
    occupationNote: b.occupationNote,
    residence: b.residence,
    residenceOverseas: b.residenceOverseas,
    travel: toTravel(b),
    englishScores: toEnglishScores(b),
    coachLearningGoal: b.coachLearningGoal,
    note: b.note,
    consultantStaffId: staffIdOrUndefined(b.consultantStaffId),
    csStaffId: staffIdOrUndefined(b.csStaffId),
    orientStaffId: staffIdOrUndefined(b.orientStaffId),
  };
}

function toUpdateInput(b: MemberInputBody): UpdateMemberInput {
  const patch: UpdateMemberInput = {
    email: b.email,
    plan: b.plan,
    enrollmentDate: b.enrollmentDate,
    startDate: b.startDate,
    graduateDate: b.graduateDate,
    initialClass: b.initialClass,
    currentClass: b.currentClass,
    nativecamp: b.nativecamp as NativecampStatus | undefined,
    dailyTargetMinutes: b.dailyTargetMinutes,
    gender: b.gender,
    birthDate: b.birthDate,
    phone: b.phone,
    occupation: b.occupation,
    occupationNote: b.occupationNote,
    residence: b.residence,
    residenceOverseas: b.residenceOverseas,
    coachLearningGoal: b.coachLearningGoal,
    note: b.note,
    consultantStaffId: staffIdOrUndefined(b.consultantStaffId),
    csStaffId: staffIdOrUndefined(b.csStaffId),
    orientStaffId: staffIdOrUndefined(b.orientStaffId),
  };
  if (hasNameFields(b)) patch.name = toNameInput(b);
  const travel = toTravel(b);
  if (travel) patch.travel = travel;
  const scores = toEnglishScores(b);
  if (scores) patch.englishScores = scores;
  if (b.status === '途中退会') patch.manualStatusOverride = '途中退会';
  return patch;
}

// ───────── ダミーデータ（機能未実装の 4.継続プラン履歴 / 5.休会管理 用） ─────────
// TODO: 継続プラン機能・休会機能の実装時に実データへ差し替える。
const DUMMY_CONTINUATION_PLANS: components['schemas']['ContinuationPlanHistoryItem'][] = [
  {
    id: '00000000-0000-0000-0000-0000000000c1',
    planType: '給付金6ヶ月プラン',
    months: 6,
    startDate: '2026-01-10',
    endDate: '2026-07-10',
    note: 'ダミーデータ',
  },
];
const DUMMY_SUSPENSION: components['schemas']['Suspension'] = {
  suspendedFrom: '2026-03-01',
  suspendedUntil: '2026-03-31',
  graduateDate: '2026-08-10',
  preSuspendGraduateDate: '2026-07-10',
};

// ───────── DTO → Response 変換 ─────────
function toSummaryResponse(dto: MemberDto): MemberSummaryResponse {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    nickname: dto.nickname,
    status: dto.status,
    plan: dto.plan,
    startDate: dto.startDate,
    graduateDate: dto.graduateDate,
    currentClass: dto.currentClass,
    // TODO(ダミー): 学習記録・ログイン履歴の集計が未実装のため固定のダミー値を返す。
    // learning_logs / ログイン履歴を実装したら実値へ差し替える。
    achievementRate: 65,
    monthlyHours: 38,
    streak: 7,
    lastLoginAt: '2026-06-01T09:00:00.000Z',
  };
}

function toMemberResponse(dto: MemberDto): MemberResponse {
  return {
    ...toSummaryResponse(dto),
    initial: dto.initial,
    // 編集フォームのプリセット用 氏名6分割
    lastNameKanji: dto.lastNameKanji,
    firstNameKanji: dto.firstNameKanji,
    lastNameKana: dto.lastNameKana,
    firstNameKana: dto.firstNameKana,
    lastNameAlpha: dto.lastNameAlpha,
    firstNameAlpha: dto.firstNameAlpha,
    email: dto.email,
    gender: dto.gender,
    birthDate: dto.birthDate,
    phone: dto.phone,
    occupation: dto.occupation,
    occupationNote: dto.occupationNote,
    residence: dto.residence,
    residenceOverseas: dto.residenceOverseas,
    enrollmentDate: dto.enrollmentDate,
    orientStaffId: dto.orientStaffId,
    initialClass: dto.initialClass,
    nativecamp: dto.nativecamp,
    dailyTargetMinutes: dto.dailyTargetMinutes,
    travelCountry: dto.travelCountry,
    travelCity: dto.travelCity,
    travelDate: dto.travelDate,
    travelReason: dto.travelReason,
    travelNote: dto.travelNote,
    englishScores: dto.englishScores,
    coachLearningGoal: dto.coachLearningGoal,
    note: dto.note,
    consultantStaffId: dto.consultantStaffId,
    csStaffId: dto.csStaffId,
  };
}

/**
 * Member の Controller。OpenAPI のパスに合わせてルーティングし、
 * UseCase を呼んで DTO を取得 → 生成 Response 型へ変換して返す。
 */
export function registerMemberRoutes(app: Hono<any>, usecase: MemberUseCase): void {
  // GET /members（クエリで絞り込み。条件なし＝全件。保存列ベースの条件のみ対応）
  app.get('/members', async (c) => {
    const q = c.req.query();
    const dtos = await usecase.search({
      keyword: q.keyword,
      keywordType: q.keywordType,
      startMonth: q.startMonth,
      occupation: q.occupation,
      residence: q.residence,
      orientStaffId: q.orientStaffId,
      travelCountry: q.travelCountry,
      travelReason: q.travelReason,
      travelDate: q.travelDate,
      textbookIds: c.req.queries('textbookId'), // 複数指定（OR）
    });
    const body: { members: MemberSummaryResponse[] } = {
      members: dtos.map(toSummaryResponse),
    };
    return c.json(body);
  });

  // GET /members/{memberId}（カルテ／編集プリセット）
  app.get('/members/:memberId', async (c) => {
    const dto = await usecase.get(c.req.param('memberId'));
    if (!dto) return c.json({ message: '会員が見つかりません' }, 404);
    // 4.継続プラン履歴 / 5.休会管理 は機能未実装のためダミーを返す（実装時に実データへ）。
    return c.json({
      ...toMemberResponse(dto),
      continuationPlans: DUMMY_CONTINUATION_PLANS,
      suspension: DUMMY_SUSPENSION,
    });
  });

  // POST /members
  app.post('/members', async (c) => {
    const body = (await c.req.json()) as MemberInputBody;
    // createMember が検証（DomainError → onError）。仮PWはサーバー生成され tempPassword で返る。
    const { member, tempPassword } = await usecase.register(toCreateInput(body));
    return c.json({ ...toMemberResponse(member), tempPassword }, 201);
  });

  // PUT /members/{memberId}
  app.put('/members/:memberId', async (c) => {
    const body = (await c.req.json()) as MemberInputBody;
    const dto = await usecase.update(c.req.param('memberId'), toUpdateInput(body));
    if (!dto) return c.json({ message: '会員が見つかりません' }, 404);
    return c.json(toMemberResponse(dto));
  });

  // DELETE /members/{memberId}
  app.delete('/members/:memberId', async (c) => {
    await usecase.remove(c.req.param('memberId'));
    return c.body(null, 204);
  });
}
