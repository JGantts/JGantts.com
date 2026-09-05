import fs from 'node:fs';
import path from 'node:path';

export interface MediaDirectories {
  derived: string;
  originals: string;
}

export function ensureMediaDirectories(mediaRoot: string): MediaDirectories {
  const directories = {
    originals: path.join(mediaRoot, 'originals'),
    derived: path.join(mediaRoot, 'derived'),
  };

  fs.mkdirSync(directories.originals, { recursive: true, mode: 0o750 });
  fs.mkdirSync(directories.derived, { recursive: true, mode: 0o750 });
  return directories;
}
