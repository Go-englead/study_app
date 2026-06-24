# ドメインモデル — 英語コーチング学習管理

study_app のドメインモデル設計書。E2E仕様書（46ストーリー）と現行フロントエンドの挙動から、**理想ドメイン**として集約・集約ルート・エンティティ・値オブジェクトを設計したもの。本ファイル1枚に集約する。

> **設計方針**
> - 計算で求まる値（連続日数・達成率・**会員ステータス**など）は保存せず**ドメインサービス**が読み取り時に算出する。
> - ステータスは保存しないが、その**入力**（受講期間・休会・手動オーバーライド・継続プラン）はDBに保存する（後述）。
> - 旧コード互換の残骸フィールドは**モデルから除外**する（末尾参照）。

---

## 集約の切り分け原則

1. **ライフサイクルで分ける**。生成・更新・削除のタイミングが別なら別集約。
2. **集約は大きくしすぎない**。
3. **依存先が消えても自分が残って概念的に不適切でないなら、分ける**。会員が削除されればシステム的にはカスケード削除されるが、それは実装都合にすぎない。会員プロフィールの**編集サイクルに巻き込むべきでないもの**（教材割り当て・目標・継続プランなど）は外に出す。
4. 逆に、**会員の同一性（アイデンティティ）を構成するもの**（氏名・連絡先・受講情報など）は同じ集約に置く。
5. 例えるなら **Order と Payment** の関係：Payment は Order を参照するが独立した集約。

---

## 境界づけられたコンテキスト

**英語コーチング学習管理**（単一コンテキスト）。内部に 会員管理／教材割り当て／学習記録／コーチング／成績(PROGOS)／教材マスタ／スタッフ認証 のサブ領域を持つ。

---

## 集約マップ

| 集約ルート | 内包エンティティ | 他集約への参照 | 役割 |
|---|---|---|---|
| **Member（会員）** | — | — | 会員の同一性＋受講情報。当面ここに受講情報を置き、肥大化したら分割 |
| **TextbookAssignment（教材割り当て）** | — | Member(ID) / Textbook(ID) | 会員に割り当てた教材と教材ごとの目標。現在状態 |
| **ContinuationPlan（継続プラン）** | — | Member(ID) | 卒業後の次プラン契約 |
| **LearningLog（学習記録）** | — | Member(ID) / Textbook(ID) | 1学習セッション。連続日数・達成率の算出元 |
| **CoachingRecord（コーチング記録）** | TextbookTest | Member(ID) / Textbook(ID) | 面談・テストの実施記録 |
| **ProgosScore（PROGOSスコア）** | — | Member(ID) | CEFRレベルの測定結果。全会員横断で分析 |
| **Textbook（教材）** | — | — | 教材マスタ |
| **Staff（スタッフ）** | — | — | コーチ・講師・コンサル・CS。認証とアクセス制御 |

> Member 以外はすべて **MemberId 等のID参照のみ**で結ばれ、トランザクション境界を跨いだ強整合は持たない（結果整合）。

---

## 1. Member（会員）

会員の**同一性**と**受講情報**を保持する集約。氏名・連絡先などアイデンティティを構成するものと、受講に関する基本状態をまとめる。

> 受講情報（プラン・ステータス・受講期間・クラス・1日の目標学習時間など）は本来サブ概念だが、**当面 Member 集約に内包**する。実装して肥大化したら別集約（受講情報）に分割する。

### 集約ルート：Member

| 属性 | 型（値オブジェクト） | 説明 |
|---|---|---|
| id | MemberId | 会員ID |
| name | PersonName | 氏名（漢字・カナ・アルファベットの3表記＋表示名・イニシャル） |
| email | Email | ログインID。照合は大文字小文字を区別しない |
| credential | Credential | パスワード＋初回変更要否フラグ |
| gender / birthDate / phone | — | 基本属性 |
| plan | PlanType | 入会プラン |
| manualStatusOverride | MemberStatus? | 手動で設定したステータス（途中退会 等）。職員が設定したときのみ保存。実効ステータス算出で最優先 |
| enrollmentPeriod | EnrollmentPeriod | 受講開始日〜卒業予定日 |
| orientation | Orientation | オリエン実施日・担当（任意） |
| classLevel | ClassLevel | 入学時クラス／現在クラス |
| nativecamp | NativecampStatus | ネイティブキャンプ導入状況 |
| dailyTargetMinutes | DailyTarget | 1日の目標学習時間（分）※会員全体の目標 |
| travelPlan | TravelPlan | 渡航計画（任意） |
| suspension | SuspensionPeriod? | 休会期間（職員が設定／解除して保存） |
| englishScores | EnglishScores | 直近の英語スコア（任意） |
| coachLearningGoal | Text | コーチ入力の学習目標テキスト（任意） |
| consultant / cs / orientStaff | StaffRef | 担当者 |
| dismissedCoachingReminderId | CoachingRecordId? | コーチング予約リマインダーを「予約完了」で消した対象コーチングID（再表示の抑制用） |

### ステータス（status）について — DBに保存せず計算で導く（compute-on-read）

会員ステータスは**DBに保存しない**。`MemberStatusPolicy`（後述）が、保存済みの入力から**読み取り時に計算**する。ステータスはドメイン上の概念としては存在するが、永続化する必要はない。

- **入力（これらはDBに保存される）**：
  - 受講期間（受講開始日・卒業予定日）
  - 休会期間（職員が休会設定／解除して保存）
  - 手動ステータスオーバーライド（`途中退会` 等、職員が会員編集で設定 — spec28）
  - [[ContinuationPlan]]（別集約）
- **実効ステータス** ＝ `manualStatusOverride ?? ポリシー(受講期間・休会・継続・現在日)`
- **優先順位**：手動オーバーライド（途中退会）> 休会 > 継続 > 受講期間
- これにより「日付起因の遷移（受講中→卒業、休会期間入り→休会中、休会終了→受講中）」は**保存不要・時間経過で常に正しい値**になり、「誰が・いつ保存するか」という問題自体が消える（現行アプリのように『次に管理画面を開いた職員が保存』する必要がない）。

### 不変条件・ビジネスルール

- **初回ログイン**：requirePasswordChange=true の会員は初回ログイン時にパスワード変更が必須。新パスワードは8文字以上／仮PWと不一致／変更後はフラグOFF。
- メールアドレスは会員・スタッフを通じて一意。
- **コーチング予約リマインダーの抑制**：会員がリマインダーの「予約完了」を押すと、その時点の最新コーチングIDを `dismissedCoachingReminderId` に記録し、同一コーチングについてはリマインダーを再表示しない（[[CoachingRecord]] のリマインダー判定と連動）。

---

## 2. TextbookAssignment（教材割り当て）

**会員にどの教材を、1日何分の目標で割り当てるか**を表す集約。コーチングドメインとは別概念で、会員プロフィールの編集サイクルからも独立する。

> 現行アプリでは「コーチングの教材選定」（実機能・`coachingRecords[教材選定].selectedTextbooks`）と「教材管理の会員割り当て」（空サンプル `assignments`・未接続）に二重化しているが、**理想ドメインではこの1集約に統合**する。

### 集約ルート：TextbookAssignment

| 属性 | 型 | 説明 |
|---|---|---|
| memberId | MemberId（参照） | 対象会員 |
| textbookId | TextbookId（参照） | 割り当て教材（[[Textbook]]） |
| dailyGoalMinutes | DailyGoalMinutes | 教材ごとの1日目標分数 |
| note | Text | メモ（例「シャドーイング中心」） |
| status | AssignmentStatus | 継続／卒業 |

### 不変条件・ビジネスルール

- `(memberId, textbookId)` で**ユニーク**（同一教材の重複割り当て不可）。
- **卒業は終端**（卒業した教材は復活させない）。
- 会員全体の「1日の目標学習時間」は、割り当て各教材の `dailyGoalMinutes` の合計として算出できる（Member の dailyTargetMinutes と整合）。
- 割り当ての変更は**コーチング（教材選定・テスト時の追加/卒業判定）や教材管理画面から行われる**＝割り当てを変更する操作は複数の入口を持つが、状態の真実はこの集約。

### 関連

- 変更の起点：[[CoachingRecord]]（教材選定・テスト記録）／教材管理画面
- 表示：会員ダッシュボードの「教材の進捗」「卒業した教材」

---

## 3. ContinuationPlan（継続プラン）

卒業後の次プラン契約。会員とは独立したライフサイクル（卒業前後に追加され、複数持ちうる）を持つため別集約。

### 集約ルート：ContinuationPlan

| 属性 | 型 | 説明 |
|---|---|---|
| memberId | MemberId（参照） | 対象会員 |
| planType | ContinuationPlanType | プラン種別（例：タビプラプラン） |
| months | int(1-6) | 期間（ヶ月） |
| startDate | Date | 開始日 |
| endDate | Date | 終了日（= startDate + months − 1日、自動算出） |
| note | Text | 備考（任意） |

### 不変条件・ビジネスルール

- endDate は startDate と months から自動算出。
- 会員ステータス判定に関与：継続プラン期間中（最新プラン endDate ≥ 今日）は `継続中`（卒業判定から保護）。判定は `MemberStatusPolicy` が本集約を読んで行う。

---

## 4. LearningLog（学習記録）

会員が入力する1学習セッションの記録。件数が増え、会員横断で集計（ランキング）されるため独立集約。

### 集約ルート：LearningLog

| 属性 | 型 | 説明 |
|---|---|---|
| id | LearningLogId | 識別子 |
| memberId | MemberId（参照） | 記録した会員 |
| textbookId | TextbookId（参照） | 学習した教材 |
| date | StudyDate | 学習日 |
| duration | StudyDuration | 学習時間（分） |
| comment | Text | コメント（任意） |

### 不変条件・ビジネスルール

- **未来日の記録は不可**（カレンダー上も未来日は操作不可）。
- **編集時に教材は変更できない**（作成時に固定。時間・日付・コメントのみ編集可）。
- 同一会員・同一日に複数教材の記録を持てる。

### 関連ドメインサービス

`StreakCalculator`／`AchievementRateCalculator`／`RankingService`（後述）の算出元。

---

## 5. CoachingRecord（コーチング記録）

コーチが行った面談・テストの**実施記録（履歴）**。教材割り当て状態そのものは持たず（それは [[TextbookAssignment]]）、本集約は「いつ・誰が・何をしたか」を記録する。

### 集約ルート：CoachingRecord

| 属性 | 型 | 説明 |
|---|---|---|
| id | CoachingRecordId | 識別子 |
| memberId | MemberId（参照） | 対象会員 |
| type | CoachingType | 種別：教材選定／オリエンテーション／初回コーチング／通常コーチング |
| date | CoachingDate | 実施日 |
| coachName | StaffRef | 担当コーチ |
| sharedNote / monthlyReview / coachAdvice / otherNotes | Text | 種別に応じた記述（任意） |
| coachingNumber | int | 通常コーチングのみ（2以上） |
| textbookTests | TextbookTest[] | テスト記録（初回・通常コーチング） |

### 内包エンティティ：TextbookTest（テスト記録）

| 属性 | 型 | 説明 |
|---|---|---|
| textbookId | TextbookId（参照） | 対象教材 |
| testStatus | TestStatus | 実施済み／未実施／未選択 |
| range / format / score / note | Text | テスト内容 |
| nextStatus | NextTextbookStatus | 卒業／継続／未選択 |

### 不変条件・ビジネスルール

- **種別の登録回数制約**：教材選定・オリエン・初回コーチングは**各1回のみ**。通常コーチングは回数（coachingNumber）で区別し重複不可。
- **種別の順序**：オリエン → 初回 → 通常。実施日も整合（オリエン日 ≦ 初回日 ≦ 通常各回）。
- **割り当てへの波及**：教材選定や、テスト時の `nextStatus=卒業` は [[TextbookAssignment]] を更新する（アプリケーションサービスがオーケストレーション）。
- **リマインダー**：最新コーチングから31日以上経過で会員側にコーチング予約リマインダーを表示。ただし [[Member]] の `dismissedCoachingReminderId` が最新コーチングIDと一致する場合（＝会員が「予約完了」で消した）は表示しない。

---

## 6. ProgosScore（PROGOSスコア）

PROGOS（CEFRベースの英語スピーキング測定）の受験結果。全会員横断で分析されるため独立集約。

### 集約ルート：ProgosScore

| 属性 | 型 | 説明 |
|---|---|---|
| id | ProgosScoreId | 識別子 |
| memberId | MemberId（参照） | 受験会員 |
| examDate | ExamDate | 受験日 |
| overall | CefrLevel | 総合評価 |
| skills | ProgosSkillSet | 6技能（range/accuracy/fluency/interaction/coherence/phonology、各 CefrLevel） |
| comment | Text | コメント（任意） |

### 不変条件・ビジネスルール

- 1会員が複数回の受験スコアを時系列で持つ。**最新スコア**が集計対象。
- 登録・削除が可能。
- `CefrLevel` は A1 < A2 < B1 < B2 < C1 < C2 の順序を持ち、レベル変動の比較に使う。

### 関連ドメインサービス

`ProgosTrendAnalyzer`（前回 vs 最新の overall でアップ／横ばい／ダウンを判定）。

---

## 7. Textbook（教材）

学習教材のマスタデータ。各所からID参照される。

### 集約ルート：Textbook

| 属性 | 型 | 説明 |
|---|---|---|
| id | TextbookId | 教材ID |
| name | TextbookName | 教材名 |
| category | Category | カテゴリ |
| unit | Unit | 単位（語・ページ・章・分・回 等。カテゴリから推定） |
| colorTheme | ColorTheme | 表示色（カテゴリごとに割当） |
| iconUrl | IconRef | アイコン（画像URL または 絵文字/テキスト） |
| manualUrl | Url | マニュアルURL（任意） |
| note | Text | 備考（任意） |

### 不変条件・ビジネスルール

- マスタは CSV 由来。読込失敗時はインラインのフォールバックを使用。
- 未登録IDの参照は「(未登録)」表示（参照整合性は緩く扱う）。
- 同一カテゴリの教材は同一表示色。
- 管理画面でマスタの追加・編集・削除（CRUD）が可能（spec40）。

---

## 8. Staff（スタッフ）

コーチ・講師・コンサル・CS。ログイン認証と管理画面アクセス制御を担う。

### 集約ルート：Staff

| 属性 | 型 | 説明 |
|---|---|---|
| id | StaffId | 社員ID |
| name | PersonName | 氏名（表示名） |
| role | Role | Coach／Teacher／Consultant／CS |
| email | Email | ログインID |
| credential | Credential | パスワード |
| iconUrl / meetUrl / groupContent | — | 任意 |

### 不変条件・ビジネスルール

- **管理画面アクセスは role ∈ {Coach, Teacher} のみ**。Consultant・CS はログイン拒否。
- 会員の consultant / cs / orientStaff から参照される。
- 自身のパスワード変更が可能。
- マスタは CSV 由来（機密情報のため Git 管理外、フォールバックあり）。

---

## ドメインサービス（計算・横断ロジック）

保存値ではなく算出する。

| サービス | 入力 | 責務 |
|---|---|---|
| **MemberStatusPolicy** | Member(EnrollmentPeriod / Suspension / manualStatusOverride) ／ ContinuationPlan ／ 現在日 | 実効ステータスを**読み取り時に計算**（保存しない）。優先順位：**手動オーバーライド(途中退会) > 休会 > 継続 > 受講期間** |
| **StreakCalculator** | LearningLog[] | 連続学習日数を算出 |
| **AchievementRateCalculator** | LearningLog[] ／ DailyTarget | 日／週／月の達成率を算出（カレンダー色分けにも使用） |
| **RankingService** | 全会員の LearningLog[] | 総学習時間／週次達成率／連続日数のランキング |
| **ProgosTrendAnalyzer** | ProgosScore[]（前回・最新） | CEFRレベル変動（アップ／横ばい／ダウン）を判定 |

---

## 主な値オブジェクト（不変条件付き）

| 値オブジェクト | 構成 | 不変条件・ルール |
|---|---|---|
| PersonName | 姓名×{漢字・カナ・アルファベット}、表示名、イニシャル | 漢字姓名は必須 |
| Email | メール文字列 | 形式検証。比較時は小文字化 |
| Credential | password＋requirePasswordChange | 8文字以上／仮PWと不一致／変更後フラグOFF |
| MemberStatus | 列挙 | 入学手続き中／受講中／休会中／卒業／継続中／再入学手続き中／途中退会。**計算値（DB非保存）**。入力（日付・休会・手動オーバーライド・継続）から導出 |
| EnrollmentPeriod | startDate, graduateDate | startDate ≤ graduateDate |
| SuspensionPeriod | from, until | from ≤ until。期間中は休会中と判定。期間終了後はポリシーが日付から再計算（復帰用の保存値は不要） |
| TravelPlan | country, city, travelDate, reason | travelDate は未来日のみ |
| DailyTarget / DailyGoalMinutes | minutes(int) | 0以上 |
| AssignmentStatus | 列挙 | 継続／卒業（卒業は終端） |
| CefrLevel | A1〜C2（順序付き） | 大小比較可 |
| ProgosSkillSet | 6技能（各 CefrLevel） | — |
| CoachingType | 列挙 | 教材選定／オリエン／初回／通常 |
| ContinuationPlanType | 列挙 | タビプラプラン 等 |
| Role | 列挙 | Coach／Teacher／Consultant／CS |
| StudyDate | 日付 | 未来日不可 |

---

## 集約間ルール

1. **教材割り当ての変更**：[[CoachingRecord]]（教材選定・テスト卒業判定）や教材管理画面の操作が、[[TextbookAssignment]] を更新する（アプリケーションサービスがオーケストレーション）。
2. **学習記録**：[[LearningLog]] は MemberId・TextbookId をID参照。記録できる教材は会員の [[TextbookAssignment]] に限定される。
3. **ステータス判定**：`MemberStatusPolicy` が Member（受講期間・休会・手動オーバーライド）＋[[ContinuationPlan]]を読んで**読み取り時に計算**（保存しない。集約跨ぎの読み取り）。
4. **アクセス制御**：管理画面に入れるのは `Staff.role ∈ {Coach, Teacher}` のみ。

---

## モデルから除外したレガシー／集計フィールド

現行 localStorage データには以下が混在するが、**計算で求まる**か**旧コード互換の残骸**のため理想ドメインには含めない。

| フィールド | 除外理由 |
|---|---|
| `rate`, `streak`, `streakCompare`, `monthlyHours`, `monthlyHoursCompare`, `weeklyRates` | 保存された集計値。LearningLog からドメインサービスで算出 |
| `weeklyGoalHours` | DailyTarget に一本化 |
| `course` | currentClass の複製 |
| `lastLoginDaysAgo`, `lastCoachingDaysAgo` | 派生値（経過日数は算出可能） |
| `goalEnglish` | 未使用の旧フィールド |
| `departureDate` | TravelPlan.travelDate と重複 |
| `textbookProgress`, `recentLogs` | LearningLog から導出される表示用キャッシュ |
| `assignments`（空サンプル） | TextbookAssignment に統合 |

---

## ユビキタス言語

| 用語 | 英語 | 意味 |
|---|---|---|
| 会員 | Member | 学習者（生徒） |
| 受講情報 | Enrollment | プラン・ステータス・受講期間・クラス・目標など |
| 教材割り当て | TextbookAssignment | 会員に割り当てた教材＋教材ごと目標 |
| 学習記録 | LearningLog | 日々の学習ログ |
| コーチング記録 | CoachingRecord | 面談・テスト等の実施記録 |
| 教材選定 | TextbookSelection | 割り当てを変更するコーチング種別/操作 |
| 継続プラン | ContinuationPlan | 卒業後の次プラン契約 |
| 休会 | Suspension | 一定期間の受講停止 |
| PROGOSスコア | ProgosScore | CEFRベースの英語力測定結果 |
| 連続学習日数 | Streak | 連続して学習した日数（計算値） |
| 達成率 | AchievementRate | 学習時間 ÷ 目標時間（計算値） |
| スタッフ | Staff | コーチ／講師／コンサル／CS |
