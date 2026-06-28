import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { serve } from '@hono/node-server';
import type { GlobalSetupContext } from 'vitest/node';
import { createApp } from '../../app';
import { createDatabase } from '../../db/client';
import { Argon2PasswordHasher } from '../../gateway/Argon2PasswordHasher';
import { StaffAuthRepositoryImpl } from '../../gateway/StaffAuthRepositoryImpl';
import { RegisterStaffUseCase } from '../../usecase/staff/RegisterStaffUseCase';

/** ログイン用の職員を1人投入する（テストはこの資格情報でログインする）。 */
async function seedStaff(connectionString: string): Promise<void> {
  const { db, pool } = createDatabase(connectionString);
  try {
    const uc = new RegisterStaffUseCase(new StaffAuthRepositoryImpl(db), new Argon2PasswordHasher());
    await uc.register({
      staffCode: 'S001',
      name: 'コーチA',
      role: 'Coach',
      email: 'coach_001@example.jp',
      password: 'coach001',
    });
  } finally {
    await pool.end();
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../db/migrations');

/** db/migrations 配下の .sql をファイル名順に適用する */
async function applyMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await pool.query(sql);
    }
  } finally {
    await pool.end();
  }
}

/**
 * テスト全体の前後で「Testcontainers の実 Postgres」と「実 Hono サーバ」を起動/破棄する。
 * - apiUrl / databaseUrl は provide() でテストへ渡す（inject で受け取る）。
 */
export default async function ({ provide }: GlobalSetupContext) {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16-alpine',
  ).start();
  const databaseUrl = container.getConnectionUri();

  await applyMigrations(databaseUrl);
  await seedStaff(databaseUrl);

  const { app, close } = createApp(databaseUrl);
  const server = serve({ fetch: app.fetch, port: 0 });
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const apiUrl = `http://localhost:${port}`;

  provide('apiUrl', apiUrl);
  provide('databaseUrl', databaseUrl);

  // teardown: サーバ停止 → アプリのDB接続を閉じる → コンテナ破棄
  return async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await close();
    await container.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    apiUrl: string;
    databaseUrl: string;
  }
}
