/**
 * DramaFeed — paginated feed for TikTok Short Drama (https://www.tiktok.com/shortdrama).
 * Calls TikTok's official /api/drama/theme/drama_list/ endpoint.
 * Supports Trending, Ranking, All, Latest, and New Releases tabs with genre/theme filtering.
 */

import type Actions from '../../core/Actions.js';
import CursorFeed from '../../core/mixins/CursorFeed.js';
import ShortDrama from '../nodes/ShortDrama.js';
import TokParser from '../TokParser.js';
import { API_PATHS, DRAMA_THEMES, DRAMA_DATE_TYPES, type DramaThemeType, type DramaDateType } from '../../utils/Constants.js';
import type { ObservedArray } from '../helpers.js';

export interface DramaFeedOptions {
  /**
   * Theme type ID:
   * - 7: Trending / Hot
   * - 9: Ranking / Top Charts
   * - 10: All / Latest
   * (default: DRAMA_THEMES.TRENDING = 7)
   */
  themeType?: DramaThemeType | number;
  /**
   * Release date filter:
   * - 0: All
   * - 1: In 7 Days (New Releases)
   * - 2: In 30 Days
   */
  categoryDateType?: DramaDateType | number;
  /**
   * Category tag IDs for filtering (genre, story theme).
   * Either comma-separated string (e.g. "0,7628991193891853328,0") or string array.
   */
  tagIDList?: string | string[];
  /** Regional store market (default: 'US') */
  storeRegion?: string;
  /** Number of items to retrieve per page (default: 20) */
  count?: number;
}

export default class DramaFeed extends CursorFeed<ShortDrama> {
  readonly themeType: number;
  readonly storeRegion: string;
  readonly categoryDateType?: number;
  readonly tagIDList?: string;

  constructor(
    actions: Actions,
    items: ObservedArray<ShortDrama>,
    cursor: string | number,
    hasMore: boolean,
    themeType: number = DRAMA_THEMES.TRENDING,
    storeRegion: string = 'US',
    categoryDateType?: number,
    tagIDList?: string
  ) {
    const params: Record<string, string | number> = {
      aid: '1233',
      app_name: 'tiktok_web',
      device_platform: 'web_pc',
      channel: 'tiktok_web',
      count: 20,
      coverFormat: 2,
      themeType,
      oneColumnMode: 'true',
      storeRegion,
      referer: 'https://www.tiktok.com/shortdrama',
      root_referer: 'https://www.tiktok.com/shortdrama',
    };

    if (categoryDateType !== undefined) {
      params['categoryDateType'] = categoryDateType;
    }

    if (tagIDList) {
      params['tagIDList'] = tagIDList;
    }

    super(
      actions,
      items,
      cursor,
      hasMore,
      API_PATHS.DRAMA_LIST,
      params,
      TokParser.parseDramaList,
      'dramaList',
      { headers: { referer: 'https://www.tiktok.com/shortdrama' } }
    );
    this.themeType = themeType;
    this.storeRegion = storeRegion;
    this.categoryDateType = categoryDateType;
    this.tagIDList = tagIDList;
  }

  /**
   * Create a DramaFeed by fetching the first page of Short Drama series.
   */
  static async create(
    actions: Actions,
    options: DramaFeedOptions = {}
  ): Promise<DramaFeed> {
    const themeType = options.themeType ?? DRAMA_THEMES.TRENDING;
    const storeRegion = options.storeRegion ?? 'US';
    const count = options.count ?? 20;
    const categoryDateType = options.categoryDateType;
    const tagIDList = Array.isArray(options.tagIDList)
      ? options.tagIDList.join(',')
      : options.tagIDList;

    const requestParams: Record<string, string | number> = {
      aid: '1233',
      app_name: 'tiktok_web',
      device_platform: 'web_pc',
      channel: 'tiktok_web',
      count,
      cursor: 0,
      coverFormat: 2,
      themeType,
      oneColumnMode: 'true',
      storeRegion,
      referer: 'https://www.tiktok.com/shortdrama',
      root_referer: 'https://www.tiktok.com/shortdrama',
    };

    if (categoryDateType !== undefined) {
      requestParams['categoryDateType'] = categoryDateType;
    }

    if (tagIDList) {
      requestParams['tagIDList'] = tagIDList;
    }

    const response = await actions.fetchAPI(
      API_PATHS.DRAMA_LIST,
      requestParams,
      { headers: { referer: 'https://www.tiktok.com/shortdrama' } }
    );

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['dramaList'] ?? []) as unknown[];
    const items = TokParser.parseDramaList(rawItems);
    const cursor = (respData['cursor'] as string | number) ?? '0';
    const hasMore = (respData['hasMore'] as boolean) ?? false;

    return new DramaFeed(
      actions,
      items,
      cursor,
      hasMore,
      themeType,
      storeRegion,
      categoryDateType,
      tagIDList
    );
  }

  /**
   * Fetch Trending / Hot short dramas (themeType: 7).
   */
  static async getTrending(
    actions: Actions,
    options: Omit<DramaFeedOptions, 'themeType'> = {}
  ): Promise<DramaFeed> {
    return DramaFeed.create(actions, { ...options, themeType: DRAMA_THEMES.TRENDING });
  }

  /**
   * Fetch Ranking / Top short dramas (themeType: 9).
   */
  static async getRanking(
    actions: Actions,
    options: Omit<DramaFeedOptions, 'themeType'> = {}
  ): Promise<DramaFeed> {
    return DramaFeed.create(actions, { ...options, themeType: DRAMA_THEMES.RANKING });
  }

  /**
   * Fetch Latest / All short dramas (themeType: 10).
   */
  static async getLatest(
    actions: Actions,
    options: Omit<DramaFeedOptions, 'themeType'> = {}
  ): Promise<DramaFeed> {
    return DramaFeed.create(actions, { ...options, themeType: DRAMA_THEMES.LATEST });
  }

  /**
   * Fetch New Releases (published in last 7 days).
   */
  static async getNewReleases(
    actions: Actions,
    options: Omit<DramaFeedOptions, 'categoryDateType'> = {}
  ): Promise<DramaFeed> {
    return DramaFeed.create(actions, {
      ...options,
      themeType: options.themeType ?? DRAMA_THEMES.ALL,
      categoryDateType: DRAMA_DATE_TYPES.SEVEN_DAYS
    });
  }

  /**
   * Convenience getter for drama series list.
   */
  get dramas(): ShortDrama[] {
    return [...this.items];
  }
}
