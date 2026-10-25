/**
 * Cross-platform Crypto Shim.
 * Works seamlessly in Node.js, Capacitor.js, React Native, Browsers, Deno, and Bun.
 * Zero external dependencies.
 */

/* Pure JS RFC 1321 MD5 Implementation */
function md5Cycle(x: number[], k: number[]): void {
  let a = x[0], b = x[1], c = x[2], d = x[3];

  const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
    const n = (a + ((b & c) | (~b & d)) + x + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + b) | 0;
  };
  const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
    const n = (a + ((b & d) | (c & ~d)) + x + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + b) | 0;
  };
  const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
    const n = (a + (b ^ c ^ d) + x + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + b) | 0;
  };
  const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
    const n = (a + (c ^ (b | ~d)) + x + t) | 0;
    return (((n << s) | (n >>> (32 - s))) + b) | 0;
  };

  a = ff(a, b, c, d, k[0], 7, -680876936);
  d = ff(d, a, b, c, k[1], 12, -389564586);
  c = ff(c, d, a, b, k[2], 17, 606105819);
  b = ff(b, c, d, a, k[3], 22, -1044525330);
  a = ff(a, b, c, d, k[4], 7, -176418897);
  d = ff(d, a, b, c, k[5], 12, 1200080426);
  c = ff(c, d, a, b, k[6], 17, -1473231341);
  b = ff(b, c, d, a, k[7], 22, -45705983);
  a = ff(a, b, c, d, k[8], 7, 1770035416);
  d = ff(d, a, b, c, k[9], 12, -1958414417);
  c = ff(c, d, a, b, k[10], 17, -42063);
  b = ff(b, c, d, a, k[11], 22, -1990404162);
  a = ff(a, b, c, d, k[12], 7, 1804603682);
  d = ff(d, a, b, c, k[13], 12, -40341101);
  c = ff(c, d, a, b, k[14], 17, -1502002290);
  b = ff(b, c, d, a, k[15], 22, 1236535329);

  a = gg(a, b, c, d, k[1], 5, -165796510);
  d = gg(d, a, b, c, k[6], 9, -1069501632);
  c = gg(c, d, a, b, k[11], 14, 643717713);
  b = gg(b, c, d, a, k[0], 20, -373897302);
  a = gg(a, b, c, d, k[5], 5, -701558691);
  d = gg(d, a, b, c, k[10], 9, 38016083);
  c = gg(c, d, a, b, k[15], 14, -660478335);
  b = gg(b, c, d, a, k[4], 20, -405537848);
  a = gg(a, b, c, d, k[9], 5, 568446438);
  d = gg(d, a, b, c, k[14], 9, -1019803690);
  c = gg(c, d, a, b, k[3], 14, -187363961);
  b = gg(b, c, d, a, k[8], 20, 1163531501);
  a = gg(a, b, c, d, k[13], 5, -1444681467);
  d = gg(d, a, b, c, k[2], 9, -51403784);
  c = gg(c, d, a, b, k[7], 14, 1735328473);
  b = gg(b, c, d, a, k[12], 20, -1926607734);

  a = hh(a, b, c, d, k[5], 4, -378558);
  d = hh(d, a, b, c, k[8], 11, -2022574463);
  c = hh(c, d, a, b, k[11], 16, 1839030562);
  b = hh(b, c, d, a, k[14], 23, -35309556);
  a = hh(a, b, c, d, k[1], 4, -1530992060);
  d = hh(d, a, b, c, k[4], 11, 1272893353);
  c = hh(c, d, a, b, k[7], 16, -155497632);
  b = hh(b, c, d, a, k[10], 23, -1094730640);
  a = hh(a, b, c, d, k[13], 4, 681279174);
  d = hh(d, a, b, c, k[0], 11, -358537222);
  c = hh(c, d, a, b, k[3], 16, -722521979);
  b = hh(b, c, d, a, k[6], 23, 76029189);
  a = hh(a, b, c, d, k[9], 4, -640364487);
  d = hh(d, a, b, c, k[12], 11, -421815835);
  c = hh(c, d, a, b, k[15], 16, 530742520);
  b = hh(b, c, d, a, k[2], 23, -995338651);

  a = ii(a, b, c, d, k[0], 6, -198630844);
  d = ii(d, a, b, c, k[7], 10, 1126891415);
  c = ii(c, d, a, b, k[14], 15, -1416354905);
  b = ii(b, c, d, a, k[5], 21, -57434055);
  a = ii(a, b, c, d, k[12], 6, 1700485571);
  d = ii(d, a, b, c, k[3], 10, -1894986606);
  c = ii(c, d, a, b, k[10], 15, -1051523);
  b = ii(b, c, d, a, k[1], 21, -2054922799);
  a = ii(a, b, c, d, k[8], 6, 1873313359);
  d = ii(d, a, b, c, k[15], 10, -30611744);
  c = ii(c, d, a, b, k[6], 15, -1560198380);
  b = ii(b, c, d, a, k[13], 21, 1309151649);
  a = ii(a, b, c, d, k[4], 6, -145523070);
  d = ii(d, a, b, c, k[11], 10, -1120210379);
  c = ii(c, d, a, b, k[2], 15, 718787259);
  b = ii(b, c, d, a, k[9], 21, -343485551);

  x[0] = (x[0] + a) | 0;
  x[1] = (x[1] + b) | 0;
  x[2] = (x[2] + c) | 0;
  x[3] = (x[3] + d) | 0;
}

export function md5(input: string | Uint8Array): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = input;
  }

  const n = bytes.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];
  let i = 64;

  for (; i <= n; i += 64) {
    const k: number[] = [];
    for (let j = 0; j < 16; j++) {
      const idx = i - 64 + j * 4;
      k[j] = bytes[idx] | (bytes[idx + 1] << 8) | (bytes[idx + 2] << 16) | (bytes[idx + 3] << 24);
    }
    md5Cycle(state, k);
  }

  const tail: number[] = [];
  const start = i - 64;
  for (let j = 0; j < 16; j++) {
    const idx = start + j * 4;
    let val = 0;
    if (idx < n) val |= bytes[idx];
    if (idx + 1 < n) val |= bytes[idx + 1] << 8;
    if (idx + 2 < n) val |= bytes[idx + 2] << 16;
    if (idx + 3 < n) val |= bytes[idx + 3] << 24;
    if (idx === n) val |= 0x80;
    else if (idx + 1 === n) val |= 0x80 << 8;
    else if (idx + 2 === n) val |= 0x80 << 16;
    else if (idx + 3 === n) val |= 0x80 << 24;
    tail[j] = val;
  }

  if (n - start >= 56) {
    md5Cycle(state, tail);
    for (let j = 0; j < 16; j++) tail[j] = 0;
  }

  tail[14] = (n * 8) & 0xffffffff;
  tail[15] = Math.floor((n * 8) / 0x100000000);
  md5Cycle(state, tail);

  const hexDigits = '0123456789abcdef';
  let out = '';
  for (let j = 0; j < 4; j++) {
    for (let b = 0; b < 4; b++) {
      const byte = (state[j] >>> (b * 8)) & 0xff;
      out += hexDigits[(byte >>> 4) & 0x0f] + hexDigits[byte & 0x0f];
    }
  }

  return out;
}

/**
 * Cross-platform random bytes generator.
 * Uses Web Crypto (Capacitor/Browser) when available, falling back to Math.random.
 */
export function getRandomBytes(size: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const arr = new Uint8Array(size);
    globalThis.crypto.getRandomValues(arr);
    return arr;
  }
  const arr = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}
