/**
 * LiveRoom node — from search live API.
 * All fields verified from /api/search/live/full/ responses.
 */

import { TokNode } from '../helpers.js';

export interface StreamUrl {
  /** Direct RTMP pull URL (single string) */
  rtmpPullUrl: string;
  /** FLV pull URLs — keyed by quality (e.g. "FULL_HD1", "HD1", "SD1") */
  flvPullUrl: Record<string, string>;
  /** HLS pull URL map (if available) */
  hlsPullUrl: Record<string, string>;
  /** Available resolutions */
  candidateResolution: string[];
  width: number;
  height: number;
}

export interface LiveOwner {
  id: string;
  nickname: string;
  uniqueId: string;
  avatarThumb: string;
  avatarMedium: string;
  avatarLarger: string;
  verified: boolean;
}

export default class LiveRoom extends TokNode {
  readonly roomId: string;
  readonly title: string;
  readonly status: number;
  readonly userCount: number;
  readonly likeCount: number;
  readonly startTime: number;
  readonly coverUrl: string;
  readonly owner: LiveOwner;
  readonly streamUrl?: StreamUrl;

  constructor(data: Record<string, unknown>) {
    super('LiveRoom');

    // Data may be nested in live_info.raw_data (search results)
    let info: Record<string, unknown>;
    if (data['live_info']) {
      const liveInfo = data['live_info'] as Record<string, unknown>;
      if (typeof liveInfo['raw_data'] === 'string') {
        try { info = JSON.parse(liveInfo['raw_data']); } catch { info = liveInfo; }
      } else {
        info = liveInfo;
      }
    } else {
      info = data;
    }

    this.roomId = String(info['id_str'] ?? info['id'] ?? '');
    this.title = (info['title'] as string) ?? '';
    this.status = (info['status'] as number) ?? 0;
    this.userCount = (info['user_count'] as number) ?? 0;
    this.likeCount = (info['like_count'] as number) ?? 0;
    this.startTime = (info['start_time'] as number) ?? 0;

    // Cover
    const cover = info['cover'] as Record<string, unknown> | undefined;
    this.coverUrl = (cover?.['url_list'] as string[])?.[0] ?? '';

    // Owner
    const ownerData = (info['owner'] ?? {}) as Record<string, unknown>;
    this.owner = {
      id: String(ownerData['id_str'] ?? ownerData['id'] ?? ''),
      nickname: (ownerData['nickname'] as string) ?? '',
      uniqueId: (ownerData['display_id'] as string) ?? '',
      avatarThumb: ((ownerData['avatar_thumb'] as Record<string, unknown>)?.['url_list'] as string[])?.[0] ?? '',
      avatarMedium: ((ownerData['avatar_medium'] as Record<string, unknown>)?.['url_list'] as string[])?.[0] ?? '',
      avatarLarger: ((ownerData['avatar_large'] as Record<string, unknown>)?.['url_list'] as string[])?.[0] ?? '',
      verified: (ownerData['is_verified'] as boolean) ?? false,
    };

    // Stream URL
    const streamData = info['stream_url'] as Record<string, unknown> | undefined;
    if (streamData) {
      const flvRaw = streamData['flv_pull_url'];
      const hlsRaw = streamData['hls_pull_url'];

      this.streamUrl = {
        rtmpPullUrl: (streamData['rtmp_pull_url'] as string) ?? '',
        flvPullUrl: (typeof flvRaw === 'object' && flvRaw !== null ? flvRaw : {}) as Record<string, string>,
        hlsPullUrl: (typeof hlsRaw === 'object' && hlsRaw !== null ? hlsRaw : {}) as Record<string, string>,
        candidateResolution: (streamData['candidate_resolution'] as string[]) ?? [],
        width: (streamData['stream_size_width'] as number) ?? 0,
        height: (streamData['stream_size_height'] as number) ?? 0,
      };
    }
  }

  get isLive(): boolean {
    return this.status === 2;
  }

  get startedAt(): Date {
    return new Date(this.startTime * 1000);
  }

  /**
   * Get the best FLV stream URL (highest quality first).
   * Returns a direct HTTP URL playable with FLV.js or any video player.
   */
  get bestFlvUrl(): string | undefined {
    if (!this.streamUrl?.flvPullUrl) return undefined;
    const map = this.streamUrl.flvPullUrl;
    for (const quality of ['FULL_HD1', 'HD1', 'SD1', 'SD2']) {
      if (map[quality]) return map[quality];
    }
    return Object.values(map)[0];
  }

  /**
   * Get the best HLS stream URL (m3u8 — HTML5 playable with HLS.js).
   */
  get bestHlsUrl(): string | undefined {
    if (!this.streamUrl?.hlsPullUrl) return undefined;
    const map = this.streamUrl.hlsPullUrl;
    for (const quality of ['FULL_HD1', 'HD1', 'SD1', 'SD2']) {
      if (map[quality]) return map[quality];
    }
    return Object.values(map)[0];
  }

  /**
   * Get all available stream URLs (FLV + HLS + RTMP).
   */
  get allStreamUrls(): { quality: string; url: string; format: string }[] {
    const urls: { quality: string; url: string; format: string }[] = [];
    if (this.streamUrl) {
      for (const [q, url] of Object.entries(this.streamUrl.flvPullUrl)) {
        urls.push({ quality: q, url, format: 'flv' });
      }
      for (const [q, url] of Object.entries(this.streamUrl.hlsPullUrl)) {
        urls.push({ quality: q, url, format: 'hls' });
      }
      if (this.streamUrl.rtmpPullUrl) {
        urls.push({ quality: 'default', url: this.streamUrl.rtmpPullUrl, format: 'rtmp' });
      }
    }
    return urls;
  }
}
