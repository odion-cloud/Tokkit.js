/**
 * CursorFeed — pagination mixin for TikTok API feeds.
 * TokKit CursorFeed — cursor-based pagination with async iteration.
 *
 * TikTok uses cursor-based pagination (offset number) with hasMore flag.
 */

import type Actions from '../Actions.js';
import { ObservedArray } from '../../parser/helpers.js';

export default class CursorFeed<T> {
  readonly items: ObservedArray<T>;
  readonly cursor: number | string;
  readonly hasMore: boolean;

  readonly #actions: Actions;
  readonly #endpoint: string;
  readonly #params: Record<string, string | number>;
  readonly #parser: (items: unknown[]) => ObservedArray<T>;
  readonly #itemsKey: string;
  readonly #options?: { headers?: Record<string, string> };

  constructor(
    actions: Actions,
    items: ObservedArray<T>,
    cursor: number | string,
    hasMore: boolean,
    endpoint: string,
    params: Record<string, string | number>,
    parser: (items: unknown[]) => ObservedArray<T>,
    itemsKey: string = 'itemList',
    options?: { headers?: Record<string, string> }
  ) {
    this.#actions = actions;
    this.items = items;
    this.cursor = cursor;
    this.hasMore = hasMore;
    this.#endpoint = endpoint;
    this.#params = params;
    this.#parser = parser;
    this.#itemsKey = itemsKey;
    this.#options = options;
  }

  /**
   * Fetch the next page of results.
   */
  async getContinuation(): Promise<CursorFeed<T>> {
    if (!this.hasMore) {
      return new CursorFeed<T>(
        this.#actions,
        new ObservedArray<T>(),
        this.cursor,
        false,
        this.#endpoint,
        this.#params,
        this.#parser,
        this.#itemsKey,
        this.#options
      );
    }

    const nextParams = {
      ...this.#params,
      cursor: this.cursor,
    };

    const response = await this.#actions.fetchAPI(this.#endpoint, nextParams, this.#options);
    const respData = response as unknown as Record<string, unknown>;

    const rawItems = (respData[this.#itemsKey] ?? respData['data'] ?? []) as unknown[];
    const items = this.#parser(rawItems);

    const newCursor = (respData['cursor'] as number | string | undefined) ??
      (typeof this.cursor === 'number' ? this.cursor + items.length : this.cursor);
    const hasMoreFlag = respData['hasMore'] as boolean | undefined;
    const hasMoreNum = respData['has_more'] as number | undefined;
    const more = hasMoreFlag ?? (hasMoreNum === 1);

    return new CursorFeed<T>(
      this.#actions,
      items,
      newCursor,
      more,
      this.#endpoint,
      this.#params,
      this.#parser,
      this.#itemsKey,
      this.#options
    );
  }

  /**
   * Async iterator for all pages.
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<ObservedArray<T>> {
    yield this.items;

    let feed: CursorFeed<T> = this;
    while (feed.hasMore) {
      feed = await feed.getContinuation();
      if (feed.items.length === 0) break;
      yield feed.items;
    }
  }
}
