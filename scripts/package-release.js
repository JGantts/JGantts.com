#!/usr/bin/env node

'use strict';

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const startedAt = Date.now();
const outputDirectory = path.resolve(process.argv[2] || path.join(repositoryRoot, 'release-artifact'));
const archiveName = 'jgantts-site-release.tar.gz';
const archivePath = path.join(outputDirectory, archiveName);
const checksumPath = `${archivePath}.sha256`;

function fail(message) {
  throw new Error(message);
}

function command(name, args, options = {}) {
  return execFileSync(name, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  }).trim();
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function fileRecord(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  const stat = fs.statSync(absolutePath);
  return { path: relativePath, sha256: sha256(absolutePath), bytes: stat.size };
}

function assertRegularTree(sourceRoot, ignoredRelativePaths = new Set()) {
  function visit(current, relative = '') {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const childRelative = path.posix.join(relative, entry.name);
      if (ignoredRelativePaths.has(childRelative)) continue;
      if (entry.isSymbolicLink()) fail(`Unexpected symlink in release source: ${childRelative}`);
      if (entry.isDirectory()) visit(path.join(current, entry.name), childRelative);
      else if (!entry.isFile()) fail(`Unexpected non-file in release source: ${childRelative}`);
    }
  }
  visit(sourceRoot);
}

function copyDirectory(source, destination, filter = () => true) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (!filter(sourcePath, entry)) continue;
    if (entry.isSymbolicLink()) fail(`Unexpected symlink in release source: ${sourcePath}`);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath, filter);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, destinationPath);
    else fail(`Unexpected non-file in release source: ${sourcePath}`);
  }
}

function listFiles(root, current = root) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) return listFiles(root, absolutePath);
    if (!entry.isFile()) fail(`Unexpected non-file in staged release: ${absolutePath}`);
    return [path.relative(root, absolutePath).split(path.sep).join('/')];
  }).sort();
}

const requiredSources = [
  'jgantts-server/dist/server.js',
  'jgantts-server/dist/build-info.json',
  'jgantts-server/serve.js',
  'jgantts-server/package.json',
  'jgantts-server/package-lock.json',
  'jgantts-server/schema-compatibility.json',
  'jgantts-com/dist/index.html',
  'jgantts-com/PUBLIC',
];
for (const relativePath of requiredSources) {
  if (!fs.existsSync(path.join(repositoryRoot, relativePath))) fail(`Required release input is missing: ${relativePath}`);
}

const clientFiles = listFiles(path.join(repositoryRoot, 'jgantts-com/dist'));
if (!clientFiles.some((name) => name.startsWith('assets/') && name.endsWith('.js'))) {
  fail('Client build has no compiled JavaScript asset.');
}
assertRegularTree(path.join(repositoryRoot, 'jgantts-server/dist'));
assertRegularTree(path.join(repositoryRoot, 'jgantts-com/dist'));
assertRegularTree(path.join(repositoryRoot, 'jgantts-com/PUBLIC'), new Set(['assets/maps']));

const commitId = command('git', ['rev-parse', 'HEAD']);
const expectedCommit = (process.env.GITHUB_SHA || commitId).trim();
if (commitId !== expectedCommit) fail(`Checked-out commit ${commitId} does not match expected commit ${expectedCommit}.`);
const commitMessage = command('git', ['log', '-1', '--format=%s', commitId]);
const buildInfo = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'jgantts-server/dist/build-info.json'), 'utf8'));
if (buildInfo.commitId !== commitId || buildInfo.commitMessage !== commitMessage) {
  fail('Server build identity does not match the checked-out commit. Rebuild before packaging.');
}

fs.mkdirSync(outputDirectory, { recursive: true });
fs.rmSync(archivePath, { force: true });
fs.rmSync(checksumPath, { force: true });
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-release-'));
const releaseRoot = path.join(temporaryRoot, commitId);

try {
  const serverDestination = path.join(releaseRoot, 'jgantts-server');
  const clientDestination = path.join(releaseRoot, 'jgantts-com');
  copyDirectory(path.join(repositoryRoot, 'jgantts-server/dist'), path.join(serverDestination, 'dist'));
  for (const filename of ['serve.js', 'package.json', 'package-lock.json', 'schema-compatibility.json']) {
    fs.copyFileSync(path.join(repositoryRoot, 'jgantts-server', filename), path.join(serverDestination, filename));
  }
  copyDirectory(path.join(repositoryRoot, 'jgantts-com/dist'), path.join(clientDestination, 'dist'));
  copyDirectory(
    path.join(repositoryRoot, 'jgantts-com/PUBLIC'),
    path.join(clientDestination, 'PUBLIC'),
    (sourcePath) => path.relative(path.join(repositoryRoot, 'jgantts-com/PUBLIC'), sourcePath).split(path.sep).join('/') !== 'assets/maps',
  );

  const payloadFiles = listFiles(releaseRoot).map((relativePath) => fileRecord(releaseRoot, relativePath));
  const payloadDigest = crypto.createHash('sha256')
    .update(payloadFiles.map((record) => `${record.sha256}  ${record.bytes}  ${record.path}\n`).join(''))
    .digest('hex');
  const manifest = {
    schemaVersion: 1,
    release: {
      commitId,
      commitMessage,
      workflowRunId: process.env.GITHUB_RUN_ID || 'local',
      workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT || 'local',
      builtAt: new Date().toISOString(),
      nodeVersion: process.version,
      npmVersion: command('npm', ['--version']),
    },
    artifact: {
      format: 'tar.gz',
      payloadSha256: payloadDigest,
      payloadBytes: payloadFiles.reduce((total, record) => total + record.bytes, 0),
      fileCount: payloadFiles.length,
    },
    expectedPaths: {
      serverEntry: 'jgantts-server/dist/server.js',
      serverLauncher: 'jgantts-server/serve.js',
      clientIndex: 'jgantts-com/dist/index.html',
      publicRoot: 'jgantts-com/PUBLIC',
      mapsMount: 'jgantts-com/PUBLIC/assets/maps',
    },
    criticalFiles: [
      'jgantts-server/dist/server.js',
      'jgantts-server/dist/build-info.json',
      'jgantts-server/serve.js',
      'jgantts-server/package.json',
      'jgantts-server/package-lock.json',
      'jgantts-server/schema-compatibility.json',
      'jgantts-com/dist/index.html',
    ].map((relativePath) => fileRecord(releaseRoot, relativePath)),
  };
  fs.writeFileSync(path.join(releaseRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  command('tar', ['-czf', archivePath, '-C', temporaryRoot, commitId]);
  const archiveChecksum = sha256(archivePath);
  fs.writeFileSync(checksumPath, `${archiveChecksum}  ${archiveName}\n`);
  console.log(JSON.stringify({
    event: 'release_build_completed', archivePath, checksumPath, archiveChecksum,
    commitId, durationMs: Date.now() - startedAt,
  }));
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
