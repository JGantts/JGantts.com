import fs from 'node:fs';
import path from 'node:path';
import { backupContent, backupQuiescedContent, copyQuiescedDatabase } from '../db/backup';
import { openContentDatabaseReadOnly } from '../db/database';
import { getRuntimeConfig } from '../config';

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const quiesced = arguments_[0] === '--quiesced';
  const databaseOnly = arguments_[0] === '--quiesced-database';
  const destinationArgument = arguments_[quiesced || databaseOnly ? 1 : 0];
  if (!destinationArgument || arguments_.length !== (quiesced || databaseOnly ? 2 : 1)) {
    throw new Error('Usage: npm run content:backup -- [--quiesced|--quiesced-database] /absolute/destination');
  }

  const destinationRoot = path.resolve(destinationArgument);
  const config = getRuntimeConfig();
  if (databaseOnly) {
    fs.mkdirSync(path.dirname(destinationRoot), { recursive: true, mode: 0o750 });
    copyQuiescedDatabase(config.databasePath, destinationRoot);
    console.log(`Database backup: ${destinationRoot}`);
    return;
  }
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
