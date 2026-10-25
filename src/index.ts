/**
 * TokKit — A comprehensive TikTok client library for Node.js
 *
 * @example
 * ```ts
 * import TokKit from '@odion-cloud/tokkit.js';
 *
 * const tt = await TokKit.create();
 * const profile = await tt.getUser('charlidamelio');
 * console.log(profile.nickname, profile.followerCount);
 * ```
 *
 * @module @odion-cloud/tokkit.js
 */

export { default, default as TokKit } from './TokKit.js';
export type { OEmbedResult } from './TokKit.js';

// Core
export { Session, Actions, CursorFeed, Signer } from './core/index.js';
export type { TokKitConfig, SignResult, SignerFunction, SignerConfig } from './core/index.js';

// Parser
export {
  TokNode, ObservedArray, Maybe, maybe,
  TokParser,
  Post, User, VideoInfo, Music, Hashtag, Comment, LiveRoom, MusicSearchResult, ShortDrama,
  ForYouFeed, UserProfile, PostDetail, ExploreFeed, DramaFeed, DramaEpisodeFeed, LiveSearchFeed, MusicSearchFeed,
} from './parser/index.js';
export type { DramaFilterCategories, DramaCategoryItem } from './parser/nodes/ShortDrama.js';

// Utils
export {
  Log, LogLevel,
  TokKitError, SessionError, ParserError, WAFError,
  URLS, APP_CONTEXT, EXPLORE_CATEGORIES, CATEGORY_NAMES, API_PATHS, SCOPE_KEYS,
  DRAMA_THEMES, DRAMA_DATE_TYPES,
} from './utils/index.js';
export type { ExploreCategory, DramaThemeType, DramaDateType } from './utils/index.js';

// HTTP
export { default as HTTPClient, CookieJar } from './utils/HTTPClient.js';
