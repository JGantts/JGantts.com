import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export interface StructuredLogger {
  error(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
}

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|request_?body/i;

function safeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return '[redacted]';
  if (value instanceof Error) {
    return { message: value.message.slice(0, 2_000), name: value.name };
  }
  if (typeof value === 'string') return value.slice(0, 4_000);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => safeValue('', item));
  if (typeof value === 'object' && value) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).slice(0, 50)
        .map(([nestedKey, nestedValue]) => [nestedKey, safeValue(nestedKey, nestedValue)]),
    );
  }
  return String(value);
}

export function createStructuredLogger(
  write: (line: string, level: LogLevel) => void = (line, level) => {
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${line}\n`);
  },
): StructuredLogger {
  const log = (level: LogLevel, event: string, fields: LogFields = {}) => {
    const safeFields = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, safeValue(key, value)]),
    );
    write(JSON.stringify({ ...safeFields, timestamp: new Date().toISOString(), level, event }), level);
  };
  return {
    error: (event, fields) => log('error', event, fields),
    info: (event, fields) => log('info', event, fields),
    warn: (event, fields) => log('warn', event, fields),
  };
}

export const NOOP_LOGGER: StructuredLogger = {
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

export function createRequestLogger(logger: StructuredLogger): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();
    const requestPath = req.path;
    const startedAt = process.hrtime.bigint();
    res.set('X-Request-Id', requestId);
    res.once('finish', () => {
      logger.info('http_request_completed', {
        durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
        method: req.method,
        path: requestPath,
        requestId,
        status: res.statusCode,
      });
    });
    next();
  };
}
