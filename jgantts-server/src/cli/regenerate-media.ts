import { getRuntimeConfig } from '../config';
import { openContentDatabase } from '../db/database';
import { MediaRepository } from '../media/media-repository';
import { MediaService } from '../media/media-service';
import { PostRepository } from '../posts/post-repository';

function parseArguments(arguments_: string[]): { concurrency: number; dryRun: boolean } {
  let concurrency = 2;
  let dryRun = false;
  for (const argument of arguments_) {
    if (argument === '--dry-run') dryRun = true;
    else if (argument.startsWith('--concurrency=')) concurrency = Number(argument.slice(14));
    else throw new Error('Usage: npm run media:regenerate -- [--dry-run] [--concurrency=1-8]');
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error('--concurrency must be an integer from 1 through 8.');
  }
  return { concurrency, dryRun };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const config = getRuntimeConfig();
  const database = openContentDatabase(config.databasePath);
  try {
    const service = new MediaService(
      new MediaRepository(database), new PostRepository(database), config.mediaRoot,
    );
    const results = await service.regenerateAll(options);
    for (const result of results) {
      const detail = result.error ? `: ${result.error}` : ` (${result.renditionCount} renditions)`;
      console.log(`${result.status}: ${result.id}${detail}`);
    }
    const failures = results.filter(({ status }) => status === 'failed').length;
    console.log(`${options.dryRun ? 'Planned' : 'Regenerated'} ${results.length - failures}; failed ${failures}.`);
    if (failures) process.exitCode = 1;
  } finally {
    database.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
