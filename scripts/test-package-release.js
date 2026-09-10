#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sourceScript = path.resolve(__dirname, 'package-release.js');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jgantts-packager-test-'));
process.on('exit', () => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

function write(relativePath, contents = '') {
  const destination = path.join(fixtureRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}

function git(...args) {
  return execFileSync('git', args, { cwd: fixtureRoot, encoding: 'utf8' }).trim();
}

write('scripts/package-release.js', fs.readFileSync(sourceScript));
write('jgantts-server/dist/server.js', 'module.exports = {};\n');
write('jgantts-server/serve.js', 'require("./dist/server");\n');
write('jgantts-server/package.json', '{"name":"fixture","version":"1.0.0"}\n');
write('jgantts-server/package-lock.json', '{"name":"fixture","version":"1.0.0","lockfileVersion":3,"packages":{}}\n');
write('jgantts-server/schema-compatibility.json', '{"schemaVersion":1}\n');
write('jgantts-com/dist/index.html', '<script src="/assets/index.js"></script>\n');
write('jgantts-com/dist/assets/index.js', 'console.log("fixture");\n');
write('jgantts-com/PUBLIC/favicon.png', 'png');
write('jgantts-com/PUBLIC/assets/maps/generated.pmtiles', 'must be excluded');
git('init', '-q');
git('config', 'user.name', 'Packager Test');
git('config', 'user.email', 'packager@example.invalid');
git('add', '.');
git('commit', '-qm', 'Fixture release');
const commit = git('rev-parse', 'HEAD');
write('jgantts-server/dist/build-info.json', `${JSON.stringify({ commitId: commit, commitMessage: 'Fixture release' })}\n`);

const success = spawnSync(process.execPath, ['scripts/package-release.js', 'artifact'], {
  cwd: fixtureRoot, encoding: 'utf8', env: { ...process.env, GITHUB_SHA: commit },
});
assert.equal(success.status, 0, success.stderr);
const expectedChecksum = fs.readFileSync(path.join(fixtureRoot, 'artifact/jgantts-site-release.tar.gz.sha256'), 'utf8').split(/\s+/, 1)[0];
const actualChecksum = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(fixtureRoot, 'artifact/jgantts-site-release.tar.gz'))).digest('hex');
assert.equal(actualChecksum, expectedChecksum);
const entries = execFileSync('tar', ['-tzf', 'artifact/jgantts-site-release.tar.gz'], {
  cwd: fixtureRoot, encoding: 'utf8',
});
assert.doesNotMatch(entries, /PUBLIC\/assets\/maps/);
assert.match(entries, /release-manifest\.json/);

const mismatch = spawnSync(process.execPath, ['scripts/package-release.js', 'mismatch'], {
  cwd: fixtureRoot, encoding: 'utf8', env: { ...process.env, GITHUB_SHA: 'f'.repeat(40) },
});
assert.notEqual(mismatch.status, 0);
assert.match(mismatch.stderr, /does not match expected commit/);

fs.symlinkSync('favicon.png', path.join(fixtureRoot, 'jgantts-com/PUBLIC/favicon-link.png'));
const symlink = spawnSync(process.execPath, ['scripts/package-release.js', 'symlink'], {
  cwd: fixtureRoot, encoding: 'utf8', env: { ...process.env, GITHUB_SHA: commit },
});
assert.notEqual(symlink.status, 0);
assert.match(symlink.stderr, /Unexpected symlink/);

console.log('Release packager identity, checksum, exclusion, and symlink tests passed.');
