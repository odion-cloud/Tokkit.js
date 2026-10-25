/**
 * LiveSearchFeed — paginated live search from /api/search/live/full/.
 * Verified working without X-Bogus signing.
 */

import type Actions from '../../core/Actions.js';
import CursorFeed from '../../core/mixins/CursorFeed.js';
import LiveRoom from '../../parser/nodes/LiveRoom.js';
import TokParser from '../../parser/TokParser.js';
import { API_PATHS } from '../../utils/Constants.js';
import { ObservedArray } from '../../parser/helpers.js';

export default class LiveSearchFeed extends CursorFeed<LiveRoom> {
  readonly keyword: string;

  constructor(
    actions: Actions,
    items: ObservedArray<LiveRoom>,
    cursor: number,
    hasMore: boolean,
    keyword: string
  ) {
    super(
      actions,
      items,
      cursor,
      hasMore,
      API_PATHS.SEARCH_LIVE,
      { keyword, count: 12 },
      TokParser.parseLiveSearchResults,
      'data'
    );
    this.keyword = keyword;
  }

  /**
   * Create a LiveSearchFeed by searching for live streams.
   */
  static async create(actions: Actions, keyword: string): Promise<LiveSearchFeed> {
    const response = await actions.fetchAPI(API_PATHS.SEARCH_LIVE, {
      keyword,
      offset: 0,
      count: 12,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['data'] ?? []) as unknown[];
    const items = TokParser.parseLiveSearchResults(rawItems);
    const cursor = (respData['cursor'] as number | undefined) ?? items.length;
    const hasMoreNum = respData['has_more'] as number | undefined;
    const hasMore = hasMoreNum === 1;

    return new LiveSearchFeed(actions, items, cursor, hasMore, keyword);
  }

  get rooms(): LiveRoom[] {
    return [...this.items];
  }
}
