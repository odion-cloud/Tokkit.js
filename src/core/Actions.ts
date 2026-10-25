/**
 * TokKit Actions — SSR extraction + API calling layer.
 * TokKit Actions — SSR extraction and API request orchestration.
 *
 * Two retrieval strategies:
 * 1. fetchSSR(url) — GET HTML, extract __UNIVERSAL_DATA_FOR_REHYDRATION__, return scope module
 * 2. fetchAPI(path, params) — GET /api/* endpoints, return JSON
 */

import type Session from './Session.js';
import Signer from './signing/Signer.js';
import type { SignerConfig } from './signing/Signer.js';
import Log from '../utils/Log.js';
import { URLS, REHYDRATION_SCRIPT_ID, DEFAULT_API_PARAMS } from '../utils/Constants.js';
import { TokKitError, WAFError, extractScriptById, safeJsonParse } from '../utils/Utils.js';

const TAG = 'Actions';

/** Raw rehydration scope data */
export type RehydrationScope = Record<string, unknown>;

/** Standard TikTok API response shape */
export interface ApiResponse<T = unknown> {
  data: T;
  statusCode?: number;
  status_code?: number;
  status_msg?: string;
  hasMore?: boolean;
  has_more?: number;
  cursor?: number | string;
  extra?: Record<string, unknown>;
}

export default class Actions {
  readonly session: Session;
  readonly signer: Signer;

  constructor(session: Session, signerConfig?: SignerConfig) {
    this.session = session;
    this.signer = new Signer(session.http.userAgent, signerConfig ?? {});
  }

  /**
   * Fetch a TikTok page and extract the __UNIVERSAL_DATA_FOR_REHYDRATION__ data.
   * Returns the __DEFAULT_SCOPE__ object containing all page-specific modules.
   */
  async fetchSSR(path: string): Promise<RehydrationScope> {
    const url = path.startsWith('http') ? path : `${URLS.BASE}${path}`;
    Log.debug(TAG, `fetchSSR: ${url}`);

    const { html, status } = await this.session.http.fetchPage(url);

    if (status !== 200) {
      throw new TokKitError(`SSR fetch failed: HTTP ${status} for ${path}`);
    }

    // Check for WAF challenge — retry with warmed cookie
    if (html.includes('SlardarWAF') || html.includes('_wafchallengeid')) {
      Log.warn(TAG, `WAF challenge on ${path}, warming cookie and retrying...`);

      // Warm the ttwid by fetching a page that doesn't WAF
      await this.session.http.fetchPage(`${URLS.BASE}/foryou`);

      // Retry original request with warmed cookie
      const retry = await this.session.http.fetchPage(url);
      if (retry.html.includes('SlardarWAF') || retry.html.includes('_wafchallengeid')) {
        throw new WAFError(`WAF challenge persists for ${path}. Profile pages may require authenticated session.`);
      }
      // Use retry result
      return this.#extractScope(retry.html, path);
    }

    return this.#extractScope(html, path);
  }

  #extractScope(html: string, path: string): RehydrationScope {
    const scriptContent = extractScriptById(html, REHYDRATION_SCRIPT_ID);
    if (!scriptContent) {
      throw new TokKitError(`Rehydration script not found in ${path}`);
    }

    const rehydration = safeJsonParse<Record<string, unknown>>(scriptContent);
    if (!rehydration) {
      throw new TokKitError(`Failed to parse rehydration data from ${path}`);
    }

    const scope = (rehydration['__DEFAULT_SCOPE__'] ?? rehydration) as RehydrationScope;
    Log.debug(TAG, `SSR scope keys: ${Object.keys(scope).join(', ')}`);

    return scope;
  }

  /**
   * Call a TikTok API endpoint (Tier 1 — no signing required).
   * Merges default API params automatically.
   */
  async fetchAPI<T = unknown>(
    path: string,
    params: Record<string, string | number> = {},
    options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    const mergedParams = this.#mergeParams(params);
    const { data, status } = await this.session.http.fetchAPI<ApiResponse<T>>(path, mergedParams, options);

    Log.debug(TAG, `API response: status=${status}, keys=${Object.keys(data as unknown as Record<string, unknown>).join(',')}`);

    return data;
  }

  /**
   * Call a TikTok API endpoint with X-Bogus signing (Tier 2).
   * Used for endpoints that return empty responses without signing.
   */
  async fetchSignedAPI<T = unknown>(
    path: string,
    params: Record<string, string | number> = {}
  ): Promise<ApiResponse<T>> {
    const mergedParams = this.#mergeParams(params);

    // Build the URL that needs signing
    const url = new URL(path, URLS.BASE);
    for (const [k, v] of Object.entries(mergedParams)) {
      url.searchParams.set(k, v);
    }

    // Sign the URL (adds X-Bogus param)
    const signedUrl = await this.signer.sign(url.toString());
    Log.debug(TAG, `Signed API: ${signedUrl.substring(0, 120)}...`);

    // Parse signed URL back to path + params
    const signedUrlObj = new URL(signedUrl);
    const signedParams: Record<string, string> = {};
    for (const [k, v] of signedUrlObj.searchParams.entries()) {
      signedParams[k] = v;
    }

    const { data, status } = await this.session.http.fetchAPI<ApiResponse<T>>(
      signedUrlObj.pathname,
      signedParams
    );

    Log.debug(TAG, `Signed API response: status=${status}`);

    return data;
  }

  /**
   * Merge user params with default API params.
   */
  #mergeParams(params: Record<string, string | number>): Record<string, string> {
    const merged: Record<string, string> = { ...DEFAULT_API_PARAMS };

    const wid = this.session.appContext?.webIdCreatedTime;
    if (wid) {
      merged['WebIdLastTime'] = wid;
    }

    for (const [k, v] of Object.entries(params)) {
      merged[k] = String(v);
    }

    return merged;
  }
}
