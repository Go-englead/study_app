import { Step, BeforeSuite, AfterSuite, BeforeScenario, AfterScenario } from 'gauge-ts';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { expect } from '@playwright/test';

// ── 設定 ───────────────────────────────────────────────────────────────────────
const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:8080'; // React フロント
const API_URL = process.env['API_URL'] ?? 'http://localhost:3000'; // テストデータ投入用
const HEADLESS = process.env['HEADLESS'] !== 'false';
const SLOW_MO = parseInt(process.env['SLOW_MO'] ?? '0', 10);

// 開発用 admin JWT（フロントと同じ。secret 'test-key' / claim {adminId} / 期限ほぼ無限）
const ADMIN_BEARER =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiTVcwMDEiLCJleHAiOjQxMDI0NDQ4MDB9.avt56lg_LrJVbBEu8iq4SQN6E0l3uMuQcQCug-YP-eQ';

// ── ブラウザ状態 ────────────────────────────────────────────────────────────────
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
const p = (): Page => {
  if (!page) throw new Error('page 未初期化');
  return page;
};

// ── API ヘルパ（テストデータ投入。dev トークンで API を直接叩く） ────────────────
const apiHeaders = { 'Content-Type': 'application/json', Authorization: ADMIN_BEARER };

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
    await resetAndSeed();
    context = await browser!.newContext({ baseURL: BASE_URL });
    page = await context.newPage();
    // confirm() は自動承認（削除確認など）
    page.on('dialog', (d) => d.accept().catch(() => {}));
  }

  @AfterScenario()
  public async afterScenario(): Promise<void> {
    await context?.close();
    context = null;
    page = null;
  }

  // ── ログイン（React は開発用トークン認証のためログインUIは無い。
  //    "開く" はアプリ起点へ遷移、ID/PW入力とボタン押下は no-op） ──
  @Step('ログインページを開く')
  public async openLogin(): Promise<void> {
    await p().goto('/');
    await expect(p()).toHaveURL(/\/dashboard/);
  }

  @Step('ログインIDに <email> を入力する')
  public async fillLoginId(_email: string): Promise<void> {
    /* React: ログインUIなし（dev トークン認証）。仕様維持のため no-op */
  }

  @Step('パスワードに <password> を入力する')
  public async fillPassword(_password: string): Promise<void> {
    /* no-op */
  }

  @Step('ログインボタンを押す')
  public async clickLogin(): Promise<void> {
    /* no-op（既に認証済み） */
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
}
