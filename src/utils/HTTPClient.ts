/**
 * HTTP client with cookie jar for TikTok requests.
 * TokKit HTTPClient — fetch wrapper with cookie jar and retry logic.
 */

import Log from '../utils/Log.js';
import { DEFAULT_HEADERS, API_HEADERS, URLS } from '../utils/Constants.js';
import { getRandomUserAgent, TokKitError } from '../utils/Utils.js';

const TAG = 'HTTPClient';

export interface HTTPClientConfig {
  /** Custom user agent */
  userAgent?: string;
  /** HTTP proxy URL */
  proxy?: string;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
}

/**
 * Simple cookie jar — stores name=value pairs.
 */
export class CookieJar {
  readonly #cookies: Map<string, string> = new Map();

  set(name: string, value: string): void {
    this.#cookies.set(name, value);
  }

  get(name: string): string | undefined {
    return this.#cookies.get(name);
  }

  has(name: string): boolean {
    return this.#cookies.has(name);
  }

  delete(name: string): void {
    this.#cookies.delete(name);
  }

  /**
   * Parse Set-Cookie headers and store them.
   */
  parseSetCookieHeaders(headers: Headers): void {
    const setCookies = headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      const nameVal = cookie.split(';')[0];
      if (!nameVal) continue;
      const eqIdx = nameVal.indexOf('=');
      if (eqIdx === -1) continue;
      const name = nameVal.substring(0, eqIdx).trim();
      const value = nameVal.substring(eqIdx + 1).trim();
      if (name) {
        this.#cookies.set(name, value);
        Log.debug(TAG, `Cookie set: ${name}=${value.substring(0, 30)}...`);
      }
    }
  }

  /**
   * Serialize all cookies into a Cookie header string.
   */
  serialize(): string {
    return Array.from(this.#cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  get size(): number {
    return this.#cookies.size;
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.#cookies);
  }
}

/**
 * HTTP client that handles cookies, headers, and retries.
 */
export default class HTTPClient {
  readonly cookies: CookieJar;
  readonly userAgent: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(config: HTTPClientConfig = {}) {
    this.cookies = new CookieJar();
    this.userAgent = config.userAgent ?? getRandomUserAgent();
    this.#fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Make an HTML page request (for SSR extraction).
   */
  async fetchPage(url: string): Promise<{ html: string; status: number; headers: Headers }> {
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      'user-agent': this.userAgent,
      'upgrade-insecure-requests': '1',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'cache-control': 'max-age=0',
    };

    const cookieStr = this.cookies.serialize();
    if (cookieStr) {
      headers['cookie'] = cookieStr;
    }

    Log.debug(TAG, `GET (page) ${url}`);

    const res = await this.#fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
    });

    // Capture Set-Cookie headers
    this.cookies.parseSetCookieHeaders(res.headers);

    const html = await res.text();

    if (html.includes('SlardarWAF') || html.includes('_wafchallengeid')) {
      Log.warn(TAG, `WAF challenge on ${url}`);
    }

    return { html, status: res.status, headers: res.headers };
  }

  /**
   * Make a JSON API request.
   */
  async fetchAPI<T = unknown>(
    path: string,
    params: Record<string, string> = {},
    options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
  ): Promise<{ data: T; status: number }> {
    const url = new URL(path, URLS.BASE);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = {
      ...API_HEADERS,
      'user-agent': this.userAgent,
      ...(options.headers ?? {}),
    };

    const cookieStr = this.cookies.serialize();
    if (cookieStr) {
      headers['cookie'] = cookieStr;
    }

    if (options.body) {
      headers['content-type'] = 'application/json';
    }

    Log.debug(TAG, `${options.method ?? 'GET'} (api) ${url.toString().substring(0, 150)}`);

    const res = await this.#fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: 'follow',
    });

    this.cookies.parseSetCookieHeaders(res.headers);

    const text = await res.text();

    if (!text || text.length === 0) {
      throw new TokKitError(`Empty response from ${path} — endpoint likely requires X-Bogus signing`, {
        path, status: res.status
      });
    }

    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new TokKitError(`Non-JSON response from ${path}`, {
        path, status: res.status, body: text.substring(0, 200)
      });
    }

    // Check for TikTok API errors
    const anyData = data as Record<string, unknown>;
    if (anyData['status_msg'] === "url doesn't match") {
      throw new TokKitError(`API endpoint requires signing: ${path}`, {
        path, status_msg: anyData['status_msg']
      });
    }

    return { data, status: res.status };
  }
}
