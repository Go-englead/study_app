import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit 設定。`npm run db:generate` で schema.ts から
 * db/migrations 配下に SQL マイグレーションを生成する。
 */
export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://studyapp:studyapp@localhost:5432/studyapp',
  },
});
