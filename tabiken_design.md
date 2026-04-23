# Design System — タビケン留学 / タビケンプライム準拠

> このファイルはVS Code上でのAI補助設計（GitHub Copilot / Cursorなど）向けに作成されたデザインシステム仕様書です。
> 学習管理システム（LMS）のUIデザインにタビケンプライムサイトのデザイン言語を適用します。

---

## 1. ブランドアイデンティティ

| 項目 | 内容 |
|------|------|
| ブランド名 | タビケン留学 / タビケンプライム |
| 運営会社 | 株式会社 Morrow World |
| トーン | 信頼感・温かみ・グローバル感・前向き |
| 対象ユーザー | 留学・ワーホリ希望の日本人（10代後半〜30代） |
| LMSでの用途 | 英語コーチング・学習進捗管理・カリキュラム管理 |

---

## 2. カラーパレット

サイトのビジュアルから抽出した推定値。実装時は実際の CSS 変数と照合してください。

```css
:root {
  /* === Primary === */
  --color-primary:        #1A5276;   /* ネイビーブルー（メインCTA・見出し） */
  --color-primary-light:  #2E86C1;   /* ライトブルー（ホバー・強調） */
  --color-primary-dark:   #0E3860;   /* ダークネイビー（ヘッダー背景） */

  /* === Accent === */
  --color-accent:         #27AE60;   /* グリーン（成功・進捗・バッジ） */
  --color-accent-line:    #06C755;   /* LINE グリーン（LINEボタン） */

  /* === Neutral === */
  --color-bg:             #FFFFFF;   /* ページ背景 */
  --color-bg-soft:        #F4F6F8;   /* セクション背景（薄グレー） */
  --color-bg-dark:        #1C2833;   /* フッター・ダーク背景 */
  --color-border:         #D5D8DC;   /* ボーダー・区切り線 */

  /* === Text === */
  --color-text-primary:   #1C2833;   /* 本文メインテキスト */
  --color-text-secondary: #566573;   /* サブテキスト・キャプション */
  --color-text-muted:     #ABB2B9;   /* プレースホルダー・非活性 */
  --color-text-inverse:   #FFFFFF;   /* 白抜きテキスト（ダーク背景上） */

  /* === Semantic === */
  --color-success:        #27AE60;
  --color-warning:        #F39C12;
  --color-error:          #E74C3C;
  --color-info:           #2E86C1;
}
```

### カラー使用ガイドライン

- **プライマリカラー（ネイビー）** → ヘッダー・ナビゲーション・CTAボタン・セクション見出し
- **アクセントグリーン** → 進捗バー・達成バッジ・「完了」ステータス・LINEボタン
- **ソフト背景（#F4F6F8）** → ダッシュボードカード・フォーム背景
- **ダーク背景（#1C2833）** → フッター・サイドバー（ダークモード時）

---

## 3. タイポグラフィ

```css
:root {
  /* === Font Family === */
  --font-primary: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif;
  --font-heading: 'Noto Sans JP', sans-serif;
  --font-mono:    'JetBrains Mono', 'Courier New', monospace;  /* コード表示用 */

  /* === Font Size Scale === */
  --text-xs:   0.75rem;   /* 12px — ラベル・キャプション */
  --text-sm:   0.875rem;  /* 14px — サブテキスト */
  --text-base: 1rem;      /* 16px — 本文 */
  --text-lg:   1.125rem;  /* 18px — 強調テキスト */
  --text-xl:   1.25rem;   /* 20px — カード見出し */
  --text-2xl:  1.5rem;    /* 24px — セクション小見出し */
  --text-3xl:  1.875rem;  /* 30px — セクション見出し */
  --text-4xl:  2.25rem;   /* 36px — ページタイトル */
  --text-5xl:  3rem;      /* 48px — ヒーロー見出し */

  /* === Font Weight === */
  --font-normal:    400;
  --font-medium:    500;
  --font-semibold:  600;
  --font-bold:      700;
  --font-extrabold: 800;

  /* === Line Height === */
  --leading-tight:  1.25;
  --leading-normal: 1.6;
  --leading-relaxed:1.8;

  /* === Letter Spacing === */
  --tracking-tight:  -0.02em;
  --tracking-normal:  0em;
  --tracking-wide:    0.05em;
  --tracking-widest:  0.1em;   /* セクションラベルなど */
}
```

### タイポグラフィ使用例

```css
/* ページ大見出し */
h1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--color-primary-dark);
}

/* セクション見出し */
h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

/* カード見出し */
h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

/* 本文 */
p {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
}
```

---

## 4. スペーシング・グリッド

```css
:root {
  /* === Spacing Scale (4px base) === */
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */

  /* === Layout === */
  --container-max:    1280px;
  --container-wide:   1440px;
  --container-narrow:  800px;
  --padding-x:         1.5rem;   /* 左右パディング（モバイル） */
  --padding-x-lg:      2rem;     /* 左右パディング（デスクトップ） */

  /* === Section Padding === */
  --section-py:     5rem;        /* セクション上下余白 */
  --section-py-sm:  3rem;        /* モバイルセクション余白 */
}
```

### グリッドシステム

```css
/* 12カラムグリッド */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}

/* よく使うカラム構成 */
.col-full    { grid-column: span 12; }
.col-half    { grid-column: span 6; }
.col-third   { grid-column: span 4; }
.col-quarter { grid-column: span 3; }
.col-two-thirds { grid-column: span 8; }

/* ブレークポイント */
/* --bp-sm:  640px   (モバイル大) */
/* --bp-md:  768px   (タブレット) */
/* --bp-lg:  1024px  (デスクトップ小) */
/* --bp-xl:  1280px  (デスクトップ) */
/* --bp-2xl: 1536px  (ワイド) */
```

---

## 5. コンポーネント仕様

### 5.1 ボタン

```css
/* === Base Button === */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: 4px;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  border: 2px solid transparent;
}

/* === Primary（メインCTA） === */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}
.btn-primary:hover {
  background-color: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 82, 118, 0.3);
}

/* === LINE ボタン === */
.btn-line {
  background-color: var(--color-accent-line);
  color: var(--color-text-inverse);
}
.btn-line:hover {
  background-color: #05b04c;
}

/* === Outline === */
.btn-outline {
  background-color: transparent;
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.btn-outline:hover {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

/* === サイズ === */
.btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--text-sm); }
.btn-lg { padding: var(--space-4) var(--space-8); font-size: var(--text-lg); }
```

---

### 5.2 カード（コース・学習カード）

```css
.card {
  background: var(--color-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.card-body {
  padding: var(--space-5);
}

.card-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.card-meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
```

---

### 5.3 進捗バー（LMS特有コンポーネント）

```css
.progress-container {
  width: 100%;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--color-border);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-light), var(--color-accent));
  border-radius: 99px;
  transition: width 0.5s ease;
}
```

---

### 5.4 バッジ・タグ

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: 99px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.badge-primary  { background: #EBF5FB; color: var(--color-primary); }
.badge-success  { background: #EAFAF1; color: var(--color-success); }
.badge-warning  { background: #FEF9E7; color: var(--color-warning); }
.badge-error    { background: #FDEDEC; color: var(--color-error); }
```

---

### 5.5 ナビゲーション（サイドバー型 LMS）

```css
.sidebar {
  width: 260px;
  background-color: var(--color-primary-dark);
  color: var(--color-text-inverse);
  min-height: 100vh;
  padding: var(--space-6) 0;
  position: fixed;
  left: 0;
  top: 0;
}

.sidebar-logo {
  padding: 0 var(--space-6) var(--space-6);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: var(--space-4);
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-6);
  color: rgba(255,255,255,0.7);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
  border-left: 3px solid transparent;
}

.sidebar-nav-item:hover,
.sidebar-nav-item.active {
  background: rgba(255,255,255,0.08);
  color: var(--color-text-inverse);
  border-left-color: var(--color-accent);
}
```

---

### 5.6 フォーム要素

```css
.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: 6px;
  font-size: var(--text-base);
  font-family: var(--font-primary);
  color: var(--color-text-primary);
  background: var(--color-bg);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(46, 134, 193, 0.15);
}
```

---

### 5.7 セクション見出し（タビケンプライム風）

タビケンプライムサイトではセクション見出しが中央寄せでシンプルに配置されています。

```css
.section-heading {
  text-align: center;
  margin-bottom: var(--space-12);
}

.section-heading h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}

.section-heading p {
  margin-top: var(--space-4);
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
```

---

## 6. レイアウトパターン

### 6.1 LMS ダッシュボードレイアウト

```
┌──────────────────────────────────────────────┐
│  HEADER（ロゴ・検索・ユーザーアイコン）        │ 64px
├──────────┬───────────────────────────────────┤
│          │  BREADCRUMB                        │
│ SIDEBAR  ├───────────────────────────────────┤
│ 260px    │  PAGE TITLE + CTA ボタン           │
│ 固定     ├───────────────────────────────────┤
│          │  STATS CARDS（4列）                │
│ ナビ一覧  ├───────────────────────────────────┤
│          │  MAIN CONTENT AREA                 │
│          │  ├ コース一覧（3列グリッド）         │
│          │  └ 進捗・スケジュール               │
│          │                                    │
└──────────┴───────────────────────────────────┘
```

### 6.2 5つのポイント（サービス紹介）レイアウト

タビケンプライムの「5つのポイント」セクションを参考に：

```css
/* 交互レイアウト（画像 + テキスト）*/
.feature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-16);
  align-items: center;
  margin-bottom: var(--space-20);
}

.feature-row:nth-child(even) {
  direction: rtl;  /* 偶数行は画像を右に */
}

.feature-row:nth-child(even) > * {
  direction: ltr;
}
```

---

## 7. アニメーション・トランジション

```css
:root {
  --transition-fast:   0.15s ease;
  --transition-base:   0.2s ease;
  --transition-slow:   0.4s ease;
  --transition-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* スクロールアニメーション（Intersection Observer と組み合わせ） */
.fade-up {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-up.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ステップ遅延（カード一覧など） */
.fade-up:nth-child(1) { transition-delay: 0ms; }
.fade-up:nth-child(2) { transition-delay: 80ms; }
.fade-up:nth-child(3) { transition-delay: 160ms; }
.fade-up:nth-child(4) { transition-delay: 240ms; }
```

---

## 8. 画像・アイコン

### 画像アスペクト比
| 用途 | 比率 |
|------|------|
| ヒーローバナー | 16:6 |
| コース・機能カード | 16:9 |
| 人物・スタッフ写真 | 1:1（円形クリップ） |
| OGP / サムネイル | 1200×630px |

### アイコン
- **スタイル**: ライン系（Stroke）アイコンを推奨（例：Lucide Icons, Heroicons）
- **サイズ**: 20px（インライン）, 24px（ボタン内）, 32px（機能カード）
- **カラー**: テキストカラーと揃える（`currentColor` を使用）

---

## 9. LMS 固有コンポーネント

### 9.1 学習ステップ（フロー図）

タビケンプライムの「流れ」セクションを参考に：

```css
.step-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.step-item {
  display: flex;
  gap: var(--space-6);
  padding-bottom: var(--space-8);
  position: relative;
}

/* 縦の繋ぎ線 */
.step-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 40px;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
  flex-shrink: 0;
}
```

### 9.2 統計カード（ダッシュボード）

```css
.stat-card {
  background: var(--color-bg);
  border-radius: 12px;
  padding: var(--space-6);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border-left: 4px solid var(--color-primary);
}

.stat-value {
  font-size: var(--text-4xl);
  font-weight: var(--font-extrabold);
  color: var(--color-primary-dark);
  line-height: 1;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-2);
}
```

---

## 10. アクセシビリティ

```css
/* フォーカスリング（キーボード操作） */
:focus-visible {
  outline: 3px solid var(--color-primary-light);
  outline-offset: 2px;
}

/* スクリーンリーダー専用テキスト */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* コントラスト比 */
/* テキスト on 白背景 → var(--color-text-primary) #1C2833 → 比率 14:1 ✅ */
/* 白テキスト on Primary → #1A5276 → 比率 8:1 ✅ */
```

---

## 11. VS Code / AI補助 活用ガイド

### GitHub Copilot / Cursor への指示例

```
このファイル（design.md）のCSS変数・コンポーネント仕様に従ってUIを実装してください。
- カラーは必ず :root 変数を参照
- ボタンは .btn + 修飾クラス構成で実装
- 日本語テキストは Noto Sans JP を使用
- スペーシングは --space-* 変数のみ使用（ハードコード禁止）
```

### チェックリスト（実装時）

- [ ] CSS変数は `:root` で一元管理されているか
- [ ] ハードコードされた色・余白はないか
- [ ] ホバー・フォーカス状態が定義されているか
- [ ] モバイルファーストのレスポンシブ対応か
- [ ] 日本語フォント（Noto Sans JP）が読み込まれているか
- [ ] コントラスト比が WCAG AA 基準（4.5:1以上）を満たすか

---

*最終更新: 2026年4月 / タビケンプライム（https://tabiken-ryugaku.co.jp/prime/）準拠*
