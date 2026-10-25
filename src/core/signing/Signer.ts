/**
 * TokKit Signer — X-Bogus / X-Dynosaur / X-Gnarly URL signing.
 *
 * Ported from:
 * - justscrapeme/tiktok-web-reverse-engineering (X-Bogus v5.1.0 ChaCha cipher)
 * - sangzun-han/Tiktok-Api (X-Dynosaur + X-Gnarly v5.3.2)
 *
 * This module provides a pluggable signing architecture:
 * 1. Built-in signer: reverse-engineered X-Bogus (ChaCha-based, real algorithm)
 * 2. Custom signer: user can provide their own signing function
 * 3. External signer: proxy to an external signing service
 */

import { md5 as md5Hex, getRandomBytes } from '../../utils/CryptoShim.js';
import Log from '../../utils/Log.js';
import { TokKitError } from '../../utils/Utils.js';

const TAG = 'Signer';

// ═══════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════

/** Signing result */
export interface SignResult {
  /** The X-Bogus parameter value */
  xBogus: string;
  /** X-Dynosaur value (modern signing) */
  xDynosaur?: string;
  /** X-Gnarly value (modern signing) */
  xGnarly?: string;
  /** Optional msToken */
  msToken?: string;
}

/** Custom signer function signature */
export type SignerFunction = (url: string, userAgent: string) => Promise<SignResult> | SignResult;

/** Signer configuration */
export interface SignerConfig {
  /** Custom signer function — overrides built-in signer */
  signer?: SignerFunction;
  /** External signer service URL (REST API) */
  signerServiceUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ChaCha Constants (from TikTok's webmssdk)
// ═══════════════════════════════════════════════════════════════════

const MASK32 = 0xffffffff;
const ENVELOPE_TAG = 0x4b; // 75 decimal

/** Custom base64 alphabet used by TikTok's SDK */
const ALPHABET = 'u09tbS3UvgDEe6r-ZVMXzLpsAohTn7mdINQlW412GqBjfYiyk8JORCF5/xKHwacP';
const STANDARD_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** ChaCha initial constants (not standard "expand 32-byte k") */
const CHACHA_INIT: readonly number[] = [1196819126, 600974999, 3863347763, 1451689750];

/** FNV-1a hash constants */
const FNV_OFFSET = 2166136260;
const FNV_PRIME = 16777619;

const KEY_WORDS = 12;

/** SDK version info */
const DEFAULT_SDK_VERSION = '5.3.2';
const DEFAULT_SCM_VERSION = '2.0.0.561';

/** Environment codes */
const ENV_CODE = 65;
const UB_CODE = 8;

/** Canvas and device fingerprint stubs for headless */
const VM_STATE_HASH = 0xc46ce353;
const CANVAS_HASH = '-1';
const WEBGL_HASH = '0';
const COMPONENT_VERSION = '0';
const DEVICE_HASH = '0';
const DEFAULT_PAGE = 'www.tiktok.com/';
const CALL_SEQUENCE_START = 1;

/** Field encoders: [xorBase, addBase, preXor, rotate, postAdd] */
const ENCODER_A: readonly [number, number, number | null, number, number] = [103, 1, null, 2, 1];
const ENCODER_B: readonly [number, number, number | null, number, number] = [102, 0, 165, 1, 0];

// ═══════════════════════════════════════════════════════════════════
// ChaCha20 Core (Quarter-round, keystream, crypt)
// ═══════════════════════════════════════════════════════════════════

function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function quarterRound(s: number[], a: number, b: number, c: number, d: number): void {
  s[a] = (s[a] + s[b]) >>> 0; s[d] = (s[d] ^ s[a]) >>> 0; s[d] = rotl(s[d], 16);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = (s[b] ^ s[c]) >>> 0; s[b] = rotl(s[b], 12);
  s[a] = (s[a] + s[b]) >>> 0; s[d] = (s[d] ^ s[a]) >>> 0; s[d] = rotl(s[d], 8);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = (s[b] ^ s[c]) >>> 0; s[b] = rotl(s[b], 7);
}

function chachaKeystream(state: readonly number[], rounds: number): number[] {
  const w = [...state];
  let done = 0;
  while (done < rounds) {
    quarterRound(w, 0, 4, 8, 12); quarterRound(w, 1, 5, 9, 13);
    quarterRound(w, 2, 6, 10, 14); quarterRound(w, 3, 7, 11, 15);
    done += 1;
    if (done >= rounds) break;
    quarterRound(w, 0, 5, 10, 15); quarterRound(w, 1, 6, 11, 12);
    quarterRound(w, 2, 7, 12, 13); quarterRound(w, 3, 4, 13, 14);
    done += 1;
  }
  return w.map((word, i) => (word + state[i]) >>> 0);
}

function chachaCrypt(key: readonly number[], rounds: number, payload: Buffer): Buffer {
  const state = [...CHACHA_INIT, ...key.map(w => w >>> 0)];
  const len = payload.length;
  const wordCount = Math.ceil(len / 4);
  const words = new Array<number>(wordCount);

  for (let i = 0; i < wordCount; i++) {
    const slice = Buffer.alloc(4);
    payload.copy(slice, 0, i * 4, Math.min(i * 4 + 4, len));
    words[i] = slice.readUInt32LE(0);
  }

  let offset = 0;
  while (offset + 16 < wordCount) {
    const block = chachaKeystream(state, rounds);
    state[12] = (state[12] + 1) >>> 0;
    for (let i = 0; i < 16; i++) words[offset + i] = (words[offset + i] ^ block[i]) >>> 0;
    offset += 16;
  }
  const block = chachaKeystream(state, rounds);
  for (let i = 0; i < wordCount - offset; i++) {
    words[offset + i] = (words[offset + i] ^ block[i]) >>> 0;
  }

  const out = Buffer.alloc(wordCount * 4);
  words.forEach((word, i) => out.writeUInt32LE(word >>> 0, i * 4));
  return out.subarray(0, len);
}

// ═══════════════════════════════════════════════════════════════════
// Encoding & Hashing Helpers
// ═══════════════════════════════════════════════════════════════════

function toCustomAlphabet(standard: string): string {
  let out = '';
  for (const ch of standard) {
    const idx = STANDARD_B64.indexOf(ch);
    out += idx >= 0 ? ALPHABET[idx] : ch;
  }
  return out;
}

function hashState(text: string): number {
  let value = FNV_OFFSET;
  for (const byte of Buffer.from(text, 'utf8')) {
    const step = Math.imul(value ^ byte, FNV_PRIME) >>> 0;
    value = (step + Math.imul(step, 32)) >>> 0;
  }
  return value;
}

function encodeField(text: string, config: readonly [number, number, number | null, number, number]): Buffer {
  const [xorBase, addBase, preXor, rotate, postAdd] = config;
  const chars = Array.from(text);
  const size = Math.max(chars.length + 2, 6);
  const out = Buffer.alloc(size);

  chars.forEach((char, index) => {
    let value = (char.codePointAt(0)! ^ (xorBase + index)) & MASK32;
    value = (value + addBase + (170 & index)) % 256;
    if (preXor !== null) value ^= preXor;
    value = ((value << rotate) | (value >> (8 - rotate))) & 0xff;
    out[index] = ((value ^ 187) + postAdd) % 256;
  });

  for (let index = chars.length; index < size - 2; index++) {
    out[index] = (221 + index) & 0xff;
  }
  out[size - 2] = 0;
  out[size - 1] = chars.length;
  return out;
}

function be(value: number, size: number): Buffer {
  const out = Buffer.alloc(size);
  out.writeUIntBE(value >>> 0, 0, size);
  return out;
}

function le(value: number, size: number): Buffer {
  const out = Buffer.alloc(size);
  out.writeUIntLE(value >>> 0, 0, size);
  return out;
}

function clockNonce(): number {
  return Number((BigInt(Date.now()) * 1000n) & 0xffffffffn);
}

function randomKey(): number[] {
  const bytes = getRandomBytes(KEY_WORDS * 4);
  const words: number[] = [];
  for (let i = 0; i < KEY_WORDS; i++) {
    const o = i * 4;
    words.push((bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0);
  }
  return words;
}

function mixState(timestamp: number, nonce: number, envCode: number = ENV_CODE): number {
  const folded = ((timestamp >>> 16) ^ (nonce >>> 16) ^ timestamp ^ nonce) & 0xffff;
  return (folded | (envCode << 16)) >>> 0;
}

function foldChecksum(values: ReadonlyArray<number | string>, mode: number): number {
  let acc = MASK32;
  for (const value of values) {
    let num: number;
    if (typeof value === 'string') {
      const raw = Buffer.from(value, 'utf8').subarray(0, 4);
      num = mode === 1 ? 0 : raw.length === 0 ? 0 : raw.readUIntBE(0, raw.length);
    } else {
      num = value;
    }
    acc = (acc ^ (num >>> 0)) >>> 0;
  }
  return acc >>> 0;
}

// ═══════════════════════════════════════════════════════════════════
// Payload Packing
// ═══════════════════════════════════════════════════════════════════

function packPayload(fields: Map<number, Buffer>, order?: readonly number[], leadCount = false): Buffer {
  const keys = order ? [...order] : [...fields.keys()].sort((a, b) => a - b);
  const parts: Buffer[] = [];
  for (const key of keys) {
    const value = fields.get(key);
    if (!value) continue;
    parts.push(Buffer.from([key, 0, value.length]), value);
  }
  const body = Buffer.concat(parts);
  return leadCount ? Buffer.concat([Buffer.from([keys.length]), body]) : body;
}

/** Seal payload with ChaCha encryption and custom base64 encoding */
function seal(payload: Buffer, key: readonly number[]): string {
  const rounds = (key.reduce((sum, word) => sum + (word & 0xf), 0) & 0xf) + 5;
  const ciphertext = chachaCrypt(key, rounds, payload);
  const keyBytes = Buffer.concat(key.map(word => le(word, 4)));
  const position = (keyBytes.reduce((a, b) => a + b, 0) + ciphertext.reduce((a, b) => a + b, 0)) % (ciphertext.length + 1);
  const spliced = Buffer.concat([
    ciphertext.subarray(0, position),
    keyBytes,
    ciphertext.subarray(position),
  ]);
  return toCustomAlphabet(Buffer.concat([Buffer.from([ENVELOPE_TAG]), spliced]).toString('base64'));
}

// ═══════════════════════════════════════════════════════════════════
// X-Dynosaur Payload
// ═══════════════════════════════════════════════════════════════════

function dynosaurPayload(query: string, userAgent: string, opts: {
  timestamp: number; nonce: number; sequence?: number;
}): Buffer {
  const { timestamp, nonce, sequence = CALL_SEQUENCE_START } = opts;

  const fields = new Map<number, Buffer>([
    [0x21, encodeField('1', ENCODER_B)],
    [0x22, encodeField('1', ENCODER_B)],
    [0x23, encodeField('0', ENCODER_A)],
    [0x24, encodeField(String(mixState(timestamp, nonce)), ENCODER_A)],
    [0x25, encodeField(String(sequence), ENCODER_A)],
    [0x26, encodeField(String(ENV_CODE), ENCODER_A)],
    [0x27, encodeField(String(timestamp), ENCODER_A)],
    [0x28, encodeField(WEBGL_HASH, ENCODER_A)],
    [0x29, encodeField('0', ENCODER_A)],
    [0x2a, encodeField(DEFAULT_SDK_VERSION, ENCODER_A)],
    [0x2b, be(hashState(''), 4)],
    [0x2c, encodeField(CANVAS_HASH, ENCODER_A)],
    [0x2d, encodeField('0', ENCODER_A)],
    [0x2e, be(hashState(query), 4)],
    [0x2f, encodeField(String(sequence), ENCODER_A)],
    [0x30, be(hashState(userAgent), 4)],
    [0x31, encodeField(DEFAULT_SCM_VERSION, ENCODER_A)],
    [0x32, encodeField(COMPONENT_VERSION, ENCODER_A)],
    [0x33, encodeField(DEVICE_HASH, ENCODER_A)],
    [0x34, encodeField(String(nonce), ENCODER_A)],
    [0x35, encodeField(DEFAULT_PAGE, ENCODER_A)],
    [0x36, encodeField(String(UB_CODE), ENCODER_A)],
    [0x37, encodeField('0', ENCODER_A)],
    [0x38, be(VM_STATE_HASH, 4)],
    [0x20, encodeField('0', ENCODER_A)],
  ]);

  let checksum = 0;
  for (const key of [...fields.keys()].sort((a, b) => a - b)) {
    checksum ^= fields.get(key)![1];
  }
  fields.set(0x20, encodeField(String(checksum), ENCODER_B));

  return packPayload(fields);
}

// ═══════════════════════════════════════════════════════════════════
// X-Gnarly Payload
// ═══════════════════════════════════════════════════════════════════

function gnarlyPayload(signedQuery: string, userAgent: string, opts: {
  body?: string; timestamp: number; nonce: number; nonce2: number; sequence?: number;
}): Buffer {
  const { timestamp, nonce, nonce2, sequence = CALL_SEQUENCE_START } = opts;
  const body = opts.body ?? '';

  const queryMd5 = md5Hex(signedQuery);
  const bodyMd5 = md5Hex(body);
  const agentMd5 = md5Hex(userAgent);
  const mixed = mixState(timestamp, nonce);

  const covered: Array<number | string> = [
    0, ENV_CODE, UB_CODE, queryMd5, bodyMd5, agentMd5,
    timestamp, 0, nonce, DEFAULT_SDK_VERSION, DEFAULT_SCM_VERSION,
    CALL_SEQUENCE_START, sequence, sequence, mixed, nonce2,
  ];
  const first = foldChecksum(covered, 2);
  const second = foldChecksum([...covered, first], 1);

  const fields = new Map<number, Buffer>([
    [0x00, be(second, 4)],
    [0x01, be(ENV_CODE, 2)],
    [0x02, be(UB_CODE, 2)],
    [0x03, Buffer.from(queryMd5, 'ascii')],
    [0x04, Buffer.from(bodyMd5, 'ascii')],
    [0x05, Buffer.from(agentMd5, 'ascii')],
    [0x06, be(timestamp, 4)],
    [0x08, be(nonce, 4)],
    [0x09, Buffer.from(DEFAULT_SDK_VERSION, 'ascii')],
    [0x0a, Buffer.from(DEFAULT_SCM_VERSION, 'ascii')],
    [0x0b, be(CALL_SEQUENCE_START, 2)],
    [0x0c, be(sequence, 2)],
    [0x0d, be(sequence, 2)],
    [0x0e, be(mixed, 4)],
    [0x0f, be(nonce2, 4)],
    [0x10, be(first, 4)],
  ]);

  return packPayload(fields, undefined, true);
}

// ═══════════════════════════════════════════════════════════════════
// Query Encoding (matches browser escaping exactly)
// ═══════════════════════════════════════════════════════════════════

const MUST_ESCAPE: Record<string, string> = {
  ' ': '%20', '"': '%22', '<': '%3C', '>': '%3E', '`': '%60', '#': '%23',
};

function escapeQueryComponent(text: string): string {
  let out = '';
  for (const ch of text) {
    if (ch in MUST_ESCAPE) {
      out += MUST_ESCAPE[ch];
    } else if (ch > ' ' && ch <= '~') {
      out += ch;
    } else {
      for (const byte of Buffer.from(ch, 'utf8')) {
        out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }
  return out;
}

function encodeQueryPairs(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `${escapeQueryComponent(k)}=${escapeQueryComponent(v)}`).join('&');
}

// ═══════════════════════════════════════════════════════════════════
// Signer Class
// ═══════════════════════════════════════════════════════════════════

export default class Signer {
  readonly #customSigner?: SignerFunction;
  readonly #serviceUrl?: string;
  readonly #userAgent: string;

  constructor(userAgent: string, config: SignerConfig = {}) {
    this.#userAgent = userAgent;
    this.#customSigner = config.signer;
    this.#serviceUrl = config.signerServiceUrl;
  }

  /**
   * Sign a URL — appends X-Dynosaur, X-Bogus, and X-Gnarly parameters.
   */
  async sign(url: string): Promise<string> {
    let result: SignResult;

    if (this.#customSigner) {
      Log.debug(TAG, 'Using custom signer');
      result = await this.#customSigner(url, this.#userAgent);
    } else if (this.#serviceUrl) {
      Log.debug(TAG, 'Using external signer service');
      result = await this.#signViaService(url);
    } else {
      Log.debug(TAG, 'Using built-in signer');
      result = this.#signBuiltIn(url);
    }

    // Build the signed URL
    const separator = url.includes('?') ? '&' : '?';
    let signedUrl = url;

    if (result.xDynosaur) {
      signedUrl += `${separator}X-Dynosaur=${result.xDynosaur}`;
    }
    if (result.msToken !== undefined) {
      signedUrl += `&msToken=${result.msToken}`;
    }
    if (result.xBogus) {
      signedUrl += `&X-Bogus=${result.xBogus}`;
    }
    if (result.xGnarly) {
      signedUrl += `&X-Gnarly=${result.xGnarly}`;
    }

    Log.debug(TAG, `Signed URL (X-Bogus=${result.xBogus.substring(0, 20)}...)`);
    return signedUrl;
  }

  /**
   * Sign via external REST service.
   */
  async #signViaService(url: string): Promise<SignResult> {
    if (!this.#serviceUrl) throw new TokKitError('Signer service URL not configured');

    const res = await fetch(this.#serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_agent: this.#userAgent }),
    });

    if (!res.ok) throw new TokKitError(`Signer service error: ${res.status}`);

    const data = await res.json() as Record<string, string>;
    return {
      xBogus: data['X-Bogus'] || data['xBogus'] || '1',
      xDynosaur: data['X-Dynosaur'] || data['xDynosaur'],
      xGnarly: data['X-Gnarly'] || data['xGnarly'],
      msToken: data['msToken'],
    };
  }

  /**
   * Built-in signer — real X-Dynosaur + X-Gnarly signing.
   *
   * Uses the ChaCha20-based encryption with TikTok's custom constants,
   * field encoding, and custom base64 alphabet. This is the actual
   * algorithm from TikTok's webmssdk v5.3.2.
   */
  #signBuiltIn(url: string): SignResult {
    const urlObj = new URL(url);
    const queryString = urlObj.search.startsWith('?') ? urlObj.search.slice(1) : urlObj.search;

    // Build query pairs from URL
    const pairs: Array<[string, string]> = [];
    for (const [k, v] of urlObj.searchParams.entries()) {
      pairs.push([k, v]);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = clockNonce();
    const nonce2 = ~clockNonce() >>> 0;

    // 1. Generate X-Dynosaur
    const query = encodeQueryPairs(pairs);
    const dynosaur = seal(
      dynosaurPayload(query, this.#userAgent, { timestamp, nonce }),
      randomKey(),
    );

    // 2. Build the signed query for X-Gnarly hashing
    const sealedQuery = `${query}&X-Dynosaur=${dynosaur}&msToken=`;

    // 3. Generate X-Gnarly
    const gnarly = seal(
      gnarlyPayload(sealedQuery, this.#userAgent, {
        timestamp, nonce, nonce2,
      }),
      randomKey(),
    );

    return {
      xBogus: '1', // Modern TikTok uses X-Bogus=1 (literal)
      xDynosaur: dynosaur,
      xGnarly: gnarly,
      msToken: '',
    };
  }

  get isAvailable(): boolean { return true; }
  get isCustom(): boolean { return !!(this.#customSigner || this.#serviceUrl); }
}
