import { create } from 'zustand'

/**
 * 教材管理ページの UI 状態（タブ・選択会員）。
 * 画面遷移（ルート再マウント）では保持し、ページ全体のリロードで初期化される
 * ＝ in-memory（persist しない）。
 */
interface TextbookPageState {
  tab: 'master' | 'assign'
  setTab: (tab: 'master' | 'assign') => void
  selectedMemberId: string
  setSelectedMemberId: (id: string) => void
}

export const useTextbookPageStore = create<TextbookPageState>((set) => ({
  tab: 'master',
  setTab: (tab) => set({ tab }),
  selectedMemberId: '',
  setSelectedMemberId: (selectedMemberId) => set({ selectedMemberId }),
}))
