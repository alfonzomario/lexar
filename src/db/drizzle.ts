import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';
import * as relations from './relations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'lexar.sqlite');
const dbDir = path.dirname(dbPath);
if (dbDir !== __dirname && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// We share the same underlying SQLite DB file instance
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema: { ...schema, ...relations } });
