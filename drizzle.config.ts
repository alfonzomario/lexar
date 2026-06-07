import { defineConfig } from 'drizzle-kit';
import path from 'path';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || process.env.Database_path || process.env.database_path || './src/db/lexar.sqlite',
  },
});
