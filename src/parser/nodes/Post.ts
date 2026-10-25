/**
 * Post node — represents a TikTok video post.
 * Maps to the item objects in itemList[] from SSR/API responses.
 * All 50+ fields verified from live data.
 */

import { TokNode } from '../helpers.js';
import User from './User.js';
import VideoInfo from './VideoInfo.js';
import Music from './Music.js';
import Hashtag from './Hashtag.js';
import { ObservedArray } from '../helpers.js';
import { resolveVideo, type ResolvedVideo } from '../../utils/VideoResolver.js';

export interface PostStats {
  playCount: number;
  diggCount: number;
  commentCount: number;
  shareCount: number;
  collectCount: number;
}

export interface TextExtra {
  awemeId: string;
  start: number;
  end: number;
  hashtagName?: string;
  userId?: string;
  userUniqueId?: string;
  type: number;
  subType: number;
  isCommerce: boolean;
}

export default class Post extends TokNode {
  readonly id: string;
  readonly desc: string;
  readonly createTime: number;
  readonly author: User;
  readonly video: VideoInfo;
  readonly music: Music;
  readonly stats: PostStats;
  readonly challenges: ObservedArray<Hashtag>;
  readonly textExtra: TextExtra[];
  readonly categoryType: number;
  readonly isAd: boolean;
  readonly isOriginal: boolean;
  readonly shareEnabled: boolean;
  readonly duetEnabled: boolean;
  readonly stitchEnabled: boolean;
  readonly collected: boolean;
  readonly digged: boolean;
  readonly privateItem: boolean;
  readonly forFriend: boolean;
  readonly contents: Array<{ desc: string; textExtra?: TextExtra[] }>;
  readonly isDrama: boolean;

  constructor(data: Record<string, unknown>) {
    super('Post');
    this.id = String(data['id'] ?? '');
    this.desc = (data['desc'] as string) ?? '';
    this.createTime = (data['createTime'] as number) ?? 0;
    this.categoryType = (data['CategoryType'] as number) ?? 0;
    this.isAd = (data['isAd'] as boolean) ?? false;
    this.isOriginal = (data['originalItem'] as boolean) ?? false;
    this.shareEnabled = (data['shareEnabled'] as boolean) ?? false;
    this.duetEnabled = (data['duetEnabled'] as boolean) ?? false;
    this.stitchEnabled = (data['stitchEnabled'] as boolean) ?? false;
    this.collected = (data['collected'] as boolean) ?? false;
    this.digged = (data['digged'] as boolean) ?? false;
    this.privateItem = (data['privateItem'] as boolean) ?? false;
    this.forFriend = (data['forFriend'] as boolean) ?? false;

    // Parse author
    const authorData = (data['author'] ?? {}) as Record<string, unknown>;
    const authorStats = data['authorStats'] as Record<string, unknown> | undefined;
    if (authorStats) {
      authorData['authorStats'] = authorStats;
    }
    this.author = new User(authorData);

    // Parse video
    this.video = new VideoInfo((data['video'] ?? {}) as Record<string, unknown>);

    // Parse music
    this.music = new Music((data['music'] ?? {}) as Record<string, unknown>);

    // Parse stats
    const s = (data['stats'] ?? {}) as Record<string, unknown>;
    this.stats = {
      playCount: (s['playCount'] as number) ?? 0,
      diggCount: (s['diggCount'] as number) ?? 0,
      commentCount: (s['commentCount'] as number) ?? 0,
      shareCount: (s['shareCount'] as number) ?? 0,
      collectCount: (s['collectCount'] as number) ?? 0,
    };

    // Parse challenges (hashtags)
    const challengeData = (data['challenges'] ?? []) as Record<string, unknown>[];
    this.challenges = ObservedArray.from_array(
      challengeData.map(c => new Hashtag(c))
    );

    // Parse text extra
    this.textExtra = (data['textExtra'] ?? []) as TextExtra[];

    // Parse contents
    this.contents = (data['contents'] ?? []) as Array<{ desc: string; textExtra?: TextExtra[] }>;

    // Drama detection
    this.isDrama = this.categoryType === 108;
  }

  /** Video URL */
  get url(): string {
    return `https://www.tiktok.com/@${this.author.uniqueId}/video/${this.id}`;
  }

  /** Created date */
  get createdAt(): Date {
    return new Date(this.createTime * 1000);
  }

  /** Play URL shorthand */
  get playUrl(): string | undefined {
    return this.video.playUrl;
  }

  /**
   * Resolve direct playable video streams (HTML5 MP4) and unwatermarked download URLs
   * for this post without requiring cookies or authentication.
   */
  async resolveStream(): Promise<ResolvedVideo> {
    return resolveVideo(this.id);
  }
}
