import path from 'node:path';
import { backupContent, backupQuiescedContent } from '../db/backup';
import { openContentDatabaseReadOnly } from '../db/database';
import { getRuntimeConfig } from '../config';

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const quiesced = arguments_[0] === '--quiesced';
  const destinationArgument = arguments_[quiesced ? 1 : 0];
  if (!destinationArgument || arguments_.length !== (quiesced ? 2 : 1)) {
    throw new Error('Usage: npm run content:backup -- [--quiesced] /absolute/path/to/new-backup-directory');
  }

  const destinationRoot = path.resolve(destinationArgument);
  const config = getRuntimeConfig();
  if (quiesced) {
    const result = backupQuiescedContent(
      config.databasePath,
      config.mediaRoot,
      destinationRoot,
    );
    console.log(`Database backup: ${result.databasePath}`);
    console.log(`Media backup: ${result.mediaPath}`);
    return;
  }

  const database = openContentDatabaseReadOnly(config.databasePath);
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
