/**
 * ShortDrama node — represents a TikTok Short Drama series.
 * Mapped from TikTok's official /api/drama/theme/drama_list/ endpoint.
 * Powers TikTok's Short Drama web portal (https://www.tiktok.com/shortdrama).
 */

import { TokNode } from '../helpers.js';
import User from './User.js';
import Post from './Post.js';
import { resolveVideo, type ResolvedVideo } from '../../utils/VideoResolver.js';

export interface DramaTheme {
  tagId: string;
  tagKey: string;
  tagVal: string;
}

export interface DramaCategoryItem {
  id: string;
  name: string;
  filterType: number;
  starlingKey: string;
  recentDays?: number;
}

export interface DramaFilterCategories {
  genres: DramaCategoryItem[];
  themes: DramaCategoryItem[];
  releaseDates: DramaCategoryItem[];
}

export default class ShortDrama extends TokNode {
  readonly dramaID: string;
  readonly dramaName: string;
  readonly description: string;
  readonly numVideos: number;
  readonly numWatched: string;
  readonly totalDuration: string;
  readonly isLimitedFree: boolean;
  readonly labelHot: boolean;
  readonly labelNew: boolean;
  readonly firstEpisodeItemID: string;
  readonly firstEpisodeItemInfo?: Post;
  readonly author: User;
  readonly authorUID: string;
  readonly cover: { urlList: string[] };
  readonly zoomCover: Record<string, string>;
  readonly themes: DramaTheme[];

  constructor(data: Record<string, unknown>) {
    super('ShortDrama');
    this.dramaID = String(data['dramaID'] ?? data['drama_id'] ?? data['id'] ?? '');
    this.dramaName = String(data['dramaName'] ?? data['drama_name'] ?? data['name'] ?? '');
    this.description = String(data['description'] ?? data['desc'] ?? '');
    this.numVideos = Number(data['numVideos'] ?? data['num_videos'] ?? 0);
    this.numWatched = String(data['numWatched'] ?? data['num_watched'] ?? '0');
    this.totalDuration = String(data['totalDuration'] ?? data['total_duration'] ?? '0');
    this.isLimitedFree = Boolean(data['isLimitedFree'] ?? data['is_limited_free'] ?? false);
    this.labelHot = Boolean(data['labelHot'] ?? data['label_hot'] ?? false);
    this.labelNew = Boolean(data['labelNew'] ?? data['label_new'] ?? false);
    this.firstEpisodeItemID = String(data['firstEpisodeItemID'] ?? data['first_episode_item_id'] ?? '');

    // Author parsing
    const authorRaw = (data['author'] ?? {}) as Record<string, unknown>;
    const userRaw = (authorRaw['user'] ?? authorRaw) as Record<string, unknown>;
    const statsRaw = authorRaw['stats'] as Record<string, unknown> | undefined;
    if (statsRaw) {
      userRaw['authorStats'] = statsRaw;
    }
    this.author = new User(userRaw);
    this.authorUID = String(data['authorUID'] ?? data['author_uid'] ?? this.author.id);

    // Cover parsing
    this.cover = (data['cover'] ?? { urlList: [] }) as { urlList: string[] };
    this.zoomCover = (data['zoomCover'] ?? {}) as Record<string, string>;

    // Themes parsing
    const rawThemes = (data['themes'] ?? []) as Array<Record<string, unknown>>;
    this.themes = rawThemes.map(t => ({
      tagId: String(t['tagID'] ?? t['tag_id'] ?? ''),
      tagKey: String(t['tagKey'] ?? t['tag_key'] ?? ''),
      tagVal: String(t['tagVal'] ?? t['tag_val'] ?? ''),
    }));

    // First episode Post node (if available)
    if (data['firstEpisodeItemInfo'] && typeof data['firstEpisodeItemInfo'] === 'object') {
      try {
        this.firstEpisodeItemInfo = new Post(data['firstEpisodeItemInfo'] as Record<string, unknown>);
      } catch {
        // Ignored
      }
    }
  }

  // Convenient ergonomic aliases
  get id(): string {
    return this.dramaID;
  }

  get title(): string {
    return this.dramaName;
  }

  get episodeCount(): number {
    return this.numVideos;
  }

  get watchCount(): number {
    return parseInt(this.numWatched, 10) || 0;
  }

  get durationSeconds(): number {
    return parseInt(this.totalDuration, 10) || 0;
  }

  get isHot(): boolean {
    return this.labelHot;
  }

  get isNew(): boolean {
    return this.labelNew;
  }

  get coverUrl(): string {
    return (
      this.zoomCover['960'] ||
      this.zoomCover['720'] ||
      this.zoomCover['480'] ||
      this.zoomCover['240'] ||
      this.cover.urlList?.[0] ||
      ''
    );
  }

  get url(): string {
    return `https://www.tiktok.com/shortdrama?drama_id=${this.dramaID}`;
  }

  /**
   * Resolve direct playable video streams (HTML5 MP4) and unwatermarked download URLs
   * for the first episode without requiring cookies or authentication.
   */
  async resolveFirstEpisodeStream(): Promise<ResolvedVideo> {
    if (!this.firstEpisodeItemID) {
      throw new Error(`Drama "${this.dramaName}" does not have a firstEpisodeItemID`);
    }
    return resolveVideo(this.firstEpisodeItemID);
  }
}
