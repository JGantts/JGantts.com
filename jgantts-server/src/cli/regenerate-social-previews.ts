import { getRuntimeConfig } from '../config';
import { openContentDatabase } from '../db/database';
import { MediaRepository } from '../media/media-repository';
import { PostRepository } from '../posts/post-repository';
import { SocialPreviewRepository } from '../social-preview/social-preview-repository';
import { SocialPreviewService } from '../social-preview/social-preview-service';

function concurrencyFrom(arguments_: string[]): number {
  if (arguments_.length > 1 || (arguments_[0] && !arguments_[0].startsWith('--concurrency='))) {
    throw new Error('Usage: npm run social-previews:regenerate -- [--concurrency=1-8]');
  }
  const concurrency = arguments_[0] ? Number(arguments_[0].slice(14)) : 2;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error('--concurrency must be an integer from 1 through 8.');
  }
  return concurrency;
}

async function main(): Promise<void> {
  const concurrency = concurrencyFrom(process.argv.slice(2));
  const config = getRuntimeConfig();
  const database = openContentDatabase(config.databasePath);
  try {
    const posts = new PostRepository(database);
    const service = new SocialPreviewService(
      new SocialPreviewRepository(database),
      new MediaRepository(database),
      posts,
      config.mediaRoot,
    );
    const results = await service.generateAll({ concurrency });
    for (const result of results) {
      console.log(`${result.state}: ${result.postId}${result.error ? `: ${result.error}` : ''}`);
    }
    const failures = results.filter((item) => item.state === 'failed').length;
    const generated = results.filter((item) => item.state === 'current').length;
    console.log(`Generated ${generated}; no photos ${results.length - generated - failures}; failed ${failures}.`);
    if (failures) process.exitCode = 1;
  } finally {
    database.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
