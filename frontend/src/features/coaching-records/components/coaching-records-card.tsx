import { useState } from 'react'
import { useCoachingRecords } from '../api/get-coaching-records'
import { CoachingRecordModal } from './coaching-record-modal'

interface Props {
  memberId: string
  memberName: string
  /** 会員の業務コード（対象会員バッジ表示用）。 */
  memberCode?: string
  /** 担当コーチ名（ログイン中コーチ。当面は固定）。 */
  coachName: string
}

/** 会員カルテの「コーチング記録」カード（一覧＋登録/編集導線）。 */
export function CoachingRecordsCard({ memberId, memberName, memberCode, coachName }: Props) {
  const { data: records = [], isLoading } = useCoachingRecords(memberId)
  // null=閉じる / 'new'=新規 / それ以外=編集対象ID
  const [modal, setModal] = useState<string | null>(null)

  return (
    <div className="card" data-testid="coaching-card">
      <div className="card-header">
        <div>
          <div className="card-title">🎓 コーチング記録</div>
          <div className="card-sub">{records.length}件</div>
        </div>
        <button className="primary-btn" data-testid="coaching-add" onClick={() => setModal('new')}>
          ＋ コーチングを記録
        </button>
      </div>

      <div className="card-body">
        {isLoading && <p>読み込み中…</p>}
        {!isLoading && records.length === 0 && (
          <div style={{ fontSize: 13, color: '#999', padding: 16, textAlign: 'center' }}>
            コーチング記録はまだありません
          </div>
        )}
        {records.length > 0 && (
          <table className="cr-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '6px 4px' }}>実施日</th>
                <th style={{ padding: '6px 4px' }}>タイプ</th>
                <th style={{ padding: '6px 4px' }}>回数</th>
                <th style={{ padding: '6px 4px' }}>担当</th>
                <th style={{ padding: '6px 4px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} data-testid={`coaching-row-${r.id}`} style={{ borderBottom: '1px solid #f3f3f3' }}>
                  <td style={{ padding: '8px 4px' }}>{r.date}</td>
                  <td style={{ padding: '8px 4px' }}>{r.type}</td>
                  <td style={{ padding: '8px 4px' }}>{r.coachingNumber ?? '-'}</td>
                  <td style={{ padding: '8px 4px' }}>{r.coachName}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                    <button
                      className="secondary-btn"
                      data-testid={`coaching-edit-${r.id}`}
                      onClick={() => setModal(r.id!)}
                      style={{ fontSize: 12 }}
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <CoachingRecordModal
          memberId={memberId}
          memberName={memberName}
          memberCode={memberCode}
          coachName={coachName}
          coachingRecordId={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
