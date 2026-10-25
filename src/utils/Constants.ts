/**
 * TokKit constants — all verified from live TikTok research.
 * TokKit Constants — URLs, API paths, categories, and common parameters.
 */

/** TikTok API domain configuration (from #api-domains script tag) */
export const URLS = {
  BASE: 'https://www.tiktok.com',
  WEBCAST_API: 'https://webcast.tiktok.com',
  IM_API: 'https://im-api-sg.tiktok.com',
  LOCATION_API: 'https://location-sg.tiktok.com',
  LIBRA_SDK: 'https://libraweb-sg.tiktok.com',
} as const;

/** Default app context (from webapp.app-context SSR) */
export const APP_CONTEXT = {
  aid: 1988,
  appName: 'tiktok_web',
  appType: 'm',
  appId: 1233,
} as const;

/** Default request headers */
export const DEFAULT_HEADERS: Record<string, string> = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-ch-ua': '"Chromium";v="133", "Google Chrome";v="133", "Not-A.Brand";v="8"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

/** API request headers (for JSON endpoints) */
export const API_HEADERS: Record<string, string> = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'referer': 'https://www.tiktok.com/',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

/** Default API query parameters */
export const DEFAULT_API_PARAMS: Record<string, string> = {
  aid: '1988',
  app_language: 'en',
  app_name: 'tiktok_web',
  browser_language: 'en-US',
  browser_name: 'Mozilla',
  browser_online: 'true',
  browser_platform: 'Win32',
  browser_version: '5.0',
  channel: 'tiktok_web',
  device_platform: 'web_pc',
};

/**
 * Explore category types — all 21 verified from live webapp.explore.categoryList SSR.
 * Drama = 108
 */
export const EXPLORE_CATEGORIES = {
  ALL: 120,
  SINGING_AND_DANCING: 119,
  COMEDY: 104,
  SPORTS: 112,
  ANIME_AND_COMICS: 100,
  RELATIONSHIP: 107,
  SHOWS: 101,
  LIPSYNC: 110,
  DAILY_LIFE: 105,
  BEAUTY_CARE: 102,
  GAMES: 103,
  SOCIETY: 114,
  OUTFIT: 109,
  CARS: 115,
  FOOD: 111,
  ANIMALS: 113,
  FAMILY: 106,
  DRAMA: 108,
  FITNESS_AND_HEALTH: 117,
  EDUCATION: 116,
  TECHNOLOGY: 118,
} as const;

export type ExploreCategory = typeof EXPLORE_CATEGORIES[keyof typeof EXPLORE_CATEGORIES];

/** Category type ID → human-readable name */
export const CATEGORY_NAMES: Record<number, string> = {
  120: 'All', 119: 'Singing & Dancing', 104: 'Comedy', 112: 'Sports',
  100: 'Anime & Comics', 107: 'Relationship', 101: 'Shows', 110: 'Lipsync',
  105: 'Daily Life', 102: 'Beauty Care', 103: 'Games', 114: 'Society',
  109: 'Outfit', 115: 'Cars', 111: 'Food', 113: 'Animals',
  106: 'Family', 108: 'Drama', 117: 'Fitness & Health', 116: 'Education', 118: 'Technology',
};

/** Short Drama themes */
export const DRAMA_THEMES = {
  TRENDING: 7,
  RANKING: 9,
  ALL: 10,
  LATEST: 10,
} as const;

export type DramaThemeType = typeof DRAMA_THEMES[keyof typeof DRAMA_THEMES];

/** Short Drama release date filters */
export const DRAMA_DATE_TYPES = {
  ALL: 0,
  SEVEN_DAYS: 1,
  THIRTY_DAYS: 2,
} as const;

export type DramaDateType = typeof DRAMA_DATE_TYPES[keyof typeof DRAMA_DATE_TYPES];

/** Rehydration script tag ID */
export const REHYDRATION_SCRIPT_ID = '__UNIVERSAL_DATA_FOR_REHYDRATION__';

/** SSR scope module keys per page type */
export const SCOPE_KEYS = {
  APP_CONTEXT: 'webapp.app-context',
  BIZ_CONTEXT: 'webapp.biz-context',
  USER_DETAIL: 'webapp.user-detail',
  VIDEO_DETAIL: 'webapp.video-detail',
  FYP_VIDEO: 'webapp.foryou.video',
  EXPLORE_CATEGORIES: 'webapp.explore.categoryList',
  I18N: 'webapp.i18n-translation',
  AB_TEST: 'webapp.a-b',
} as const;

/** API endpoint paths */
export const API_PATHS = {
  // Tier 1 — no signing needed
  EXPLORE_ITEM_LIST: '/api/explore/item_list/',
  DRAMA_LIST: '/api/drama/theme/drama_list/',
  DRAMA_DETAIL: '/api/drama/detail/',
  DRAMA_EPISODES: '/api/drama/episode/item_list/',
  DRAMA_CATEGORIES: '/api/drama/filter/category_list/',
  DRAMA_RECOMMEND: '/api/drama/recommend/drama_list/',
  SEARCH_LIVE: '/api/search/live/full/',
  SEARCH_MUSIC: '/api/search/music/full/',
  OEMBED: '/oembed',

  // Tier 2 — needs X-Bogus signing
  SEARCH_GENERAL: '/api/search/general/full/',
  SEARCH_VIDEO: '/api/search/item/full/',
  SEARCH_USER: '/api/search/user/full/',
  SEARCH_HASHTAG: '/api/search/challenge/full/',
  POST_ITEM_LIST: '/api/post/item_list/',
  COMMENT_LIST: '/api/comment/list/',
  COMMENT_REPLY_LIST: '/api/comment/list/reply/',
  ITEM_DETAIL: '/api/item/detail/',
  CHALLENGE_ITEM_LIST: '/api/challenge/item_list/',
  CHALLENGE_DETAIL: '/api/challenge/detail/',
  MUSIC_ITEM_LIST: '/api/music/item_list/',
  MUSIC_DETAIL: '/api/music/detail/',
  RECOMMEND_ITEM_LIST: '/api/recommend/item_list/',
  RELATED_ITEM_LIST: '/api/related/item_list/',
  USER_DETAIL: '/api/user/detail/',
  USER_LIST: '/api/user/list/',
  FAVORITE_ITEM_LIST: '/api/favorite/item_list/',
  USER_PLAYLIST: '/api/user/playlist/',
  MIX_DETAIL: '/api/mix/detail/',
  MIX_ITEM_LIST: '/api/mix/item_list/',

  // Tier 3 — auth required
  FOLLOW_USER: '/api/commit/follow/user',
  DIGG_ITEM: '/api/commit/item/digg',
  COMMENT_PUBLISH: '/api/comment/publish',
  ITEM_COLLECT: '/api/item/collect',

  // Passport / session
  TOKEN_BEAT: '/passport/token/beat/web/',
} as const;

