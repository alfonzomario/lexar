import { defineConfig } from 'drizzle-kit';
import path from 'path';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './src/db/lexar.sqlite',
  },
});
