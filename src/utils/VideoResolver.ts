/**
 * VideoResolver — resolves TikTok video URLs/IDs into direct playable MP4 streams.
 * Uses TikTok's mobile feed gateway (aweme/v1/feed) with simulated client parameters.
 * Provides direct CDN play URLs, watermark-free download URLs, and multiple bitrate qualities
 * WITHOUT requiring cookies, authentication, or X-Bogus signatures.
 */

import Log from './Log.js';
import { TokKitError } from './Utils.js';

const TAG = 'VideoResolver';

export const MOBILE_USER_AGENT =
  'com.zhiliaoapp.musically/300904 (2018111632; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)';

export const TIKTOKV_GATEWAYS = [
  'https://api16-normal-useast5.tiktokv.us/aweme/v1/feed/',
  'https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/',
  'https://api22-normal-c-useast1a.tiktokv.com/aweme/v1/feed/',
];

export const TIKTOKV_API_URL = TIKTOKV_GATEWAYS[0];

export interface VideoQuality {
  gearName: string;
  qualityType: number;
  bitrate: number;
  url: string;
}

export interface ResolvedMusic {
  id: string;
  title: string;
  author: string;
  duration: number;
  playUrl?: string;
  coverLarge?: string;
  coverMedium?: string;
  coverThumb?: string;
}

export interface ResolvedAuthor {
  id: string;
  uniqueId: string;
  nickname: string;
  signature?: string;
  avatarThumb?: string;
  avatarMedium?: string;
  avatarLarger?: string;
}

export interface ResolvedVideo {
  id: string;
  desc: string;
  createTime: number;
  duration: number;
  ratio: string;
  width: number;
  height: number;
  /** Best direct HTML5-playable CDN MP4 URL */
  playUrl: string;
  /** Direct watermarked / watermark-free download URL */
  downloadUrl?: string;
  /** All available CDN mirror URLs */
  allPlayUrls: string[];
  /** Available bitrate & resolution options (720p, 540p, 480p, etc.) */
  qualities: VideoQuality[];
  /** Video covers */
  cover: string;
  dynamicCover?: string;
  originCover?: string;
  /** Background audio/music track */
  music?: ResolvedMusic;
  /** Author info */
  author?: ResolvedAuthor;
  /** Engagement statistics */
  stats?: {
    playCount: number;
    diggCount: number;
    commentCount: number;
    shareCount: number;
    downloadCount: number;
  };
  /** Original raw aweme item */
  raw?: Record<string, unknown>;
}

function randomChar(chars: string, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateDeviceId(): string {
  return '7' + randomChar('0123456789', 18);
}

/**
 * Extract numerical video ID from a TikTok URL or raw ID string.
 * Supports:
 * - Pure ID: "7449553535941954848"
 * - Full desktop URL: "https://www.tiktok.com/@username/video/7449553535941954848"
 * - Short URLs: "https://vm.tiktok.com/ZMxxxxxx/", "https://vt.tiktok.com/xxxxxx/"
 */
export async function extractVideoId(input: string): Promise<string> {
  const trimmed = input.trim();

  // If already a 17-21 digit numeric ID
  if (/^\d{17,21}$/.test(trimmed)) {
    return trimmed;
  }

  // Check if standard TikTok video URL with numeric ID
  const directMatch = trimmed.match(/\/video\/(\d{17,21})/);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  const vMatch = trimmed.match(/\/v\/(\d{17,21})/);
  if (vMatch?.[1]) {
    return vMatch[1];
  }

  // If short URL (vm.tiktok.com, vt.tiktok.com, tiktok.com/t/)
  if (trimmed.includes('tiktok.com')) {
    try {
      Log.info(TAG, `Resolving redirected URL: ${trimmed}`);
      const res = await fetch(trimmed, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const finalUrl = res.url || trimmed;
      const resolvedMatch = finalUrl.match(/\/video\/(\d{17,21})/);
      if (resolvedMatch?.[1]) {
        return resolvedMatch[1];
      }

      // Check any 17-21 digit number in resolved URL
      const digitMatch = finalUrl.match(/\d{17,21}/);
      if (digitMatch?.[0]) {
        return digitMatch[0];
      }
    } catch (err) {
      Log.warn(TAG, `Failed to resolve redirect for ${trimmed}: ${(err as Error).message}`);
    }
  }

  // Fallback: look for any 17-21 digits
  const fallbackMatch = trimmed.match(/\d{17,21}/);
  if (fallbackMatch?.[0]) {
    return fallbackMatch[0];
  }

  throw new TokKitError(`Could not extract video ID from input: "${input}"`);
}

/**
 * Resolve direct playable video streams and metadata for a TikTok video or drama episode.
 *
 * @param videoIdOrUrl - Video ID (numeric string) or full TikTok URL
 * @returns ResolvedVideo with direct MP4 playUrl, no-watermark downloadUrl, and qualities
 */
export async function resolveVideo(
  videoIdOrUrl: string,
  options: { fetch?: typeof globalThis.fetch } = {}
): Promise<ResolvedVideo> {
  const videoId = await extractVideoId(videoIdOrUrl);
  Log.info(TAG, `Resolving video stream for ID: ${videoId}`);

  const deviceId = generateDeviceId();
  const iid = generateDeviceId();
  const now = Date.now();
  const fetchFn = options.fetch ?? globalThis.fetch;

  const queryParams = new URLSearchParams({
    aweme_id: videoId,
    version_name: '1.1.9',
    version_code: '2018111632',
    build_number: '1.1.9',
    device_id: deviceId,
    iid: iid,
    manifest_version_code: '2018111632',
    update_version_code: '2018111632',
    openudid: randomChar('0123456789abcdef', 16),
    uuid: randomChar('1234567890', 16),
    _rticket: String(now * 1000),
    ts: String(Math.floor(now / 1000)),
    device_brand: 'Google',
    device_type: 'Pixel 4',
    device_platform: 'android',
    resolution: '1080*1920',
    dpi: '420',
    os_version: '10',
    os_api: '29',
    carrier_region: 'US',
    sys_region: 'US',
    region: 'US',
    timezone_name: 'America/New_York',
    timezone_offset: '-14400',
    channel: 'googleplay',
    ac: 'wifi',
    mcc_mnc: '310260',
    is_my_cn: '0',
    ssmix: 'a',
    as: 'a1qwert123',
    cp: 'cbfhckdckkde1',
  }).toString();

  let lastError: Error | null = null;
  let data: Record<string, unknown> | null = null;

  // Try each gateway URL until successful
  for (const gateway of TIKTOKV_GATEWAYS) {
    const url = `${gateway}?${queryParams}`;
    try {
      const res = await fetchFn(url, {
        method: 'OPTIONS',
        headers: {
          'User-Agent': MOBILE_USER_AGENT,
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        data = (await res.json()) as Record<string, unknown>;
        break;
      } else {
        lastError = new TokKitError(`TikTok gateway HTTP error: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      lastError = err as Error;
      Log.debug(TAG, `Gateway ${gateway} failed: ${(err as Error).message}, trying next...`);
    }
  }

  if (!data) {
    throw lastError ?? new TokKitError(`Failed to reach any TikTok gateway for ID: ${videoId}`);
  }

  const awemeList = (data['aweme_list'] ?? []) as Array<Record<string, unknown>>;

  if (!awemeList.length) {
    throw new TokKitError(`No video content returned for ID: ${videoId}`);
  }

  // Find exact match or take first
  const item = awemeList.find(a => String(a['aweme_id']) === videoId) || awemeList[0];
  const videoObj = (item['video'] ?? {}) as Record<string, unknown>;
  const playAddr = (videoObj['play_addr'] ?? {}) as Record<string, unknown>;
  const downloadAddr = (videoObj['download_addr'] ?? {}) as Record<string, unknown>;
  const playUrls = (playAddr['url_list'] ?? []) as string[];
  const downloadUrls = (downloadAddr['url_list'] ?? []) as string[];

  if (!playUrls.length && !downloadUrls.length) {
    throw new TokKitError(`No playable stream URLs found for video ID: ${videoId}`);
  }

  // Parse bitrates / qualities
  const rawBitrates = (videoObj['bit_rate'] ?? []) as Array<Record<string, unknown>>;
  const qualities: VideoQuality[] = rawBitrates.map(b => {
    const bPlayAddr = (b['play_addr'] ?? {}) as Record<string, unknown>;
    const bUrls = (bPlayAddr['url_list'] ?? []) as string[];
    return {
      gearName: String(b['gear_name'] ?? ''),
      qualityType: Number(b['quality_type'] ?? 0),
      bitrate: Number(b['bit_rate'] ?? 0),
      url: bUrls[0] || '',
    };
  }).filter(q => !!q.url);

  // Parse cover images
  const coverUrls = ((videoObj['cover'] as Record<string, unknown>)?.[
    'url_list'
  ] ?? []) as string[];
  const dynamicCoverUrls = ((videoObj['dynamic_cover'] as Record<string, unknown>)?.[
    'url_list'
  ] ?? []) as string[];
  const originCoverUrls = ((videoObj['origin_cover'] as Record<string, unknown>)?.[
    'url_list'
  ] ?? []) as string[];

  // Parse music track
  let music: ResolvedMusic | undefined;
  if (item['music'] && typeof item['music'] === 'object') {
    const m = item['music'] as Record<string, unknown>;
    const mPlayUrls = ((m['play_url'] as Record<string, unknown>)?.[
      'url_list'
    ] ?? []) as string[];
    const mCoverLarge = ((m['cover_large'] as Record<string, unknown>)?.[
      'url_list'
    ] ?? []) as string[];
    const mCoverMed = ((m['cover_medium'] as Record<string, unknown>)?.[
      'url_list'
    ] ?? []) as string[];
    const mCoverThumb = ((m['cover_thumb'] as Record<string, unknown>)?.[
      'url_list'
    ] ?? []) as string[];

    music = {
      id: String(m['id'] ?? ''),
      title: String(m['title'] ?? ''),
      author: String(m['author'] ?? ''),
      duration: Number(m['duration'] ?? 0),
      playUrl: mPlayUrls[0],
      coverLarge: mCoverLarge[0],
      coverMedium: mCoverMed[0],
      coverThumb: mCoverThumb[0],
    };
  }

  // Parse author
  let author: ResolvedAuthor | undefined;
  if (item['author'] && typeof item['author'] === 'object') {
    const a = item['author'] as Record<string, unknown>;
    const aThumb = ((a['avatar_thumb'] as Record<string, unknown>)?.[
      'url_list'
    ] ?? []) as string[];
    const aMed = ((a['avatar_medium'] as Record<string, unknown>)?.[
      'url_list'
    ] ?? []) as string[];
    const aLarger = ((a['avatar_larger'] as Record<string, unknown>)?.[
      'url_list'
    ] ?? []) as string[];

    author = {
      id: String(a['uid'] ?? ''),
      uniqueId: String(a['unique_id'] ?? ''),
      nickname: String(a['nickname'] ?? ''),
      signature: String(a['signature'] ?? ''),
      avatarThumb: aThumb[0],
      avatarMedium: aMed[0],
      avatarLarger: aLarger[0],
    };
  }

  // Parse stats
  let stats: ResolvedVideo['stats'];
  if (item['statistics'] && typeof item['statistics'] === 'object') {
    const s = item['statistics'] as Record<string, unknown>;
    stats = {
      playCount: Number(s['play_count'] ?? 0),
      diggCount: Number(s['digg_count'] ?? 0),
      commentCount: Number(s['comment_count'] ?? 0),
      shareCount: Number(s['share_count'] ?? 0),
      downloadCount: Number(s['download_count'] ?? 0),
    };
  }

  const durationMs = Number(videoObj['duration'] ?? 0);

  return {
    id: String(item['aweme_id'] ?? videoId),
    desc: String(item['desc'] ?? ''),
    createTime: Number(item['create_time'] ?? 0),
    duration: durationMs > 1000 ? Math.round(durationMs / 1000) : durationMs,
    ratio: String(videoObj['ratio'] ?? ''),
    width: Number(videoObj['width'] ?? 0),
    height: Number(videoObj['height'] ?? 0),
    playUrl: playUrls[0] || downloadUrls[0] || '',
    downloadUrl: downloadUrls[0],
    allPlayUrls: playUrls,
    qualities,
    cover: coverUrls[0] || '',
    dynamicCover: dynamicCoverUrls[0],
    originCover: originCoverUrls[0],
    music,
    author,
    stats,
    raw: item,
  };
}
