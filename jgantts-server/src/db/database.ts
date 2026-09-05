import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrateDatabase } from './migrations';

export type ContentDatabase = Database.Database;

export function openContentDatabase(databasePath: string): ContentDatabase {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o750 });
  }

  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  if (databasePath !== ':memory:') database.pragma('journal_mode = WAL');
  migrateDatabase(database);
  return database;
}

export function inTransaction<T>(database: ContentDatabase, operation: () => T): T {
  return database.transaction(operation)();
}
