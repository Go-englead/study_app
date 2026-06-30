import { serve } from '@hono/node-server';
import { createApp } from './app';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://studyapp:studyapp@localhost:5432/studyapp';

const { app } = createApp(databaseUrl);

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
