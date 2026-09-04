import fs from 'node:fs';
import path from 'node:path';
import { SERVER_ROOT } from './paths';

export interface BuildInfo {
  commitId: string;
  commitMessage: string;
}

export const DEV_BUILD_INFO: BuildInfo = {
  commitId: 'dev',
  commitMessage: 'Local development build',
};

const DEFAULT_BUILD_INFO_PATH = path.join(SERVER_ROOT, 'dist', 'build-info.json');

function isBuildInfo(value: unknown): value is BuildInfo {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BuildInfo>;
  return typeof candidate.commitId === 'string'
    && /^[0-9a-f]{40,64}$/i.test(candidate.commitId)
    && typeof candidate.commitMessage === 'string'
    && candidate.commitMessage.length > 0;
}

export function loadBuildInfo(
  buildInfoPath = DEFAULT_BUILD_INFO_PATH,
  environment: NodeJS.ProcessEnv = process.env,
): BuildInfo {
  if (environment.NODE_ENV !== 'production') {
    return DEV_BUILD_INFO;
  }

  try {
    const value: unknown = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    if (!isBuildInfo(value)) {
      throw new Error(`Build information at ${buildInfoPath} has an invalid shape.`);
    }
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Build information is missing at ${buildInfoPath}. Run npm run build.`);
    }
    throw error;
  }
}
