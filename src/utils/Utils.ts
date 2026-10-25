/**
 * TokKit error classes and utility functions.
 * TokKit utility helpers — error classes, validation, and JSON parsing.
 */

export class TokKitError extends Error {
  readonly date: Date;
  readonly version = '0.1.0';
  info?: Record<string, unknown>;

  constructor(message: string, info?: Record<string, unknown>) {
    super(message);
    this.name = 'TokKitError';
    this.date = new Date();
    if (info) this.info = info;
  }
}

export class SessionError extends TokKitError {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class ParserError extends TokKitError {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}

export class WAFError extends TokKitError {
  constructor(message: string) {
    super(message);
    this.name = 'WAFError';
  }
}

/**
 * Throw if any of the given params are missing.
 */
export function throwIfMissing(params: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      throw new TokKitError(`Missing required parameter: ${key}`);
    }
  }
}

/**
 * Get a random desktop user-agent string.
 */
export function getRandomUserAgent(): string {
  const versions = ['131', '132', '133', '134', '135'];
  const ver = versions[Math.floor(Math.random() * versions.length)];
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`;
}

/**
 * Safely parse JSON, returning null on failure.
 */
export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Extract a named script tag's text content from HTML.
 */
export function extractScriptById(html: string, id: string): string | null {
  const regex = new RegExp(`<script[^>]+id="${escapeRegex(id)}"[^>]*>([\\s\\S]*?)<\\/script>`);
  const match = html.match(regex);
  return match ? match[1] : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
