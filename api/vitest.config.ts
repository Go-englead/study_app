import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/setup/global-setup.ts'],
    // 共有DBに対する結合テストは直列実行（相互干渉を防ぐ）
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000, // コンテナ起動を待つ
  },
});
