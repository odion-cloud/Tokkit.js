/**
 * ExploreFeed view — paginated feed from /api/explore/item_list/.
 * Supports all 21 categories including Drama (108).
 */

import type Actions from '../../core/Actions.js';
import CursorFeed from '../../core/mixins/CursorFeed.js';
import Post from '../../parser/nodes/Post.js';
import TokParser from '../../parser/TokParser.js';
import { API_PATHS, type ExploreCategory, EXPLORE_CATEGORIES, CATEGORY_NAMES } from '../../utils/Constants.js';

export default class ExploreFeed extends CursorFeed<Post> {
  readonly categoryType: ExploreCategory;
  readonly categoryName: string;

  constructor(
    actions: Actions,
    items: import('../../parser/helpers.js').ObservedArray<Post>,
    cursor: number,
    hasMore: boolean,
    categoryType: ExploreCategory
  ) {
    super(
      actions,
      items,
      cursor,
      hasMore,
      API_PATHS.EXPLORE_ITEM_LIST,
      { categoryType, count: 16 },
      TokParser.parseItemList,
      'itemList'
    );
    this.categoryType = categoryType;
    this.categoryName = CATEGORY_NAMES[categoryType] ?? 'Unknown';
  }

  /**
   * Create an ExploreFeed by fetching the first page.
   */
  static async create(
    actions: Actions,
    category: ExploreCategory = EXPLORE_CATEGORIES.ALL
  ): Promise<ExploreFeed> {
    const response = await actions.fetchAPI(API_PATHS.EXPLORE_ITEM_LIST, {
      categoryType: category,
      count: 16,
      cursor: 0,
    });

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['itemList'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const cursor = (respData['cursor'] as number) ?? items.length;
    const hasMore = (respData['hasMore'] as boolean) ?? false;

    return new ExploreFeed(actions, items, cursor, hasMore, category);
  }

  get videos(): Post[] {
    return [...this.items];
  }
}
