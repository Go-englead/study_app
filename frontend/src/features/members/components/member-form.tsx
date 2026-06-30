import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  memberFormSchema,
  toMemberInput,
  PLANS,
  CLASSES,
  NATIVECAMPS,
  GENDERS,
  OCCUPATIONS,
  RESIDENCES,
  TRAVEL_COUNTRIES,
  TRAVEL_REASONS,
  type MemberFormValues,
} from '../schemas'
import type { MemberInput } from '../types'

interface Props {
  defaultValues?: Partial<MemberFormValues>
  submitting?: boolean
  submitLabel?: string
  /** code（会員番号）を読み取り専用にする（編集時） */
  lockCode?: boolean
  onSubmit: (input: MemberInput) => void
  onCancel?: () => void
  /** フォームに id を付与（外部フッターの submit ボタンから form 属性で送信するため） */
  formId?: string
  /** フォーム内のアクションボタンを描画しない（フッターを親が描く＝スライドパネル時） */
  hideActions?: boolean
}

const EMPTY: Partial<MemberFormValues> = { dailyTargetMinutes: 60 }

export function MemberForm({
  defaultValues,
  submitting,
  submitLabel = '保存',
  lockCode,
  onSubmit,
  onCancel,
  formId,
  hideActions,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
  })

  // register(name) に data-testid を付与（E2E は data-testid で要素を狙う）
  const field = (name: keyof MemberFormValues) => ({
    ...register(name),
    'data-testid': `member-field-${name}`,
  })

  const submit = handleSubmit((values) => {
    onSubmit(toMemberInput(memberFormSchema.parse(values)))
  })

  const err = (k: keyof MemberFormValues) =>
    errors[k] ? (
      <span className="form-error" data-testid={`member-error-${k}`}>
        {errors[k]?.message as string}
      </span>
    ) : null

  return (
    <form id={formId} onSubmit={submit} className="member-form" data-testid="member-form">
      <section className="form-section">
        <h3>1. 基本情報</h3>
        <div className="form-grid">
          <label>会員ID*<input {...field('code')} readOnly={lockCode} aria-disabled={lockCode} className={lockCode ? 'input-locked' : undefined} />{err('code')}</label>
          <label>姓（漢字）*<input {...field('lastNameKanji')} />{err('lastNameKanji')}</label>
          <label>名（漢字）*<input {...field('firstNameKanji')} />{err('firstNameKanji')}</label>
          <label>姓（カナ）<input {...field('lastNameKana')} /></label>
          <label>名（カナ）<input {...field('firstNameKana')} /></label>
          <label>姓（英）<input {...field('lastNameAlpha')} /></label>
          <label>名（英）<input {...field('firstNameAlpha')} /></label>
          <label>ニックネーム<input {...field('nickname')} /></label>
          <label>
            性別
            <select {...field('gender')}>
              <option value="">選択</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label>生年月日<input type="date" {...field('birthDate')} /></label>
          <label>
            職業
            <select {...field('occupation')}>
              <option value="">選択</option>
              {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label>職業備考<input {...field('occupationNote')} /></label>
        </div>
      </section>

      <section className="form-section">
        <h3>2. 連絡先</h3>
        <div className="form-grid">
          <label>メール*<input {...field('email')} />{err('email')}</label>
          <label>電話番号<input {...field('phone')} /></label>
        </div>
      </section>

      <section className="form-section">
        <h3>3. 受講情報</h3>
        <div className="form-grid">
          <label>
            入会プラン*
            <select {...field('plan')}>
              <option value="">選択</option>
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {err('plan')}
          </label>
          <label>オリエン実施日<input type="date" {...field('enrollmentDate')} /></label>
          <label>受講開始日<input type="date" {...field('startDate')} /></label>
          <label>卒業予定日<input type="date" {...field('graduateDate')} /></label>
          <label>
            入学時クラス*
            <select {...field('initialClass')}>
              <option value="">選択</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {err('initialClass')}
          </label>
          <label>
            現在のクラス*
            <select {...field('currentClass')}>
              <option value="">選択</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {err('currentClass')}
          </label>
          <label>
            ネイティブキャンプ*
            <select {...field('nativecamp')}>
              <option value="">選択</option>
              {NATIVECAMPS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {err('nativecamp')}
          </label>
          <label>1日の目標学習時間(分)*<input type="number" {...field('dailyTargetMinutes')} />{err('dailyTargetMinutes')}</label>
          <label>オリエン担当(staffId/OTHER)<input {...field('orientStaffId')} placeholder="staff UUID または OTHER" /></label>
        </div>
      </section>

      <section className="form-section">
        <h3>4. 担当者</h3>
        <div className="form-grid">
          <label>担当コンサル(staffId/OTHER)<input {...field('consultantStaffId')} placeholder="staff UUID または OTHER" /></label>
          <label>担当CS(staffId/OTHER)<input {...field('csStaffId')} placeholder="staff UUID または OTHER" /></label>
        </div>
      </section>

      <section className="form-section">
        <h3>5. 在住・渡航情報</h3>
        <div className="form-grid">
          <label>
            在住国
            <select {...field('residence')}>
              <option value="">選択</option>
              {RESIDENCES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>海外の国名<input {...field('residenceOverseas')} /></label>
          <label>
            渡航先（国）
            <select {...field('travelCountry')}>
              <option value="">選択</option>
              {TRAVEL_COUNTRIES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>渡航先（都市）<input {...field('travelCity')} /></label>
          <label>渡航時期<input type="date" {...field('travelDate')} /></label>
          <label>
            渡航理由
            <select {...field('travelReason')}>
              <option value="">選択</option>
              {TRAVEL_REASONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>在住・渡航備考<input {...field('travelNote')} /></label>
        </div>
      </section>

      <section className="form-section">
        <h3>6. 直近の英語スコア</h3>
        <div className="form-grid">
          <label>TOEIC L&R<input type="number" {...field('scoreToeicLR')} /></label>
          <label>TOEIC S&W<input type="number" {...field('scoreToeicSW')} /></label>
          <label>TOEFL iBT<input type="number" {...field('scoreToefl')} /></label>
          <label>IELTS<input {...field('scoreIelts')} /></label>
          <label>英検<input {...field('scoreEiken')} /></label>
          <label>その他<input {...field('scoreOther')} /></label>
        </div>
      </section>

      <section className="form-section">
        <h3>7. コーチ入力</h3>
        <div className="form-grid">
          <label>学習目標・目的<textarea {...field('coachLearningGoal')} rows={3} /></label>
          <label>備考<textarea {...field('note')} rows={2} /></label>
        </div>
      </section>

      {!hideActions && (
        <div className="form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {onCancel && (
            <button type="button" className="secondary-btn" onClick={onCancel} data-testid="member-form-cancel">
              キャンセル
            </button>
          )}
          <button type="submit" className="primary-btn" disabled={submitting} data-testid="member-form-submit">
            {submitting ? '送信中…' : submitLabel}
          </button>
        </div>
      )}
    </form>
  )
}
