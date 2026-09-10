import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SERVER_ROOT } from '../paths';

interface SchemaCompatibility {
  schemaVersion: number;
  minimumDatabaseVersion: number;
  maximumDatabaseVersion: number;
  releaseDatabaseVersion: number;
  expandContractRequiredAfterVersion: number;
  migrationPolicy: 'expand-contract';
}

function loadCompatibility(): SchemaCompatibility {
  const policyPath = path.join(SERVER_ROOT, 'schema-compatibility.json');
  const value = JSON.parse(fs.readFileSync(policyPath, 'utf8')) as Partial<SchemaCompatibility>;
  if (
    value.schemaVersion !== 1
    || !Number.isSafeInteger(value.minimumDatabaseVersion)
    || !Number.isSafeInteger(value.maximumDatabaseVersion)
    || value.minimumDatabaseVersion! < 0
    || value.maximumDatabaseVersion! < value.minimumDatabaseVersion!
    || !Number.isSafeInteger(value.releaseDatabaseVersion)
    || value.releaseDatabaseVersion! < value.minimumDatabaseVersion!
    || value.releaseDatabaseVersion! > value.maximumDatabaseVersion!
    || !Number.isSafeInteger(value.expandContractRequiredAfterVersion)
    || value.migrationPolicy !== 'expand-contract'
  ) {
    throw new Error(`Invalid schema compatibility policy: ${policyPath}`);
  }
  return value as SchemaCompatibility;
}

export function inspectDatabaseVersion(databasePath: string): number {
  if (!fs.existsSync(databasePath)) return 0;
  const database = new Database(databasePath, { fileMustExist: true, readonly: true });
  try {
    const tableExists = database.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
    ).pluck().get();
    if (!tableExists) return 0;
    const version = database.prepare('SELECT COALESCE(MAX(version), 0) FROM schema_migrations').pluck().get();
    if (!Number.isSafeInteger(version) || Number(version) < 0) {
      throw new Error('Database schema version is invalid.');
    }
    return Number(version);
  } finally {
    database.close();
  }
}

export function assertSchemaCompatible(databasePath: string): {
  databaseVersion: number;
  maximumDatabaseVersion: number;
  minimumDatabaseVersion: number;
} {
  const policy = loadCompatibility();
  const databaseVersion = inspectDatabaseVersion(databasePath);
  if (databaseVersion < policy.minimumDatabaseVersion || databaseVersion > policy.maximumDatabaseVersion) {
    throw new Error(
      `Database schema ${databaseVersion} is outside supported range ${policy.minimumDatabaseVersion}-${policy.maximumDatabaseVersion}.`,
    );
  }
  return {
    databaseVersion,
    maximumDatabaseVersion: policy.maximumDatabaseVersion,
    minimumDatabaseVersion: policy.minimumDatabaseVersion,
  };
}

if (require.main === module) {
  const dataRoot = process.argv[2];
  if (!dataRoot || !path.isAbsolute(dataRoot) || dataRoot === path.parse(dataRoot).root) {
    throw new Error('Pass a non-root absolute data directory.');
  }
  process.stdout.write(`${JSON.stringify(assertSchemaCompatible(path.join(dataRoot, 'content.sqlite')))}\n`);
}
