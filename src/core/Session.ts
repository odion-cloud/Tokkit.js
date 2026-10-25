/**
 * TokKit Session — manages device identity, cookies, and app context.
 * TokKit Session — manages cookies, identity, and app context.
 *
 * Auto-acquires `ttwid` cookie from TikTok on creation.
 * Optionally accepts a `sessionid` for authenticated operations.
 */

import HTTPClient from '../utils/HTTPClient.js';
import Log from '../utils/Log.js';
import { URLS, REHYDRATION_SCRIPT_ID, SCOPE_KEYS } from '../utils/Constants.js';
import { SessionError, extractScriptById, safeJsonParse } from '../utils/Utils.js';
import type { SignerFunction } from './signing/Signer.js';

const TAG = 'Session';

export interface TokKitConfig {
  /** Language code (default: 'en') */
  lang?: string;
  /** Region code (default: auto-detected from TikTok response) */
  region?: string;
  /** Custom user agent string */
  userAgent?: string;
  /** Session ID cookie for authenticated requests (from browser) */
  sessionId?: string;
  /** Additional cookies as a Record */
  cookies?: Record<string, string>;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
  /** Custom X-Bogus signer function (for Tier 2 endpoints) */
  signer?: SignerFunction;
  /** External X-Bogus signer service URL */
  signerServiceUrl?: string;
}

export interface AppContext {
  language: string;
  region: string;
  appId: number;
  appType: string;
  wid: string;
  nonce: string;
  csrfToken: string;
  webIdCreatedTime: string;
}

export default class Session {
  readonly http: HTTPClient;
  readonly config: Required<Pick<TokKitConfig, 'lang' | 'region'>>;
  #appContext: AppContext | null = null;
  #loggedIn: boolean = false;

  private constructor(http: HTTPClient, config: TokKitConfig) {
    this.http = http;
    this.config = {
      lang: config.lang ?? 'en',
      region: config.region ?? 'US',
    };
  }

  /**
   * Create and initialize a new Session.
   * Fetches the FYP page to acquire ttwid + app context.
   */
  static async create(config: TokKitConfig = {}): Promise<Session> {
    Log.info(TAG, 'Creating new session...');

    const http = new HTTPClient({
      userAgent: config.userAgent,
      fetch: config.fetch,
    });

    // Apply any user-provided cookies
    if (config.cookies) {
      for (const [name, value] of Object.entries(config.cookies)) {
        http.cookies.set(name, value);
      }
    }

    // Apply sessionid if provided
    if (config.sessionId) {
      http.cookies.set('sessionid', config.sessionId);
    }

    const session = new Session(http, config);
    await session.#initialize();

    return session;
  }

  async #initialize(): Promise<void> {
    Log.info(TAG, 'Acquiring ttwid and app context from TikTok...');

    // Step 1: Device registration — POST to /ttwid/union/register/
    // Learned from sangzun-han/Tiktok-Api reference repo
    await this.#registerDevice();

    // Step 2: Fetch the FYP page — this gives us cookies + SSR data
    const { html, status } = await this.http.fetchPage(`${URLS.BASE}/foryou`);

    if (status !== 200) {
      throw new SessionError(`Failed to initialize session: HTTP ${status}`);
    }

    // Verify we got ttwid
    if (!this.http.cookies.has('ttwid')) {
      throw new SessionError('Failed to acquire ttwid cookie from TikTok');
    }

    Log.info(TAG, `ttwid acquired: ${this.http.cookies.get('ttwid')?.substring(0, 30)}...`);

    // Extract app context from rehydration data
    const scriptContent = extractScriptById(html, REHYDRATION_SCRIPT_ID);
    if (scriptContent) {
      const rehydration = safeJsonParse<Record<string, unknown>>(scriptContent);
      if (rehydration) {
        const scope = (rehydration['__DEFAULT_SCOPE__'] ?? rehydration) as Record<string, unknown>;
        const appCtx = scope[SCOPE_KEYS.APP_CONTEXT] as Record<string, unknown> | undefined;

        if (appCtx) {
          this.#appContext = {
            language: (appCtx['language'] as string) ?? this.config.lang,
            region: (appCtx['region'] as string) ?? this.config.region,
            appId: (appCtx['appId'] as number) ?? 1233,
            appType: (appCtx['appType'] as string) ?? 'm',
            wid: (appCtx['wid'] as string) ?? '',
            nonce: (appCtx['nonce'] as string) ?? '',
            csrfToken: (appCtx['csrfToken'] as string) ?? '',
            webIdCreatedTime: (appCtx['webIdCreatedTime'] as string) ?? '',
          };

          // Update region from actual response
          this.config.region = this.#appContext.region;

          Log.info(TAG, `App context: region=${this.#appContext.region}, appId=${this.#appContext.appId}, wid=${this.#appContext.wid.substring(0, 10)}...`);
        }
      }
    }

    // Step 3: Bootstrap msToken via /api/recommend/item_list/
    // Without a valid msToken, signed API endpoints return empty 200s
    await this.#bootstrapMsToken();

    // Check if logged in
    this.#loggedIn = this.http.cookies.has('sessionid');
    Log.info(TAG, `Session ready. Logged in: ${this.#loggedIn}, msToken: ${this.msToken ? 'acquired' : 'absent'}`);
  }

  /**
   * Register device via POST to /ttwid/union/register/.
   * This is how TikTok's web client obtains the initial ttwid.
   * Learned from sangzun-han/Tiktok-Api.
   */
  async #registerDevice(): Promise<void> {
    try {
      const url = `${URLS.BASE}/ttwid/union/register/`;
      const body = JSON.stringify({
        region: this.config.region,
        aid: 1988,
        needFid: false,
        service: 'www.tiktok.com',
        migrate_info: { ticket: '', source: 'node' },
        cbUrlProtocol: 'https',
        union: true,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': this.http.userAgent,
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        body,
      });

      // Extract Set-Cookie headers for ttwid
      const setCookies = response.headers.getSetCookie?.() ?? [];
      for (const cookie of setCookies) {
        const [nameVal] = cookie.split(';');
        const [name, ...valParts] = nameVal.split('=');
        if (name && valParts.length > 0) {
          this.http.cookies.set(name.trim(), valParts.join('=').trim());
          Log.debug(TAG, `Device registration: cookie set: ${name.trim()}`);
        }
      }

      Log.debug(TAG, `Device registration: HTTP ${response.status}`);
    } catch (e) {
      // Non-fatal — fallback to page-load cookies
      Log.warn(TAG, `Device registration failed (non-fatal): ${(e as Error).message}`);
    }
  }

  /**
   * Bootstrap msToken by making a request to /api/recommend/item_list/.
   * TikTok's edge sets the msToken cookie on API responses.
   * Without msToken, signed endpoints return empty 200 bodies.
   */
  async #bootstrapMsToken(): Promise<void> {
    try {
      const wid = this.#appContext?.wid ?? '';
      const params: Record<string, string> = {
        aid: '1988',
        count: '6',
        app_name: 'tiktok_web',
        device_platform: 'web_pc',
        device_id: wid,
        region: this.config.region,
        priority_region: this.config.region,
      };

      const { status } = await this.http.fetchAPI('/api/recommend/item_list/', params);

      if (this.http.cookies.has('msToken')) {
        Log.info(TAG, `msToken bootstrapped: ${this.http.cookies.get('msToken')?.substring(0, 30)}...`);
      } else {
        Log.warn(TAG, 'msToken not received from bootstrap call — signed endpoints may return empty');
      }
    } catch (e) {
      Log.warn(TAG, `msToken bootstrap failed (non-fatal): ${(e as Error).message}`);
    }
  }

  get appContext(): AppContext | null {
    return this.#appContext;
  }

  get logged_in(): boolean {
    return this.#loggedIn;
  }

  get ttwid(): string | undefined {
    return this.http.cookies.get('ttwid');
  }

  get csrfToken(): string | undefined {
    return this.http.cookies.get('tt_csrf_token');
  }

  get msToken(): string | undefined {
    return this.http.cookies.get('msToken');
  }
}
