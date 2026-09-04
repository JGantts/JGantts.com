#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(serverRoot, '..');
const outputPath = path.join(serverRoot, 'dist', 'build-info.json');

function runGit(argumentsList) {
  return execFileSync('git', argumentsList, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function environmentValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

const commitCandidate = environmentValue('COMMIT_SHA', 'GITHUB_SHA');
const commitId = /^[0-9a-f]{40,64}$/i.test(commitCandidate)
  ? commitCandidate
  : runGit(['rev-parse', commitCandidate || 'HEAD']);
const commitMessage = environmentValue('COMMIT_MESSAGE')
  || runGit(['log', '-1', '--format=%s', commitId]);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ commitId, commitMessage }, null, 2)}\n`);
console.log(`Wrote build information for ${commitId}`);
