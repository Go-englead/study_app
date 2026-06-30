import { Step, BeforeSuite, AfterSuite, BeforeScenario, AfterScenario } from 'gauge-ts';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { expect } from '@playwright/test';

// ── 設定 ───────────────────────────────────────────────────────────────────────
const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:8080'; // React フロント
const API_URL = process.env['API_URL'] ?? 'http://localhost:3000'; // テストデータ投入用
const HEADLESS = process.env['HEADLESS'] !== 'false';
const SLOW_MO = parseInt(process.env['SLOW_MO'] ?? '0', 10);

// 認証は実ログインAPIで取得（無敵JWTは廃止）。
// BeforeScenario で「ブートストラップ職員」としてAPIログインし、apiHeaders にトークンをセット。
// さらに各シナリオ専用の職員を1人作成し、その資格情報でUIログインする（1 spec = 1 職員）。
const BOOTSTRAP_STAFF = { email: 'coach_001@example.jp', password: 'coach001' };
let scenarioStaff = { email: '', password: '' };
let staffCounter = 0;

// ── ブラウザ状態 ────────────────────────────────────────────────────────────────
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
// 直近に表示されたダイアログ（alert/confirm）のメッセージ。データ整合性違反は alert で通知されるため捕捉する。
let lastDialogMessage = '';
const p = (): Page => {
  if (!page) throw new Error('page 未初期化');
  return page;
};

// ── API ヘルパ（テストデータ投入。dev トークンで API を直接叩く） ────────────────
const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json', Authorization: '' };

/** API 経由でログインして 'Bearer ...' を返す。 */
async function loginApi(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`ログイン失敗: ${res.status} ${await res.text()}`);
  return `Bearer ${((await res.json()) as { token: string }).token}`;
}

/** このシナリオ専用の職員を1人作成し、資格情報を返す（ブートストラップ職員の権限で作成）。 */
async function createScenarioStaff(): Promise<{ email: string; password: string }> {
  const n = ++staffCounter;
  const stamp = `${n}_${process.hrtime.bigint()}`;
  const email = `e2e_staff_${stamp}@example.jp`;
  const password = 'e2epass123';
  const res = await fetch(`${API_URL}/v1/admin/staff`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ staffCode: `E2E_${stamp}`, name: `E2Eコーチ${n}`, role: 'Coach', email, password }),
  });
  if (res.status !== 201) throw new Error(`職員作成失敗: ${res.status} ${await res.text()}`);
  return { email, password };
}

async function apiListMembers(): Promise<Array<{ id: string }>> {
  const res = await fetch(`${API_URL}/v1/admin/members`, { headers: apiHeaders });
  const body = (await res.json()) as { members?: Array<{ id: string }> };
  return body.members ?? [];
}
async function apiDeleteMember(id: string): Promise<void> {
  await fetch(`${API_URL}/v1/admin/members/${id}`, { method: 'DELETE', headers: apiHeaders });
}
async function apiCreateMember(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API_URL}/v1/admin/members`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(body),
  });
  if (res.status !== 201) throw new Error(`seed 失敗: ${res.status} ${await res.text()}`);
}

async function apiListStaff(): Promise<Array<{ id: string; staffCode: string }>> {
  const res = await fetch(`${API_URL}/v1/admin/staff`, { headers: apiHeaders });
  const body = (await res.json()) as { staff?: Array<{ id: string; staffCode: string }> };
  return body.staff ?? [];
}
async function apiDeleteStaff(id: string): Promise<void> {
  await fetch(`${API_URL}/v1/admin/staff/${id}`, { method: 'DELETE', headers: apiHeaders });
}
/** テストで作った職員（staffCode が E2E で始まる）を一掃。ブートストラップ S001 は残す。 */
async function cleanTestStaff(): Promise<void> {
  for (const s of await apiListStaff()) {
    if (s.staffCode.startsWith('E2E')) await apiDeleteStaff(s.id);
  }
}

// シナリオ前の基準データ（見本一郎を1人だけ）
const MIHON = {
  code: '10001',
  lastNameKanji: '見本',
  firstNameKanji: '一郎',
  lastNameKana: 'ミホン',
  firstNameKana: 'イチロウ',
  lastNameAlpha: 'Mihon',
  firstNameAlpha: 'Ichiro',
  email: 'student_10001@example.jp',
  plan: '6ヶ月プラン',
  initialClass: 'Beginner',
  currentClass: 'Beginner',
  nativecamp: '未選択',
  dailyTargetMinutes: 60,
};

/** 全会員を消して基準データだけにする（毎シナリオでクリーンな状態を作る）。 */
async function resetAndSeed(): Promise<void> {
  for (const m of await apiListMembers()) await apiDeleteMember(m.id);
  await apiCreateMember(MIHON);
  await cleanTestStaff();
}

// 検索 spec 用のテストデータ（10名）。氏名・ニックネーム・会員ID・職業・受講開始月で数件ヒットするよう設計。
const SEARCH_MEMBERS = [
  { code: '30001', last: '田中', first: '太郎', nick: 'たろちゃん', occupation: '会社員', startDate: '2026-04-10' },
  { code: '30002', last: '田中', first: '花子', nick: 'はなこ', occupation: '公務員', startDate: '2026-04-20' },
  { code: '30003', last: '田中', first: '次郎', nick: 'じろう', occupation: '会社員', startDate: '2026-05-01' },
  { code: '30004', last: '佐藤', first: '三郎', nick: 'さぶちゃん', occupation: '無職', startDate: '2026-03-15' },
  { code: '30005', last: '鈴木', first: '四郎', nick: 'すずき', occupation: '会社員', startDate: '2026-05-10' },
  { code: '30006', last: '高橋', first: '五郎', nick: 'ごろちゃん', occupation: '自営業・フリーランス', startDate: '2026-04-05' },
  { code: '30007', last: '渡辺', first: '六子', nick: 'わたなべ', occupation: '会社員', startDate: '2026-06-01' },
  { code: '30008', last: '伊藤', first: '七海', nick: 'いとう', occupation: '公務員', startDate: '2026-04-25' },
  { code: '30009', last: '山本', first: '八郎', nick: 'やまもと', occupation: '大学・大学院生', startDate: '2026-05-20' },
  { code: '30010', last: '中村', first: '九子', nick: 'なかむら', occupation: '無職', startDate: '2026-06-10' },
];

/** 全会員を消して検索用10名を投入する。 */
async function seedSearchMembers(): Promise<void> {
  for (const m of await apiListMembers()) await apiDeleteMember(m.id);
  for (const s of SEARCH_MEMBERS) {
    await apiCreateMember({
      code: s.code,
      lastNameKanji: s.last,
      firstNameKanji: s.first,
      lastNameKana: 'カナ',
      firstNameKana: 'カナ',
      lastNameAlpha: 'Alpha',
      firstNameAlpha: 'Alpha',
      nickname: s.nick,
      email: `m_${s.code}@example.jp`,
      occupation: s.occupation,
      startDate: s.startDate,
      plan: '6ヶ月プラン',
      initialClass: 'Beginner',
      currentClass: 'Beginner',
      nativecamp: '未選択',
      dailyTargetMinutes: 60,
    });
  }
}

// ── 教材（textbooks）API ヘルパ ──
async function apiListTextbooks(): Promise<Array<{ id: string }>> {
  const res = await fetch(`${API_URL}/v1/admin/textbooks`, { headers: apiHeaders });
  const body = (await res.json()) as { textbooks?: Array<{ id: string }> };
  return body.textbooks ?? [];
}
async function apiDeleteTextbook(id: string): Promise<void> {
  await fetch(`${API_URL}/v1/admin/textbooks/${id}`, { method: 'DELETE', headers: apiHeaders });
}
async function apiCreateTextbook(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API_URL}/v1/admin/textbooks`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(body),
  });
  if (res.status !== 201) throw new Error(`教材 seed 失敗: ${res.status} ${await res.text()}`);
}

const SEED_TEXTBOOKS = [
  { textbookCode: 'T01', name: 'キクタン Entry', category: '単語/フレーズ', unit: 'Day', color: '#2E86C1' },
  { textbookCode: 'T02', name: '起きてから寝るまで', category: '単語/フレーズ', unit: 'Chapter', color: '#2E86C1' },
  { textbookCode: 'T03', name: '中学英語をもう一度', category: '文法', unit: 'Lesson', color: '#1F618D' },
  { textbookCode: 'T04', name: 'マンスリーコーチング', category: 'コーチング', unit: '回', color: '#1A5276' },
  { textbookCode: 'T05', name: 'オンライン英会話', category: 'オンライン英会話', unit: '回', color: '#F39C12' },
];

/** 全教材を消して seed 5件にする（会員は BeforeScenario で消えているため FK 参照なし）。 */
async function seedTextbooks(): Promise<void> {
  for (const t of await apiListTextbooks()) await apiDeleteTextbook(t.id);
  for (const t of SEED_TEXTBOOKS) await apiCreateTextbook(t);
}

function tbField(name: string) {
  return p().getByTestId(`textbook-field-${name}`);
}
function textbookRow(code: string) {
  return p().getByTestId(`textbook-row-${code}`);
}

/** 一覧の各行の「氏名」（氏名 / ニックネーム セルの氏名部分・空白除去）一覧を取得。 */
async function currentRowNames(): Promise<string[]> {
  const rows = p().locator('[data-testid^="member-row-"]');
  const n = await rows.count();
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    const cell = await rows.nth(i).locator('td').nth(1).innerText();
    names.push(cell.split('/')[0].replace(/\s/g, ''));
  }
  return names.sort();
}

// 氏名から「空白を無視」した行ロケータ（表示名は「姓 名」、仕様文言は「姓名」のため）
function memberRow(name: string) {
  const re = new RegExp(name.replace(/\s/g, '').split('').join('\\s*'));
  return p().locator('[data-testid^="member-row-"]').filter({ hasText: re });
}

function field(name: string) {
  return p().getByTestId(`member-field-${name}`);
}

function staffField(name: string) {
  return p().getByTestId(`staff-field-${name}`);
}
async function setField(name: string, value: string): Promise<void> {
  const el = field(name);
  const tag = await el.evaluate((e) => e.tagName);
  if (tag === 'SELECT') await el.selectOption(value);
  else await el.fill(value);
}

// ── ライフサイクル ──────────────────────────────────────────────────────────────
export default class StepImpl {
  @BeforeSuite()
  public async beforeSuite(): Promise<void> {
    browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO });
  }

  @AfterSuite()
  public async afterSuite(): Promise<void> {
    await browser?.close();
  }

  @BeforeScenario()
  public async beforeScenario(): Promise<void> {
    // ブートストラップ職員でAPI認証 → データ投入 → このシナリオ専用の職員を作成
    apiHeaders.Authorization = await loginApi(BOOTSTRAP_STAFF.email, BOOTSTRAP_STAFF.password);
    await resetAndSeed();
    scenarioStaff = await createScenarioStaff();
    context = await browser!.newContext({ baseURL: BASE_URL });
    page = await context.newPage();
    lastDialogMessage = '';
    // ダイアログは自動承認（削除確認など）。メッセージは整合性違反 alert の検証用に記録する。
    page.on('dialog', (d) => {
      lastDialogMessage = d.message();
      d.accept().catch(() => {});
    });
  }

  @AfterScenario()
  public async afterScenario(): Promise<void> {
    await context?.close();
    context = null;
    page = null;
  }

  // ── ログイン（UI操作で実ログイン。各シナリオは専用職員でログインしてから開始する）──
  @Step('ログインページを開く')
  public async openLogin(): Promise<void> {
    await p().goto('/login');
    await expect(p().getByTestId('login-submit')).toBeVisible();
  }

  @Step('職員アカウントでログインする')
  public async loginAsScenarioStaff(): Promise<void> {
    await p().getByTestId('login-id').fill(scenarioStaff.email);
    await p().getByTestId('login-password').fill(scenarioStaff.password);
    await p().getByTestId('login-submit').click();
    await expect(p()).toHaveURL(/\/dashboard/);
  }

  // ── セッション失効 → ログイン画面遷移（401ハンドリング）──
  @Step('セッションを無効にする')
  public async invalidateSession(): Promise<void> {
    await p().evaluate(() => localStorage.setItem('staff_token', 'invalid.token.value'));
  }

  @Step('会員管理ページに直接アクセスする')
  public async gotoMembersDirect(): Promise<void> {
    await p().goto('/members');
  }

  @Step('ログイン画面が表示される')
  public async assertOnLogin(): Promise<void> {
    await expect(p()).toHaveURL(/\/login/);
    await expect(p().getByTestId('login-submit')).toBeVisible();
  }

  // ── ナビゲーション ──
  @Step('会員管理メニューをクリックする')
  public async clickMembersMenu(): Promise<void> {
    await p().getByRole('link', { name: '会員管理' }).click();
    await expect(p().getByTestId('members-table')).toBeVisible();
  }

  @Step('管理画面をリロードする')
  public async reload(): Promise<void> {
    await p().reload();
  }

  // ── 新規登録 ──
  @Step('新規会員登録ボタンをクリックする')
  public async openCreate(): Promise<void> {
    await p().getByTestId('member-create-open').click();
    await expect(p().getByTestId('member-modal')).toBeVisible();
  }

  @Step('新規会員フォームに最小限の情報を入力する')
  public async fillNewMember(): Promise<void> {
    await setField('code', '99990');
    await setField('lastNameKanji', 'テスト');
    await setField('firstNameKanji', '太郎');
    await setField('email', 'e2etest@example.jp');
    await setField('plan', '6ヶ月プラン');
    await setField('initialClass', 'Beginner');
    await setField('currentClass', 'Beginner');
    await setField('nativecamp', '未選択');
    await setField('dailyTargetMinutes', '60');
  }

  @Step('新規会員フォームを保存する')
  public async saveNewMember(): Promise<void> {
    await p().getByTestId('member-form-submit').click();
    await expect(p().getByTestId('member-modal')).toBeHidden();
  }

  // ── 一覧 ──
  @Step('会員一覧に <name> が表示される')
  public async assertRowVisible(name: string): Promise<void> {
    await expect(memberRow(name)).toBeVisible();
  }

  @Step('会員一覧に <name> が表示されない')
  public async assertRowHidden(name: string): Promise<void> {
    await expect(memberRow(name)).toHaveCount(0);
  }

  @Step('会員 <name> の行をクリックする')
  public async clickRow(name: string): Promise<void> {
    await memberRow(name).click();
    await expect(p().getByTestId('member-modal')).toBeVisible();
  }

  // ── 編集モーダル ──
  @Step('編集モーダルの <field> を <value> に変更する')
  public async changeField(name: string, value: string): Promise<void> {
    await expect(field(name)).toBeVisible();
    await setField(name, value);
  }

  @Step('編集モーダルを保存する')
  public async saveEdit(): Promise<void> {
    await p().getByTestId('member-form-submit').click();
    await expect(p().getByTestId('member-modal')).toBeHidden();
  }

  @Step('編集モーダルの <field> が <value> と表示される')
  public async assertField(name: string, value: string): Promise<void> {
    await expect(field(name)).toHaveValue(value);
  }

  // ── 削除（編集モーダル内） ──
  @Step('会員削除ボタンをクリックする')
  public async clickDelete(): Promise<void> {
    await p().getByTestId('member-delete').click();
    await expect(p().getByTestId('member-modal')).toBeHidden();
  }

  @Step('会員の途中退会を切り替える')
  public async toggleWithdrawn(): Promise<void> {
    // 確認ダイアログは自動承認される。
    await p().getByTestId('member-withdraw-toggle').click();
  }

  @Step('会員ステータスが <text> である')
  public async assertMemberStatus(text: string): Promise<void> {
    await expect(p().getByTestId('member-status')).toHaveText(text);
  }

  @Step('継続プラン追加ボタンをクリックする')
  public async openContinuationPlan(): Promise<void> {
    await p().getByTestId('cp-add-open').click();
    await expect(p().getByTestId('cp-modal')).toBeVisible();
  }

  @Step('継続プランフォームで種類 <planType> 期間 <months> 開始日 <startDate> を入力して保存する')
  public async submitContinuationPlan(planType: string, months: string, startDate: string): Promise<void> {
    await p().getByTestId('cp-field-planType').selectOption(planType);
    await p().getByTestId('cp-field-months').selectOption(months);
    await p().getByTestId('cp-field-startDate').fill(startDate);
    await p().getByTestId('cp-submit').click();
    await expect(p().getByTestId('cp-modal')).toBeHidden();
  }

  @Step('継続プラン履歴に種類 <planType> が表示される')
  public async assertContinuationPlanRow(planType: string): Promise<void> {
    await expect(p().getByTestId('cp-table')).toContainText(planType);
  }

  // ── 教材 ──
  @Step('教材データを準備する')
  public async prepareTextbooks(): Promise<void> {
    await seedTextbooks();
  }

  @Step('教材管理メニューをクリックする')
  public async clickTextbooksMenu(): Promise<void> {
    await p().getByRole('link', { name: '教材管理' }).click();
    await expect(p().getByTestId('textbooks-table')).toBeVisible();
  }

  @Step('教材一覧の件数が <count> 件である')
  public async assertTextbookCount(count: string): Promise<void> {
    await expect(p().locator('[data-testid^="textbook-row-"]')).toHaveCount(Number(count));
  }

  @Step('教材一覧に <codes> が表示される')
  public async assertTextbookRowsVisible(codes: string): Promise<void> {
    for (const code of codes.split(',').map((s) => s.trim())) {
      await expect(textbookRow(code)).toBeVisible();
    }
  }

  @Step('教材一覧に <code> が表示されない')
  public async assertTextbookRowHidden(code: string): Promise<void> {
    await expect(textbookRow(code)).toHaveCount(0);
  }

  @Step('教材追加ボタンをクリックする')
  public async openTextbookCreate(): Promise<void> {
    await p().getByTestId('textbook-create-open').click();
    await expect(p().getByTestId('textbook-modal')).toBeVisible();
  }

  @Step('教材フォームに最小限の情報を入力する')
  public async fillNewTextbook(): Promise<void> {
    await tbField('textbookCode').fill('T99');
    await tbField('name').fill('新規テスト教材');
    await tbField('category').fill('テストカテゴリ');
    await tbField('unit').selectOption('回');
  }

  @Step('教材フォームを保存する')
  public async saveTextbookForm(): Promise<void> {
    await p().getByTestId('textbook-form-submit').click();
    await expect(p().getByTestId('textbook-modal')).toBeHidden();
  }

  @Step('教材 <code> の行をクリックする')
  public async clickTextbookRow(code: string): Promise<void> {
    await textbookRow(code).click();
    await expect(p().getByTestId('textbook-modal')).toBeVisible();
  }

  @Step('教材 <code> の行に <text> が表示される')
  public async assertTextbookRowText(code: string, text: string): Promise<void> {
    await expect(textbookRow(code)).toContainText(text);
  }

  @Step('教材編集モーダルの <field> が <value> と表示される')
  public async assertTextbookField(field: string, value: string): Promise<void> {
    await expect(tbField(field)).toHaveValue(value);
  }

  @Step('教材編集モーダルの <field> を <value> に変更する')
  public async changeTextbookField(field: string, value: string): Promise<void> {
    const el = tbField(field);
    const tag = await el.evaluate((e) => e.tagName);
    if (tag === 'SELECT') await el.selectOption(value);
    else await el.fill(value);
  }

  @Step('教材編集モーダルを保存する')
  public async saveTextbookEdit(): Promise<void> {
    await p().getByTestId('textbook-form-submit').click();
    await expect(p().getByTestId('textbook-modal')).toBeHidden();
  }

  @Step('教材を削除する')
  public async deleteTextbook(): Promise<void> {
    await p().getByTestId('textbook-delete').click();
    await expect(p().getByTestId('textbook-modal')).toBeHidden();
  }

  // ── 教材割り当て（会員⨯教材） ──
  @Step('割り当て用の教材データを準備する')
  public async prepareAssignmentTextbooks(): Promise<void> {
    // 会員（見本一郎）は BeforeScenario で投入済み。2人目（見本二郎）と教材5件を用意する。
    await apiCreateMember({
      code: '10002',
      lastNameKanji: '見本',
      firstNameKanji: '二郎',
      lastNameKana: 'ミホン',
      firstNameKana: 'ジロウ',
      lastNameAlpha: 'Mihon',
      firstNameAlpha: 'Jiro',
      email: 'b10002@example.jp',
      plan: '6ヶ月プラン',
      initialClass: 'Beginner',
      currentClass: 'Beginner',
      nativecamp: '未選択',
      dailyTargetMinutes: 60,
    });
    await seedTextbooks();
  }

  @Step('割り当て会員リストに <name> が表示される')
  public async assertAssignMemberVisible(name: string): Promise<void> {
    const re = new RegExp(name.replace(/\s/g, '').split('').join('\\s*'));
    await expect(p().locator('[data-testid^="assign-member-"]').filter({ hasText: re })).toBeVisible();
  }

  @Step('会員への割り当てタブを開く')
  public async openAssignTab(): Promise<void> {
    await p().getByTestId('textbook-tab-assign').click();
    await expect(p().getByTestId('assign-members')).toBeVisible();
  }

  @Step('割り当て対象に会員 <name> を選択する')
  public async selectAssignMember(name: string): Promise<void> {
    const re = new RegExp(name.replace(/\s/g, '').split('').join('\\s*'));
    await p().locator('[data-testid^="assign-member-"]').filter({ hasText: re }).first().click();
    await expect(p().getByTestId('assign-main')).toBeVisible();
  }

  @Step('教材を割り当てボタンをクリックする')
  public async openAssignModal(): Promise<void> {
    await p().getByTestId('assign-open').click();
    await expect(p().getByTestId('assign-modal')).toBeVisible();
  }

  @Step('割り当てフォームで教材 <code> を目標 <minutes> 分・メモ <note> で割り当てる')
  public async submitAssign(code: string, minutes: string, note: string): Promise<void> {
    const sel = p().getByTestId('assign-textbook-select');
    const value = await sel.locator('option').filter({ hasText: code }).first().getAttribute('value');
    await sel.selectOption(value!);
    await p().getByTestId('assign-goal').fill(minutes);
    await p().getByTestId('assign-note').fill(note);
    await p().getByTestId('assign-submit').click();
    await expect(p().getByTestId('assign-modal')).toBeHidden();
  }

  @Step('割り当て一覧に教材 <code> が表示される')
  public async assertAssignmentVisible(code: string): Promise<void> {
    await expect(p().getByTestId(`assignment-row-${code}`)).toBeVisible();
  }

  @Step('割り当て一覧の教材 <code> に <text> が表示される')
  public async assertAssignmentRowText(code: string, text: string): Promise<void> {
    await expect(p().getByTestId(`assignment-row-${code}`)).toContainText(text);
  }

  @Step('割り当て一覧に教材 <code> が表示されない')
  public async assertAssignmentHidden(code: string): Promise<void> {
    await expect(p().getByTestId(`assignment-row-${code}`)).toHaveCount(0);
  }

  @Step('教材 <code> の割り当てを解除する')
  public async unassign(code: string): Promise<void> {
    await p().getByTestId(`assignment-unassign-${code}`).click();
    await expect(p().getByTestId(`assignment-row-${code}`)).toHaveCount(0);
  }

  @Step('教材を教材名 <name> で検索する')
  public async searchTextbookByName(name: string): Promise<void> {
    await p().getByTestId('textbook-search-name').fill(name);
    await p().getByTestId('textbook-search-submit').click();
  }

  @Step('教材をカテゴリ <category> で検索する')
  public async searchTextbookByCategory(category: string): Promise<void> {
    await p().getByTestId('textbook-search-category').fill(category);
    await p().getByTestId('textbook-search-submit').click();
  }

  // ── 検索 ──
  @Step('検索用に会員データを準備する')
  public async prepareSearchData(): Promise<void> {
    await seedSearchMembers();
  }

  @Step('氏名で <keyword> を検索する')
  public async searchByName(keyword: string): Promise<void> {
    await p().getByTestId('member-search-tab-name').click();
    await p().getByTestId('member-search-keyword').fill(keyword);
    await p().getByTestId('member-search-submit').click();
  }

  @Step('会員IDで <keyword> を検索する')
  public async searchByCode(keyword: string): Promise<void> {
    await p().getByTestId('member-search-tab-code').click();
    await p().getByTestId('member-search-keyword').fill(keyword);
    await p().getByTestId('member-search-submit').click();
  }

  @Step('詳細検索を開く')
  public async openSearchDetail(): Promise<void> {
    await p().getByTestId('member-search-detail-toggle').click();
    await expect(p().getByTestId('member-search-detail')).toBeVisible();
  }

  @Step('職業 <value> で絞り込む')
  public async filterByOccupation(value: string): Promise<void> {
    await p().getByTestId('member-search-occupation').selectOption(value);
    await p().getByTestId('member-search-submit').click();
  }

  @Step('受講開始月 <value> で絞り込む')
  public async filterByStartMonth(value: string): Promise<void> {
    await p().getByTestId('member-search-startMonth').selectOption(value);
    await p().getByTestId('member-search-submit').click();
  }

  @Step('会員一覧の件数が <count> 件である')
  public async assertRowCount(count: string): Promise<void> {
    await expect(p().locator('[data-testid^="member-row-"]')).toHaveCount(Number(count));
  }

  @Step('会員一覧に表示される会員は <names> である')
  public async assertRowNames(names: string): Promise<void> {
    const expected = names.split(',').map((s) => s.replace(/\s/g, '')).sort();
    // 件数一致を待ってから全行の氏名集合を突合（過不足なし＝集合一致）
    await expect(p().locator('[data-testid^="member-row-"]')).toHaveCount(expected.length);
    expect(await currentRowNames()).toEqual(expected);
  }

  // ── コーチング記録（会員カルテ） ──
  @Step('コーチング記録用のデータを準備する')
  public async prepareCoachingData(): Promise<void> {
    // 会員（見本一郎）は BeforeScenario で投入済み。教材5件を用意する。
    await seedTextbooks();
  }

  @Step('会員カルテメニューをクリックする')
  public async clickKarteMenu(): Promise<void> {
    await p().getByRole('link', { name: '会員カルテ' }).click();
    await expect(p().getByTestId('karte-members')).toBeVisible();
  }

  @Step('カルテで会員 <name> を選択する')
  public async selectKarteMember(name: string): Promise<void> {
    const re = new RegExp(name.replace(/\s/g, '').split('').join('\\s*'));
    await p().locator('[data-testid^="karte-member-"]').filter({ hasText: re }).first().click();
    await expect(p().getByTestId('coaching-card')).toBeVisible();
  }

  @Step('コーチングを記録ボタンをクリックする')
  public async openCoachingModal(): Promise<void> {
    await p().getByTestId('coaching-add').click();
    await expect(p().getByTestId('cr-modal')).toBeVisible();
  }

  @Step('コーチング種別を <type> にする')
  public async selectCoachingType(type: string): Promise<void> {
    await p().getByTestId('cr-type').selectOption(type);
  }

  @Step('教材選定に教材 <code> を目標 <minutes> 分・メモ <note> で追加する')
  public async addSelectionTextbook(code: string, minutes: string, note: string): Promise<void> {
    await p().getByTestId('cr-selection-add').click();
    const sel = p().getByTestId('cr-selection-textbook-0');
    const value = await sel.locator('option').filter({ hasText: code }).first().getAttribute('value');
    await sel.selectOption(value!);
    await p().getByTestId('cr-selection-goal-0').fill(minutes);
    await p().getByTestId('cr-selection-note-0').fill(note);
  }

  @Step('コーチング記録を保存する')
  public async saveCoaching(): Promise<void> {
    await p().getByTestId('cr-submit').click();
    await expect(p().getByTestId('cr-modal')).toBeHidden();
  }

  @Step('コーチング記録を保存しようとする')
  public async trySaveCoaching(): Promise<void> {
    await p().getByTestId('cr-submit').click();
  }

  @Step('コーチング記録一覧に <text> が表示される')
  public async assertCoachingListContains(text: string): Promise<void> {
    await expect(p().getByTestId('coaching-card').locator('.cr-table')).toContainText(text);
  }

  @Step('コーチング記録のエラーに <text> が表示される')
  public async assertCoachingError(text: string): Promise<void> {
    // データ整合性違反（オリエン前提・削除制約など）は alert で通知される。
    await expect.poll(() => lastDialogMessage, { timeout: 5000 }).toContain(text);
  }

  @Step('テスト内容で教材 <code> を実施済み・点数 <score>・次回 <next> にする')
  public async fillTestContent(code: string, score: string, next: string): Promise<void> {
    // テスト行は index 付き testid。教材コードで行を特定し、その行内の要素を操作する。
    const row = p().locator('[data-testid^="cr-test-row-"]').filter({ hasText: code });
    await row.locator('[data-testid^="cr-test-status-"]').selectOption('実施済み');
    await row.locator('[data-testid^="cr-test-score-"]').fill(score);
    await row.locator('[data-testid^="cr-test-next-"]').selectOption(next);
  }

  @Step('テスト内容に新教材 <code> を追加する')
  public async addNewTestTextbook(code: string): Promise<void> {
    const sel = p().getByTestId('cr-new-textbook-select');
    const value = await sel.locator('option').filter({ hasText: code }).first().getAttribute('value');
    await sel.selectOption(value!);
    await p().getByTestId('cr-new-textbook-add').click();
    await expect(p().locator('[data-testid^="cr-test-row-"]').filter({ hasText: code })).toBeVisible();
  }

  @Step('月次振り返りに <text> と入力する')
  public async fillMonthlyReview(text: string): Promise<void> {
    await p().getByTestId('cr-monthlyReview').fill(text);
  }

  @Step('コーチング記録一覧の <type> を編集する')
  public async editCoachingByType(type: string): Promise<void> {
    const row = p().locator('[data-testid^="coaching-row-"]').filter({ hasText: type }).first();
    await row.getByRole('button', { name: '編集' }).click();
    await expect(p().getByTestId('cr-modal')).toBeVisible();
  }

  @Step('コーチング記録を削除する')
  public async deleteCoaching(): Promise<void> {
    // confirm() は @BeforeScenario で自動承認済み。
    await p().getByTestId('cr-delete').click();
    await expect(p().getByTestId('cr-modal')).toBeHidden();
  }

  @Step('コーチング記録一覧に <text> が表示されない')
  public async assertCoachingListNotContains(text: string): Promise<void> {
    await expect(p().getByTestId('coaching-card')).not.toContainText(text);
  }

  @Step('共有事項に <text> と入力する')
  public async fillSharedNote(text: string): Promise<void> {
    await p().getByTestId('cr-sharedNote').fill(text);
  }

  @Step('自由記述を 振り返り <review> ・アドバイス <advice> ・その他 <other> で入力する')
  public async fillFreeText(review: string, advice: string, other: string): Promise<void> {
    await p().getByTestId('cr-monthlyReview').fill(review);
    await p().getByTestId('cr-coachAdvice').fill(advice);
    await p().getByTestId('cr-otherNotes').fill(other);
  }

  @Step('テスト内容で教材 <code> を 範囲 <range> ・形式 <format> ・点数 <score> ・備考 <note> ・次回 <next> で実施済みにする')
  public async fillTestContentFull(
    code: string,
    range: string,
    format: string,
    score: string,
    note: string,
    next: string,
  ): Promise<void> {
    const row = p().locator('[data-testid^="cr-test-row-"]').filter({ hasText: code });
    await row.locator('[data-testid^="cr-test-status-"]').selectOption('実施済み');
    await row.locator('[data-testid^="cr-test-range-"]').fill(range);
    await row.locator('[data-testid^="cr-test-format-"]').fill(format);
    await row.locator('[data-testid^="cr-test-score-"]').fill(score);
    await row.locator('[data-testid^="cr-test-note-"]').fill(note);
    await row.locator('[data-testid^="cr-test-next-"]').selectOption(next);
  }

  @Step('編集中のコーチングの <field> が <value> である')
  public async assertCoachingField(field: string, value: string): Promise<void> {
    const map: Record<string, string> = {
      実施日: 'cr-date',
      担当コーチ: 'cr-coachName',
      月次振り返り: 'cr-monthlyReview',
      アドバイス: 'cr-coachAdvice',
      その他: 'cr-otherNotes',
      共有事項: 'cr-sharedNote',
    };
    const tid = map[field];
    if (!tid) throw new Error(`不明なフィールド: ${field}`);
    await expect(p().getByTestId(tid)).toHaveValue(value);
  }

  @Step('コーチング記録を削除しようとする')
  public async tryDeleteCoaching(): Promise<void> {
    await p().getByTestId('cr-delete').click();
  }

  @Step('コーチング記録モーダルを閉じる')
  public async closeCoachingModal(): Promise<void> {
    await p().getByTestId('cr-close').click();
    await expect(p().getByTestId('cr-modal')).toBeHidden();
  }

  // ── 学習記録（カルテ） ──
  @Step('カルテ用のデータを準備する')
  public async prepareKarteData(): Promise<void> {
    await seedTextbooks();
  }

  @Step('学習記録を追加ボタンをクリックする')
  public async openLogModal(): Promise<void> {
    await p().getByTestId('log-add-open').click();
    await expect(p().getByTestId('log-modal')).toBeVisible();
  }

  @Step('学習記録フォームで教材 <code> を <minutes> 分・コメント <comment> で追加する')
  public async submitLog(code: string, minutes: string, comment: string): Promise<void> {
    const sel = p().getByTestId('log-textbook');
    const value = await sel.locator('option').filter({ hasText: code }).first().getAttribute('value');
    await sel.selectOption(value!);
    await p().getByTestId('log-minutes').fill(minutes);
    await p().getByTestId('log-comment').fill(comment);
    await p().getByTestId('log-submit').click();
    await expect(p().getByTestId('log-modal')).toBeHidden();
  }

  @Step('学習記録一覧に <text> が表示される')
  public async assertLogListContains(text: string): Promise<void> {
    await expect(p().getByTestId('learning-logs-card').locator('.log-table')).toContainText(text);
  }

  @Step('達成サマリーの学習時間に <text> が表示される')
  public async assertSummaryHours(text: string): Promise<void> {
    await expect(p().getByTestId('summary-hours')).toContainText(text);
  }

  // ── PROGOSスコア（カルテ） ──
  @Step('PROGOSスコアを登録ボタンをクリックする')
  public async openProgosModal(): Promise<void> {
    await p().getByTestId('progos-add-open').click();
    await expect(p().getByTestId('progos-modal')).toBeVisible();
  }

  @Step('PROGOSフォームで総合 <overall> ・やり取り <interaction> で登録する')
  public async submitProgos(overall: string, interaction: string): Promise<void> {
    await p().getByTestId('progos-overall').selectOption(overall);
    await p().getByTestId('progos-skill-interaction').selectOption(interaction);
    await p().getByTestId('progos-submit').click();
    await expect(p().getByTestId('progos-modal')).toBeHidden();
  }

  @Step('PROGOS一覧に総合 <overall> が表示される')
  public async assertProgosListContains(overall: string): Promise<void> {
    await expect(p().getByTestId('progos-card').locator('.progos-table')).toContainText(overall);
  }

  // ── バリデーション（共通） ─────────────────────────────────────────────────────
  // フィールド単位のバリデーションエラーは各フィールド下に赤文字（data-testid="<feature>-error-<field>"）で表示される。
  @Step('ボタン <testid> を押す')
  public async clickByTestId(testid: string): Promise<void> {
    await p().getByTestId(testid).click();
  }

  @Step('フォームエラー <testid> が表示される')
  public async assertFieldError(testid: string): Promise<void> {
    await expect(p().getByTestId(testid)).toBeVisible();
  }

  // ── スタッフ管理 ──────────────────────────────────────────────────────────────
  @Step('スタッフ管理メニューをクリックする')
  public async clickStaffMenu(): Promise<void> {
    await p().getByRole('link', { name: 'スタッフ管理' }).click();
    await expect(p().getByTestId('staff-table-card')).toBeVisible();
  }

  @Step('新規スタッフ登録ボタンをクリックする')
  public async openStaffCreate(): Promise<void> {
    await p().getByTestId('staff-create-open').click();
    await expect(p().getByTestId('staff-modal')).toBeVisible();
  }

  @Step('スタッフフォームに社員ID <code> 氏名 <name> 役割 <role> メール <email> パスワード <password> を入力する')
  public async fillStaffForm(code: string, name: string, role: string, email: string, password: string): Promise<void> {
    await staffField('staffCode').fill(code);
    await staffField('name').fill(name);
    await staffField('role').selectOption({ label: role });
    await staffField('email').fill(email);
    await staffField('password').fill(password);
  }

  @Step('スタッフフォームを保存する')
  public async saveStaff(): Promise<void> {
    await p().getByTestId('staff-submit').click();
    await expect(p().getByTestId('staff-modal')).toBeHidden();
  }

  @Step('スタッフ一覧の <code> に <name> が表示される')
  public async assertStaffRowVisible(code: string, name: string): Promise<void> {
    await expect(p().getByTestId(`staff-row-${code}`)).toContainText(name);
  }

  @Step('スタッフ一覧に <code> が表示されない')
  public async assertStaffRowHidden(code: string): Promise<void> {
    await expect(p().getByTestId(`staff-row-${code}`)).toHaveCount(0);
  }

  @Step('スタッフを <keyword> で検索する')
  public async searchStaff(keyword: string): Promise<void> {
    // 入力（onChange）で debounce 検索が走る。結果の検証は後続ステップの自動リトライで待つ。
    await p().getByTestId('staff-search').fill(keyword);
  }

  @Step('スタッフ <code> の編集を開く')
  public async openStaffEdit(code: string): Promise<void> {
    await p().getByTestId(`staff-edit-${code}`).click();
    await expect(p().getByTestId('staff-modal')).toBeVisible();
  }

  @Step('編集中スタッフの役割を <role> に変更しメールを <email> に変更する')
  public async editStaffRoleEmail(role: string, email: string): Promise<void> {
    await staffField('role').selectOption({ label: role });
    await staffField('email').fill(email);
  }

  @Step('スタッフ編集を保存する')
  public async saveStaffEdit(): Promise<void> {
    await p().getByTestId('staff-submit').click();
    await expect(p().getByTestId('staff-modal')).toBeHidden();
  }

  @Step('編集中スタッフの役割が <role> メールが <email> と表示される')
  public async assertStaffEditValues(role: string, email: string): Promise<void> {
    await expect(staffField('role')).toHaveValue(roleValue(role));
    await expect(staffField('email')).toHaveValue(email);
  }

  @Step('スタッフ削除ボタンをクリックする')
  public async deleteStaff(): Promise<void> {
    await p().getByTestId('staff-delete').click();
    await expect(p().getByTestId('staff-modal')).toBeHidden();
  }

  @Step('スタッフ <code> 氏名 <name> 役割 <role> メール <email> パスワード <password> をAPIで作成する')
  public async createStaffViaApi(code: string, name: string, role: string, email: string, password: string): Promise<void> {
    const res = await fetch(`${API_URL}/v1/admin/staff`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ staffCode: code, name, role, email, password }),
    });
    if (res.status !== 201) throw new Error(`スタッフ作成失敗: ${res.status} ${await res.text()}`);
  }

  @Step('メール <email> パスワード <password> でログインを試みる')
  public async attemptLogin(email: string, password: string): Promise<void> {
    await p().getByTestId('login-id').fill(email);
    await p().getByTestId('login-password').fill(password);
    await p().getByTestId('login-submit').click();
  }

  @Step('ログインが拒否される')
  public async assertLoginRejected(): Promise<void> {
    await expect(p()).not.toHaveURL(/\/dashboard/);
    await expect(p().getByTestId('login-error')).toBeVisible();
  }
}

/** 役割の表示ラベル → select の value（ロール識別子）。 */
function roleValue(label: string): string {
  const map: Record<string, string> = {
    コーチ: 'Coach',
    講師: 'Teacher',
    コンサルタント: 'Consultant',
    CS: 'CS',
    運営: 'Staff',
  };
  return map[label] ?? label;
}
