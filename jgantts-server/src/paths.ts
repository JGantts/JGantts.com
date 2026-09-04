import path from 'node:path';

export const SERVER_ROOT = path.resolve(__dirname, '..');
export const SITE_ROOT = path.resolve(SERVER_ROOT, '../jgantts-com');
export const SITE_DIST_ROOT = path.join(SITE_ROOT, 'dist');
export const SITE_PUBLIC_ROOT = path.join(SITE_ROOT, 'PUBLIC');
export const SITE_INDEX_PATH = path.join(SITE_DIST_ROOT, 'index.html');
