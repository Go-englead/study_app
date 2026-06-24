# study_app プロジェクト運用ルール

このファイルは `/Users/gotsukino/Desktop/study_app/` プロジェクトでの作業時に、Claude が **自動的に読み込む** プロジェクト固有の運用ルールです。グローバル CLAUDE.md のルールに追加する形で機能します。

---

## 📍 プロジェクト情報

- **名称**：study_app（英語コーチング用 学習管理アプリ・サンプル版）
- **GitHub リポジトリ**：https://github.com/Go-englead/study_app
- **公開URL**：https://go-englead.github.io/study_app/
- **ログイン画面URL**：https://go-englead.github.io/study_app/login.html
- **運用方式**：GitHub 管理、GitHub Pages で公開
- **現在の移行**：localStorage ベースの旧 client（`admin.html` 等）から、バックエンドAPI＋React フロントへ段階移行中。

---

## 🏛 アーキテクチャ規約（バックエンド `api/`）

本プロジェクトは **関数型 DDD（ドメイン駆動設計）** で実装する。レイヤリング：**driver → gateway → usecase → controller**＋**ドメイン**（`domain/`）。

> **ドメイン設計の正典は [`api/domain/README.md`](api/domain/README.md)**（集約マップ・集約ルート・値オブジェクト・不変条件）。**ドメインを新規/変更する前に必ず参照**し、整合させること。

### ドメイン層の規約（DDD）
- **集約ごとに `domain/<aggregate>/` を切る**：`xxx.ts`（集約＋`createXxx`/`updateXxx`）と `xxx-repository.ts`（**Repository interface はドメイン層に置く**。実装は `gateway/`）。
- **識別子は branded type**（`Brand<string, 'XxxId'>`）。`createXxxId()` で生成。
- **id=UUID（サロゲート）＋ 業務コード（自然キー・ユーザー入力・UNIQUE）の二本立て**。例：`Member.id`(UUID)/`Member.code`、`Textbook.id`(UUID)/`Textbook.code`(T01)。画面・CSV の "ID" は業務コードを指すことが多い（DBの真のPKは別UUID）。
- **値オブジェクトは smart constructor**（`createXxx`）で生成時に検証。readonly interface。不正は `throw DomainError`（→ controller で 400）。タイプ違いは判別共用体。
- 計算値は **compute-on-read**（保存しない。例：会員ステータス）。

### その他
- **契約は `api/openapi.yaml`**。変更したら `pnpm openapi:gen` で型再生成（フロントも `frontend` 側で再生成）。
- **usecase**：Repository からドメイン取得 → 操作 → **UseCase専用DTO** を返す。
- **driver**：Drizzle で Row 取得／upsert。**gateway** が Row⇔ドメイン変換。

### DB 設計ルール（`api/db/`）
- **PK は全て UUID**。加えて業務コード（`member_code` 等）を自然キーとして UNIQUE 保持。
- **サロゲートキーを無闇に使わない**。ジャンクションは複合PK（例 `member_staff_assignments (member_id, role)`、`textbook_assignments (member_id, textbook_id)`）。
- **画面のセクション単位でサテライト分割**。members は本体（基本情報）＋ `member_contacts`／`member_enrollments`／`member_residence_travels`／`member_english_scores`／`member_coach_inputs`／`member_staff_assignments`（担当ジャンクション）／`member_credentials`（認証）に分割。**全サテライトは PK=member_id・1:1・FK CASCADE**。
- **認証情報は別テーブル**（`member_credentials`／`staff_credentials`、PK=FK）。
- enum は CHECK 制約。FK は CASCADE（子）/ RESTRICT（マスタ参照）。

### ドメインの重要な決定
- **ステータスは compute-on-read**（保存しない）。日付（受講開始・卒業・休会）から算出。例外＝「途中退会」のみ `manual_status_override` に保存。**休会の時限ステータス更新・卒業日延長は後回し（未実装）**。
- **担当者は staff への FK ジャンクション**（role＝`Consultant`/`CS`/`Orient`）。フォームの「その他」＝`"OTHER"` は**行を作らない**（NULL行も作らない）。
- **仮パスワードはサーバー生成**し、登録レスポンスで一度だけ平文返却（`tempPassword`）。リクエストには含めない。

### 認証
- JWT ミドルウェアで `/v1/member/*`（会員）と `/v1/admin/*`（職員）を分離。claim は `memberId` / `adminId`。
- **当面は開発用固定トークン**（secret `test-key`・期限ほぼ無限）。ログインAPIは未実装。

---

## 🖥 フロントエンド規約（`frontend/`）

- **bulletproof-react 構成**：`app/`（provider・router・routes）／`lib/`（api-client・react-query）／`config/`（env）／`features/<name>/`（api・components・schemas・types）／`types/`（生成型）。
- **スタック**：Vite + React + TS / TanStack Query / **TanStack Router（file-based・`app/routes`）** / react-hook-form + zod / **openapi-fetch**（型は `openapi.yaml` から `openapi-typescript` 生成）。
- **UIは必ず既存 client に合わせる**（→ Skill `reproduce-client-screen`）。単一ページ＋左サイドバー6タブ（タブ=ルート）、**新規=中央モーダル／編集=スライドパネル**。
- **E2E 用に `data-testid` を付与**（フォームは `member-field-<name>` 等）。
- 認証は `config/env.ts` の開発用トークン。

---

## 🧪 テスト規約

- **API 結合テスト**：Testcontainers + Vitest。実行は `pnpm test`（`TESTCONTAINERS_RYUK_DISABLED=true` 済み）。**テストデータは Drizzle で投入**（生SQL書かない）、**分割テーブルそれぞれを検証**。
- **E2E**：`e2e/specs/` の **Gauge spec＝仕様書**（1ファイル＝1ユーザーストーリー、「誰は〜できる」）。ステップ実装は React 向け（`tests/StepImplementation.ts`、要素は **data-testid**、`@BeforeScenario` で API 経由 clean&seed、ログインは dev トークンのため no-op）。`BASE_URL` は :8080（or dev :5173）。

---

## ⚙️ 環境の地雷（必読）

- **パッケージマネージャは pnpm 統一**（npm 禁止）。ビルドスクリプト許可は `pnpm-workspace.yaml` の `onlyBuiltDependencies`、または `pnpm approve-builds`。
- **docker ポート**：frontend `8080` / 旧client `8081` / api `3000` / db `5432`。
- **API は起動時にマイグレーションしない**。docker DB が空なら `docker compose exec -T db psql -U studyapp -d studyapp < api/db/migrations/0001_init.sql` を手動実行（※起動時自動化は未対応）。
- **Docker レジストリ egress が時々切れる**（`registry-1.docker.io` タイムアウト）。コンテナ再ビルド不可のときは **`cd frontend && pnpm dev`（:5173・`/api`→:3000 プロキシ）** で最新ソースを確認／E2E も :5173 で実行可。
- **gauge はシステムバイナリ**（`npx gauge` 不可、`gauge run` を使う）。`e2e/node_modules` 破損（`tsconfig-paths/register`・`gauge-ts/dist` 欠落）時は `rm -rf node_modules package-lock.json && npm install` でクリーン再インストール。

---

## 🔄 GitHub 運用ルール

### セッション終了時の自動操作

ユーザー（Goさん）から以下のキーワードで終了の合図があった時、Claude は以下を **自動実行** すること：

**トリガーキーワード**
- 「セッション終了」「セッション完了」
- 「ここまで」「あとで再開」
- 「閉じる」

**自動実行する処理（順番通り）**
1. `project_log.md` を最新状態に更新する（既存のグローバルCLAUDE.mdルール通り）
2. ローカルで未コミットの変更があるか確認する（`git status`）
3. 変更があれば、以下を順に実行する：
   - `git add .`
   - `git commit -m "{変更内容の要約}"`
   - `git push`
4. 実行結果（コミット成功、プッシュ成功）をユーザーに報告する
5. 公開URLに変更が反映されるまで数分かかる旨を伝える

**注意**：もし未コミット変更がなければ、project_log.md の更新のみ実行してセッション完了とする。

### コミットメッセージのルール

- 日本語でOK（ただし短く簡潔に）
- 変更内容が一目で分かるように要約する
- 複数の変更がある場合は、主な変更をまとめる
- **例**：
  - 「スタッフ管理画面に検索機能を追加」
  - 「ログイン画面のデザインを改善」
  - 「面談記録機能を実装」
  - 「ダミーデータを更新」
  - 「運用ルール（CLAUDE.md）を追加」

### 作業中の自動 push は行わない

- ファイル変更のたびに push はしない（意図しない公開を避けるため）
- **セッション終了時のみ**、まとめて push する
- ただし、ユーザーが「今すぐ push して」「これを反映して」などと明示的に指示した場合は、その時点で push を実行する

### 公開に影響する変更の扱い

認証ロジックやログイン判定など、**公開サイトの動作に重大な影響を与える変更** をする場合：
- push 前に必ずユーザーに確認する
- 「この変更は公開サイトの〇〇に影響します。push してよろしいですか？」と尋ねる

---

## 🚫 絶対に GitHub に上げてはいけないファイル（.gitignore で管理）

以下は `.gitignore` で除外設定済み。Claude は絶対に `git add` しないこと：

- `data/staff.csv`（スタッフ情報・パスワード）
- `project_log.md`（内部の設計方針・実装計画）
- `*.pdf`（大きなファイル、機密資料）
- `session_logs/`（過去のセッションログ）
- `.DS_Store`（Mac システムファイル）

新しく機密ファイルを作成した場合は、**必ず `.gitignore` に追加**してから `git add` すること。

---

## 👥 社内メンバー招待時の対応手順（将来の話）

ユーザーから「**社内メンバーを招待したい**」と言われた時、以下を案内する：

### 1. GitHub リポジトリへの Collaborator（協力者）招待手順
1. GitHub でリポジトリを開く：`https://github.com/Go-englead/study_app`
2. **Settings** → **Collaborators** → **Add people**
3. メンバーの GitHub ユーザー名 or メールアドレスを入力
4. 招待を送る
5. メンバー側で招待承諾

### 2. メンバー側のセットアップ（各自のパソコンで実行）
1. Git の有無確認（Mac なら通常は標準搭載、`git --version`）
2. Git 初期設定（名前・メールアドレス登録）
3. Homebrew インストール
4. `brew install gh`
5. `gh auth login` でブラウザ認証
6. `git clone https://github.com/Go-englead/study_app.git` でダウンロード
7. 編集 → `git add . && git commit -m "説明" && git push` で反映

### 3. 機密ファイルの別途共有
以下のファイルは GitHub に含まれていないため、別手段で共有する必要がある：
- `data/staff.csv`（スタッフ情報）
- `project_log.md`（プロジェクト内部情報）

推奨の共有方法：
- Google Drive の限定共有（社内メンバーのみ閲覧可能な設定）
- 社内チャットの添付ファイル（権限管理されたチャンネル）

---

## ⚠️ セキュリティに関する現状の既知課題

本番運用に向けて改善が必要な点（現在はサンプル版のため未対応）：

1. **パスワードの平文保存**：`staff.csv` 内のパスワードは暗号化されていない
2. **会員ログインのハードコード**：`login.html` 内に `member / study2026` が直書き
3. **認証の脆弱性**：フロントエンドのみの認証で、ソースコードから認証ロジックが見える
4. **GitHub Pages の公開制御**：URLを知っていれば誰でもログイン画面にアクセス可能

本番化する場合は、別途バックエンド構築と認証サービス導入が必要。
