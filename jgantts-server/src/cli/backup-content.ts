import path from 'node:path';
import { backupContent } from '../db/backup';
import { openContentDatabase } from '../db/database';
import { getRuntimeConfig } from '../config';

async function main(): Promise<void> {
  const destinationArgument = process.argv[2];
  if (!destinationArgument) {
    throw new Error('Usage: npm run content:backup -- /absolute/path/to/new-backup-directory');
  }

  const destinationRoot = path.resolve(destinationArgument);
  const config = getRuntimeConfig();
  const database = openContentDatabase(config.databasePath);
  try {
    const result = await backupContent(database, config.mediaRoot, destinationRoot);
    console.log(`Database backup: ${result.databasePath}`);
    console.log(`Media backup: ${result.mediaPath}`);
  } finally {
    database.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
