/**
 * TokKit — the main entry point and facade for the TikTok client library.
 * Provides a unified API for accessing TikTok's internal endpoints.
 *
 * @example
 * ```ts
 * import TokKit from '@odion-cloud/tokkit.js';
 *
 * const tt = await TokKit.create();
 *
 * // Get a user profile
 * const profile = await tt.getUser('charlidamelio');
 * console.log(profile.nickname, profile.followerCount);
 *
 * // Get drama content
 * const drama = await tt.getDrama();
 * for (const video of drama.videos) {
 *   console.log(video.desc, video.stats.playCount);
 * }
 *
 * // Search for live streams
 * const lives = await tt.searchLive('music');
 * for (const room of lives.rooms) {
 *   console.log(room.title, room.userCount, room.streamUrl?.rtmpPullUrl);
 * }
 * ```
 */

import Session, { type TokKitConfig } from './core/Session.js';
import Actions from './core/Actions.js';
import TokParser from './parser/TokParser.js';
import { URLS, SCOPE_KEYS, API_PATHS, type ExploreCategory } from './utils/Constants.js';
import { throwIfMissing, TokKitError } from './utils/Utils.js';
import Log from './utils/Log.js';

import ForYouFeed from './parser/views/ForYouFeed.js';
import UserProfile from './parser/views/UserProfile.js';
import PostDetail from './parser/views/PostDetail.js';
import ExploreFeed from './parser/views/ExploreFeed.js';
import DramaFeed, { type DramaFeedOptions } from './parser/views/DramaFeed.js';
import DramaEpisodeFeed, { type DramaEpisodeOptions } from './parser/views/DramaEpisodeFeed.js';
import LiveSearchFeed from './parser/views/LiveSearchFeed.js';
import MusicSearchFeed from './parser/views/MusicSearchFeed.js';
import ShortDrama, { type DramaFilterCategories } from './parser/nodes/ShortDrama.js';
import { resolveVideo, type ResolvedVideo } from './utils/VideoResolver.js';

export type { ResolvedVideo, DramaFilterCategories, DramaEpisodeOptions, DramaFeedOptions };

const TAG = 'TokKit';

export interface OEmbedResult {
  version: string;
  type: string;
  width: number;
  height: number;
  html: string;
  provider_url: string;
  provider_name: string;
  embed_product_id: string;
  embed_type: string;
}

export default class TokKit {
  readonly #session: Session;
  readonly #actions: Actions;

  private constructor(session: Session, config: TokKitConfig = {}) {
    this.#session = session;
    this.#actions = new Actions(session, {
      signer: config.signer,
      signerServiceUrl: config.signerServiceUrl,
    });
  }

  /**
   * Create a new TokKit instance.
   * Automatically establishes a session with TikTok (acquires ttwid cookie).
   *
   * @param config - Optional configuration (language, sessionId for auth, etc.)
   */
  static async create(config: TokKitConfig = {}): Promise<TokKit> {
    Log.info(TAG, 'Initializing TokKit...');
    const session = await Session.create(config);
    const instance = new TokKit(session, config);
    Log.info(TAG, 'TokKit ready.');
    return instance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1 — SSR-based methods (no signing required)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get a user's profile and recent videos.
   *
   * @param username - TikTok username (without @)
   * @returns UserProfile with user info and video list
   */
  async getUser(username: string): Promise<UserProfile> {
    throwIfMissing({ username });

    // Strip @ if provided
    const cleanName = username.replace(/^@/, '');
    Log.info(TAG, `Fetching user: @${cleanName}`);

    const scope = await this.#actions.fetchSSR(`/@${cleanName}`);
    const userDetail = scope[SCOPE_KEYS.USER_DETAIL] as Record<string, unknown> | undefined;

    if (!userDetail) {
      throw new TokKitError(`User not found or data unavailable: @${cleanName}`);
    }

    const { user, posts } = TokParser.parseUserDetail(userDetail);
    return new UserProfile(user, posts);
  }

  /**
   * Get full details for a specific video post.
   *
   * @param videoId - The video ID (numeric string)
   * @param author - Optional author username (improves URL resolution)
   * @returns PostDetail with full video data including playAddr
   */
  async getPost(videoId: string, author?: string): Promise<PostDetail> {
    throwIfMissing({ videoId });

    const path = author
      ? `/@${author.replace(/^@/, '')}/video/${videoId}`
      : `/video/${videoId}`;

    Log.info(TAG, `Fetching video: ${videoId}`);

    const scope = await this.#actions.fetchSSR(path);
    const videoDetail = scope[SCOPE_KEYS.VIDEO_DETAIL] as Record<string, unknown> | undefined;

    if (!videoDetail) {
      throw new TokKitError(`Video not found: ${videoId}`);
    }

    const post = TokParser.parseVideoDetail(videoDetail);
    return new PostDetail(post);
  }

  /**
   * Get the For You Page feed (trending/recommended videos).
   *
   * @returns ForYouFeed with recommended videos
   */
  async getFYP(): Promise<ForYouFeed> {
    Log.info(TAG, 'Fetching FYP...');

    const scope = await this.#actions.fetchSSR('/foryou');
    const fypData = scope[SCOPE_KEYS.FYP_VIDEO] as Record<string, unknown> | undefined;

    if (!fypData) {
      throw new TokKitError('FYP data not available');
    }

    const rawItems = (fypData['itemList'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    return new ForYouFeed(items);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1 — API-based methods (no signing required)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get Explore feed by category.
   * Supports all 21 categories. Paginated with cursor-based navigation.
   *
   * @param category - Category type (use EXPLORE_CATEGORIES enum, default: ALL)
   * @returns ExploreFeed with paginated results
   */
  async getExplore(category?: ExploreCategory): Promise<ExploreFeed> {
    Log.info(TAG, `Fetching explore feed, category=${category ?? 'all'}`);
    return ExploreFeed.create(this.#actions, category);
  }

  /**
   * Get Short Drama content feed directly from TikTok's Short Drama portal (https://www.tiktok.com/shortdrama).
   * Calls TikTok's official /api/drama/theme/drama_list/ endpoint.
   *
   * @param options - Optional configuration { themeType?: number, storeRegion?: string, count?: number, categoryDateType?: number, tagIDList?: string | string[] }
   * @returns DramaFeed with paginated ShortDrama series
   */
  async getDrama(options?: DramaFeedOptions): Promise<DramaFeed> {
    Log.info(TAG, 'Fetching short drama feed...');
    return DramaFeed.create(this.#actions, options);
  }

  /**
   * Alias for getDrama() — fetch Short Drama series.
   */
  async getShortDrama(options?: DramaFeedOptions): Promise<DramaFeed> {
    return this.getDrama(options);
  }

  /**
   * Get Trending / Hot Short Drama series (themeType: 7).
   */
  async getDramaTrending(options?: Omit<DramaFeedOptions, 'themeType'>): Promise<DramaFeed> {
    Log.info(TAG, 'Fetching trending short dramas...');
    return DramaFeed.getTrending(this.#actions, options);
  }

  /**
   * Get Top Ranked Short Drama series (themeType: 9).
   */
  async getDramaRanking(options?: Omit<DramaFeedOptions, 'themeType'>): Promise<DramaFeed> {
    Log.info(TAG, 'Fetching drama ranking chart...');
    return DramaFeed.getRanking(this.#actions, options);
  }

  /**
   * Get Latest / All Short Drama series (themeType: 10).
   */
  async getDramaLatest(options?: Omit<DramaFeedOptions, 'themeType'>): Promise<DramaFeed> {
    Log.info(TAG, 'Fetching latest short dramas...');
    return DramaFeed.getLatest(this.#actions, options);
  }

  /**
   * Get New Releases Short Drama series (published in the last 7 days).
   */
  async getDramaNewReleases(options?: Omit<DramaFeedOptions, 'categoryDateType'>): Promise<DramaFeed> {
    Log.info(TAG, 'Fetching new release short dramas...');
    return DramaFeed.getNewReleases(this.#actions, options);
  }

  /**
   * Get all episodes for a specific Short Drama series.
   *
   * @param dramaId - Short Drama ID (e.g. '7696090095891715080')
   * @param options - Pagination options { count?: number, cursor?: number, storeRegion?: string }
   * @returns DramaEpisodeFeed with paginated episode Post nodes
   */
  async getDramaEpisodes(
    dramaId: string,
    options?: Omit<DramaEpisodeOptions, 'dramaId'>
  ): Promise<DramaEpisodeFeed> {
    throwIfMissing({ dramaId });
    Log.info(TAG, `Fetching episodes for drama: ${dramaId}`);
    return DramaEpisodeFeed.create(this.#actions, { dramaId, ...options });
  }

  /**
   * Get full details for a Short Drama series.
   *
   * @param dramaId - Short Drama ID
   * @param options - Options { storeRegion?: string }
   * @returns ShortDrama node with complete metadata
   */
  async getDramaDetail(
    dramaId: string,
    options: { storeRegion?: string } = {}
  ): Promise<ShortDrama> {
    throwIfMissing({ dramaId });
    Log.info(TAG, `Fetching drama detail: ${dramaId}`);

    const res = await this.#actions.fetchAPI(
      API_PATHS.DRAMA_DETAIL,
      {
        dramaID: dramaId,
        aid: '1233',
        storeRegion: options.storeRegion ?? 'US',
      },
      { headers: { referer: 'https://www.tiktok.com/shortdrama' } }
    );

    const respData = res as unknown as Record<string, unknown>;
    const dramaInfo = (respData['dramaInfo'] ?? {}) as Record<string, unknown>;
    return new ShortDrama(dramaInfo);
  }

  /**
   * Get Short Drama category filters (genres, themes, release dates).
   *
   * @param options - Options { storeRegion?: string }
   * @returns DramaFilterCategories containing genres, themes, and release dates
   */
  async getDramaCategories(
    options: { storeRegion?: string } = {}
  ): Promise<DramaFilterCategories> {
    Log.info(TAG, 'Fetching short drama category filters...');

    const res = await this.#actions.fetchAPI(
      API_PATHS.DRAMA_CATEGORIES,
      {
        aid: '1233',
        storeRegion: options.storeRegion ?? 'US',
      },
      { headers: { referer: 'https://www.tiktok.com/shortdrama' } }
    );

    const respData = res as unknown as Record<string, unknown>;
    const categoryLists = (respData['dramaCategoryLists'] ?? []) as Array<{
      dramaCategories?: Array<Record<string, unknown>>;
    }>;

    const parseList = (idx: number) => {
      const cats = categoryLists[idx]?.dramaCategories ?? [];
      return cats.map(c => ({
        id: String(c['categoryID'] ?? c['id'] ?? ''),
        name: String(c['name'] ?? ''),
        filterType: Number(c['categoryFilterType'] ?? 0),
        starlingKey: String(c['starlingKey'] ?? ''),
        recentDays: c['recentDays'] ? Number(c['recentDays']) : undefined,
      }));
    };

    return {
      genres: parseList(0),
      themes: parseList(1),
      releaseDates: parseList(2),
    };
  }

  /**
   * Search for live streams.
   * Verified working without X-Bogus signing.
   *
   * @param keyword - Search query
   * @returns LiveSearchFeed with paginated live room results
   */
  async searchLive(keyword: string): Promise<LiveSearchFeed> {
    throwIfMissing({ keyword });
    Log.info(TAG, `Searching live: "${keyword}"`);
    return LiveSearchFeed.create(this.#actions, keyword);
  }

  /**
   * Search for music/sounds.
   * Verified working without X-Bogus signing.
   *
   * @param keyword - Search query
   * @returns MusicSearchFeed with paginated music results
   */
  async searchMusic(keyword: string): Promise<MusicSearchFeed> {
    throwIfMissing({ keyword });
    Log.info(TAG, `Searching music: "${keyword}"`);
    return MusicSearchFeed.create(this.#actions, keyword);
  }

  /**
   * Get oEmbed data for a TikTok URL (public, no cookies needed).
   *
   * @param url - Full TikTok video URL
   * @returns OEmbed data with embed HTML
   */
  async getOEmbed(url: string): Promise<OEmbedResult> {
    throwIfMissing({ url });

    const { data } = await this.#session.http.fetchAPI<OEmbedResult>(
      '/oembed',
      { url }
    );
    return data;
  }

  /**
   * Resolve any TikTok video, short drama episode, or URL into direct playable MP4 streams.
   * Works without authentication, cookies, or X-Bogus signing.
   * Provides direct HTML5-playable CDN URLs, watermark-free download URLs, and quality options.
   *
   * @param videoIdOrUrl - Video ID (numeric string) or full/short TikTok URL
   * @returns ResolvedVideo with direct MP4 playUrl, no-watermark downloadUrl, and qualities
   *
   * @example
   * ```ts
   * const video = await tt.resolveVideo('7449553535941954848');
   * console.log(video.playUrl);      // Direct CDN MP4 (HTML5 playable)
   * console.log(video.downloadUrl);  // No-watermark MP4 download
   * console.log(video.qualities);    // 720p, 540p, 480p streams
   * ```
   */
  async resolveVideo(videoIdOrUrl: string): Promise<ResolvedVideo> {
    throwIfMissing({ videoIdOrUrl });
    Log.info(TAG, `Resolving video: ${videoIdOrUrl}`);
    return resolveVideo(videoIdOrUrl);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 2 — Signed API methods (require X-Bogus)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Search for videos (requires X-Bogus signing).
   *
   * @param keyword - Search query
   * @returns Array of Post results
   */
  async searchVideos(keyword: string): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/Post.js').default>; hasMore: boolean; cursor: number }> {
    throwIfMissing({ keyword });
    Log.info(TAG, `Searching videos: "${keyword}"`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.SEARCH_VIDEO, {
      keyword,
      count: 12,
      offset: 0,
      search_source: 'normal_search',
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['item_list'] ?? respData['data'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const hasMore = ((respData['has_more'] as number | undefined) === 1);
    const cursor = (respData['cursor'] as number | undefined) ?? items.length;

    return { items, hasMore, cursor };
  }

  /**
   * Search for users (requires X-Bogus signing).
   *
   * @param keyword - Search query
   * @returns Raw user list data
   */
  async searchUsers(keyword: string): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/User.js').default>; hasMore: boolean }> {
    throwIfMissing({ keyword });
    Log.info(TAG, `Searching users: "${keyword}"`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.SEARCH_USER, {
      keyword,
      count: 12,
      offset: 0,
      search_source: 'normal_search',
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawUsers = (respData['user_list'] ?? respData['data'] ?? []) as Record<string, unknown>[];
    const { ObservedArray } = await import('./parser/helpers.js');
    const { default: User } = await import('./parser/nodes/User.js');
    const users = ObservedArray.from_array(
      rawUsers.map(u => new User((u['user_info'] ?? u) as Record<string, unknown>))
    );
    const hasMore = ((respData['has_more'] as number | undefined) === 1);

    return { items: users, hasMore };
  }

  /**
   * Get comments for a video (requires X-Bogus signing).
   *
   * @param postId - Video ID
   * @param cursor - Pagination cursor (default: 0)
   * @returns Comments list with pagination info
   */
  async getComments(postId: string, cursor: number = 0): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/Comment.js').default>; hasMore: boolean; cursor: number }> {
    throwIfMissing({ postId });
    Log.info(TAG, `Fetching comments for: ${postId}`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.COMMENT_LIST, {
      aweme_id: postId,
      count: 20,
      cursor,
      // These params are REQUIRED — without them the endpoint returns empty body
      // Learned from sangzun-han/Tiktok-Api reference
      fromWeb: 1,
      enter_from: 'tiktok_web',
      current_region: this.#session.config.region,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawComments = (respData['comments'] ?? []) as Record<string, unknown>[];
    const { ObservedArray } = await import('./parser/helpers.js');
    const { default: Comment } = await import('./parser/nodes/Comment.js');
    const comments = ObservedArray.from_array(
      rawComments.map(c => new Comment(c))
    );
    const hasMore = ((respData['has_more'] as number | undefined) === 1);
    const nextCursor = (respData['cursor'] as number | undefined) ?? (cursor + comments.length);

    return { items: comments, hasMore, cursor: nextCursor };
  }

  /**
   * Get posts from a hashtag/challenge (requires X-Bogus signing).
   *
   * @param tag - Hashtag name (without #)
   * @param cursor - Pagination cursor (default: 0)
   */
  async getHashtagPosts(tag: string, cursor: number = 0): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/Post.js').default>; hasMore: boolean; cursor: number }> {
    throwIfMissing({ tag });
    Log.info(TAG, `Fetching hashtag: #${tag}`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.CHALLENGE_ITEM_LIST, {
      challengeName: tag,
      count: 16,
      cursor,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['itemList'] ?? respData['data'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const hasMore = (respData['hasMore'] as boolean | undefined) ?? false;
    const nextCursor = (respData['cursor'] as number | undefined) ?? (cursor + items.length);

    return { items, hasMore, cursor: nextCursor };
  }

  /**
   * Get posts using a specific sound/music (requires X-Bogus signing).
   *
   * @param musicId - Music ID
   * @param cursor - Pagination cursor (default: 0)
   */
  async getSound(musicId: string, cursor: number = 0): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/Post.js').default>; hasMore: boolean; cursor: number }> {
    throwIfMissing({ musicId });
    Log.info(TAG, `Fetching sound: ${musicId}`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.MUSIC_ITEM_LIST, {
      musicID: musicId,
      count: 16,
      cursor,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['itemList'] ?? respData['data'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const hasMore = (respData['hasMore'] as boolean | undefined) ?? false;
    const nextCursor = (respData['cursor'] as number | undefined) ?? (cursor + items.length);

    return { items, hasMore, cursor: nextCursor };
  }

  /**
   * Get user detail via API (avoids WAF challenge on SSR profile pages).
   * Learned from sangzun-han/Tiktok-Api — requires signing.
   *
   * @param username - TikTok username (without @)
   * @param secUid - Optional secUid for direct lookup
   */
  async getUserDetail(username?: string, secUid?: string): Promise<Record<string, unknown>> {
    if (!username && !secUid) throw new TokKitError('getUserDetail requires username or secUid');
    Log.info(TAG, `Fetching user detail: ${username || secUid}`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.USER_DETAIL, {
      uniqueId: username ?? '',
      secUid: secUid ?? '',
      from_page: 'user',
    });

    return response as unknown as Record<string, unknown>;
  }

  /**
   * Get a user's video posts (paginated, requires signing).
   *
   * @param secUid - User's secUid
   * @param cursor - Pagination cursor
   * @param count - Items per page (default: 30)
   */
  async getUserPosts(secUid: string, cursor: number = 0, count: number = 30): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/Post.js').default>; hasMore: boolean; cursor: number }> {
    throwIfMissing({ secUid });
    Log.info(TAG, `Fetching user posts: ${secUid.substring(0, 20)}...`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.POST_ITEM_LIST, {
      secUid,
      cursor,
      count,
      coverFormat: 2,
      needPinnedItemIds: 'true',
      locate_item_id: '',
      post_item_list_request_type: 0,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['itemList'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const hasMore = (respData['hasMore'] as boolean | undefined) ?? false;
    const nextCursor = (respData['cursor'] as number | undefined) ?? (cursor + items.length);

    return { items, hasMore, cursor: nextCursor };
  }

  /**
   * Get related/recommended videos for a given post.
   *
   * @param postId - Video ID
   * @param count - Number of related videos (default: 16)
   */
  async getRelated(postId: string, count: number = 16): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/Post.js').default>; hasMore: boolean }> {
    throwIfMissing({ postId });
    Log.info(TAG, `Fetching related videos for: ${postId}`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.RELATED_ITEM_LIST, {
      itemID: postId,
      count,
      coverFormat: 2,
      isNonPersonalized: 'false',
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['itemList'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const hasMore = (respData['hasMore'] as boolean | undefined) ?? false;

    return { items, hasMore };
  }

  /**
   * Get replies to a comment (paginated, requires signing).
   *
   * @param postId - Video ID
   * @param commentId - Parent comment ID
   * @param cursor - Pagination cursor
   */
  async getCommentReplies(postId: string, commentId: string, cursor: number = 0): Promise<{ items: unknown[]; hasMore: boolean; cursor: number }> {
    throwIfMissing({ postId, commentId });
    Log.info(TAG, `Fetching replies for comment: ${commentId}`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.COMMENT_REPLY_LIST, {
      item_id: postId,
      comment_id: commentId,
      count: 20,
      cursor,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['comments'] ?? []) as unknown[];
    const hasMore = (respData['has_more'] as boolean | undefined) ?? false;
    const nextCursor = (respData['cursor'] as number | undefined) ?? (cursor + rawItems.length);

    return { items: rawItems, hasMore, cursor: nextCursor };
  }

  /**
   * Get a user's liked/favorited videos (may be private).
   *
   * @param secUid - User's secUid
   * @param cursor - Pagination cursor
   */
  async getLikedPosts(secUid: string, cursor: number = 0): Promise<{ items: import('./parser/helpers.js').ObservedArray<import('./parser/nodes/Post.js').default>; hasMore: boolean; cursor: number }> {
    throwIfMissing({ secUid });
    Log.info(TAG, `Fetching liked posts: ${secUid.substring(0, 20)}...`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.FAVORITE_ITEM_LIST, {
      secUid,
      cursor,
      count: 30,
      coverFormat: 2,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['itemList'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const hasMore = (respData['hasMore'] as boolean | undefined) ?? false;
    const nextCursor = (respData['cursor'] as number | undefined) ?? (cursor + items.length);

    return { items, hasMore, cursor: nextCursor };
  }

  /**
   * Get hashtag/challenge detail by name or ID.
   *
   * @param challengeIdOrName - Hashtag name (e.g. "fyp") or numeric ID
   */
  async getHashtagDetail(challengeIdOrName: string): Promise<Record<string, unknown>> {
    throwIfMissing({ challengeIdOrName });
    const raw = challengeIdOrName.trim().replace(/^#/, '');
    Log.info(TAG, `Fetching hashtag detail: ${raw}`);

    const params: Record<string, string> = /^\d+$/.test(raw)
      ? { challengeId: raw }
      : { challengeName: raw };

    const response = await this.#actions.fetchSignedAPI(API_PATHS.CHALLENGE_DETAIL, params);
    return response as unknown as Record<string, unknown>;
  }

  /**
   * Get music/sound detail by ID.
   *
   * @param musicId - Music ID
   */
  async getMusicDetail(musicId: string): Promise<Record<string, unknown>> {
    throwIfMissing({ musicId });
    Log.info(TAG, `Fetching music detail: ${musicId}`);

    const response = await this.#actions.fetchSignedAPI(API_PATHS.MUSIC_DETAIL, { musicId });
    return response as unknown as Record<string, unknown>;
  }

  /**
   * Get a user's followers or following list.
   *
   * @param secUid - User's secUid
   * @param scene - 'followers' or 'following'
   * @param count - Items per page (default: 30)
   * @param cursor - Pagination cursor
   */
  async getUserList(secUid: string, scene: 'followers' | 'following', count: number = 30, cursor: string = '0'): Promise<Record<string, unknown>> {
    throwIfMissing({ secUid });
    Log.info(TAG, `Fetching ${scene} for: ${secUid.substring(0, 20)}...`);

    // Scene ids from the web bundle: 67 = followers, 21 = following
    const response = await this.#actions.fetchSignedAPI(API_PATHS.USER_LIST, {
      secUid,
      count,
      minCursor: cursor,
      maxCursor: '0',
      scene: scene === 'followers' ? 67 : 21,
    });

    return response as unknown as Record<string, unknown>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3 — Auth & Write Operations (require sessionid)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Like/unlike a video post.
   * Requires authenticated session (sessionid).
   *
   * @param postId - Video ID to like
   * @param unlike - Set true to unlike (default: false = like)
   */
  async like(postId: string, unlike: boolean = false): Promise<void> {
    throwIfMissing({ postId });
    this.#requireAuth('like');
    Log.info(TAG, `${unlike ? 'Unliking' : 'Liking'}: ${postId}`);

    await this.#actions.fetchSignedAPI(API_PATHS.DIGG_ITEM, {
      aweme_id: postId,
      type: unlike ? 0 : 1,
    });
  }

  /**
   * Follow/unfollow a user.
   * Requires authenticated session (sessionid).
   *
   * @param userId - User ID (secUid or user_id)
   * @param unfollow - Set true to unfollow (default: false = follow)
   */
  async follow(userId: string, unfollow: boolean = false): Promise<void> {
    throwIfMissing({ userId });
    this.#requireAuth('follow');
    Log.info(TAG, `${unfollow ? 'Unfollowing' : 'Following'}: ${userId}`);

    await this.#actions.fetchSignedAPI(API_PATHS.FOLLOW_USER, {
      user_id: userId,
      type: unfollow ? 0 : 1,
    });
  }

  /**
   * Post a comment on a video.
   * Requires authenticated session (sessionid).
   *
   * @param postId - Video ID to comment on
   * @param text - Comment text
   * @param replyId - Optional comment ID to reply to
   */
  async comment(postId: string, text: string, replyId?: string): Promise<void> {
    throwIfMissing({ postId, text });
    this.#requireAuth('comment');
    Log.info(TAG, `Commenting on: ${postId}`);

    const params: Record<string, string | number> = {
      aweme_id: postId,
      text,
    };
    if (replyId) {
      params['reply_id'] = replyId;
    }

    await this.#actions.fetchSignedAPI(API_PATHS.COMMENT_PUBLISH, params);
  }

  /**
   * Add/remove a video from collections (favorites).
   * Requires authenticated session (sessionid).
   *
   * @param postId - Video ID to collect
   * @param uncollect - Set true to remove from collections
   */
  async collect(postId: string, uncollect: boolean = false): Promise<void> {
    throwIfMissing({ postId });
    this.#requireAuth('collect');
    Log.info(TAG, `${uncollect ? 'Uncollecting' : 'Collecting'}: ${postId}`);

    await this.#actions.fetchSignedAPI(API_PATHS.ITEM_COLLECT, {
      aweme_id: postId,
      type: uncollect ? 0 : 1,
    });
  }

  /**
   * Throw if not authenticated.
   */
  #requireAuth(action: string): void {
    if (!this.logged_in) {
      throw new TokKitError(
        `${action} requires authentication. Pass sessionId in TokKit.create({ sessionId: '...' })`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Session accessors
  // ═══════════════════════════════════════════════════════════════════════════

  /** Access the underlying session */
  get session(): Session { return this.#session; }

  /** Whether the session is authenticated */
  get logged_in(): boolean { return this.#session.logged_in; }

  /** The Actions instance for advanced usage */
  get actions(): Actions { return this.#actions; }
}
