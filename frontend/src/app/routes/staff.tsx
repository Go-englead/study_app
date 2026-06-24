import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/staff')({
  component: () => (
    <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
      「スタッフ管理」は準備中です（API実装後に対応）
    </div>
  ),
})
