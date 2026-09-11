import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { ContentDatabase } from './database';

export interface BackupResult {
  databasePath: string;
  mediaPath: string;
}

export function copyQuiescedDatabase(sourceDatabasePath: string, databasePath: string): void {
  if (fs.existsSync(databasePath)) throw new Error(`Backup database already exists: ${databasePath}`);

  fs.copyFileSync(sourceDatabasePath, databasePath);
  const sourceWalPath = `${sourceDatabasePath}-wal`;
  if (fs.existsSync(sourceWalPath)) fs.copyFileSync(sourceWalPath, `${databasePath}-wal`);

  const copiedDatabase = new Database(databasePath, { fileMustExist: true });
  try {
    copiedDatabase.pragma('wal_checkpoint(TRUNCATE)');
    const journalMode = copiedDatabase.pragma('journal_mode = DELETE', { simple: true });
    if (journalMode !== 'delete') throw new Error(`Unexpected backup journal mode: ${journalMode}`);
  } finally {
    copiedDatabase.close();
  }
  fs.rmSync(`${databasePath}-wal`, { force: true });
  fs.rmSync(`${databasePath}-shm`, { force: true });
}

export async function backupContent(
  database: ContentDatabase,
  mediaRoot: string,
  destinationRoot: string,
): Promise<BackupResult> {
  if (fs.existsSync(destinationRoot)) {
    throw new Error(`Backup destination already exists: ${destinationRoot}`);
  }

  fs.mkdirSync(destinationRoot, { recursive: true, mode: 0o750 });
  const databasePath = path.join(destinationRoot, 'content.sqlite');
  const mediaPath = path.join(destinationRoot, 'media');

  try {
    await database.backup(databasePath);
    fs.cpSync(mediaRoot, mediaPath, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  } catch (error) {
    fs.rmSync(destinationRoot, { recursive: true, force: true });
    throw error;
  }

  return { databasePath, mediaPath };
}

export function backupQuiescedContent(
  sourceDatabasePath: string,
  mediaRoot: string,
  destinationRoot: string,
): BackupResult {
  if (fs.existsSync(destinationRoot)) {
    throw new Error(`Backup destination already exists: ${destinationRoot}`);
  }

  fs.mkdirSync(destinationRoot, { recursive: true, mode: 0o750 });
  const databasePath = path.join(destinationRoot, 'content.sqlite');
  const mediaPath = path.join(destinationRoot, 'media');

  try {
    copyQuiescedDatabase(sourceDatabasePath, databasePath);
    fs.cpSync(mediaRoot, mediaPath, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  } catch (error) {
    fs.rmSync(destinationRoot, { recursive: true, force: true });
    throw error;
  }

  return { databasePath, mediaPath };
}
