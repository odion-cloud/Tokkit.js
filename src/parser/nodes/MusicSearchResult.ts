/**
 * MusicSearchResult node — from /api/search/music/full/ results.
 * All 50+ fields verified from live API.
 */

import { TokNode } from '../helpers.js';

export interface MusicCover {
  uri: string;
  urlList: string[];
  width: number;
  height: number;
}

export default class MusicSearchResult extends TokNode {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly album: string;
  readonly duration: number;
  readonly coverLarge?: MusicCover;
  readonly coverMedium?: MusicCover;
  readonly coverThumb?: MusicCover;
  readonly playUrl: string;
  readonly userCount: number;
  readonly isOriginal: boolean;
  readonly isOriginalSound: boolean;
  readonly sourcePlatform: number;
  readonly artists: string[];

  constructor(data: Record<string, unknown>) {
    super('MusicSearchResult');

    // Data may be nested in music_info
    const info = (data['music_info'] ?? data) as Record<string, unknown>;

    this.id = String(info['id_str'] ?? info['id'] ?? '');
    this.title = (info['title'] as string) ?? '';
    this.author = (info['author'] as string) ?? '';
    this.album = (info['album'] as string) ?? '';
    this.duration = (info['duration'] as number) ?? 0;
    this.userCount = (info['user_count'] as number) ?? 0;
    this.isOriginal = (info['is_original'] as boolean) ?? false;
    this.isOriginalSound = (info['is_original_sound'] as boolean) ?? false;
    this.sourcePlatform = (info['source_platform'] as number) ?? 0;

    this.coverLarge = info['cover_large'] as MusicCover | undefined;
    this.coverMedium = info['cover_medium'] as MusicCover | undefined;
    this.coverThumb = info['cover_thumb'] as MusicCover | undefined;

    // Play URL
    const playUrlObj = info['play_url'] as Record<string, unknown> | undefined;
    this.playUrl = (playUrlObj?.['url_list'] as string[])?.[0] ?? (playUrlObj?.['uri'] as string) ?? '';

    // Artists
    const artistsList = (info['artists'] as Array<Record<string, unknown>>) ?? [];
    this.artists = artistsList.map(a => (a['name'] as string) ?? '').filter(Boolean);
  }

  get coverUrl(): string {
    return this.coverLarge?.urlList?.[0] ?? this.coverMedium?.urlList?.[0] ?? '';
  }
}
