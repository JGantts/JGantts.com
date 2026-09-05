import fs from 'node:fs';
import path from 'node:path';
import type { ContentDatabase } from './database';

export interface BackupResult {
  databasePath: string;
  mediaPath: string;
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
