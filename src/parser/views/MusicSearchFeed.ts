/**
 * MusicSearchFeed — paginated music search from /api/search/music/full/.
 * Verified working without X-Bogus signing.
 */

import type Actions from '../../core/Actions.js';
import CursorFeed from '../../core/mixins/CursorFeed.js';
import MusicSearchResult from '../../parser/nodes/MusicSearchResult.js';
import TokParser from '../../parser/TokParser.js';
import { API_PATHS } from '../../utils/Constants.js';
import { ObservedArray } from '../../parser/helpers.js';

export default class MusicSearchFeed extends CursorFeed<MusicSearchResult> {
  readonly keyword: string;

  constructor(
    actions: Actions,
    items: ObservedArray<MusicSearchResult>,
    cursor: number,
    hasMore: boolean,
    keyword: string
  ) {
    super(
      actions,
      items,
      cursor,
      hasMore,
      API_PATHS.SEARCH_MUSIC,
      { keyword, count: 12 },
      TokParser.parseMusicSearchResults,
      'data'
    );
    this.keyword = keyword;
  }

  /**
   * Create a MusicSearchFeed by searching for music/sounds.
   */
  static async create(actions: Actions, keyword: string): Promise<MusicSearchFeed> {
    const response = await actions.fetchAPI(API_PATHS.SEARCH_MUSIC, {
      keyword,
      offset: 0,
      count: 12,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['data'] ?? []) as unknown[];
    const items = TokParser.parseMusicSearchResults(rawItems);
    const cursor = (respData['cursor'] as number | undefined) ?? items.length;
    const hasMoreNum = respData['has_more'] as number | undefined;
    const hasMore = hasMoreNum === 1;

    return new MusicSearchFeed(actions, items, cursor, hasMore, keyword);
  }

  get results(): MusicSearchResult[] {
    return [...this.items];
  }
}
