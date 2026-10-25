/**
 * DramaEpisodeFeed — paginated episode list for a TikTok Short Drama series.
 * Calls TikTok's /api/drama/episode/item_list/ endpoint.
 * Returns each episode as a Post node with video duration, stats, and stream resolution.
 */

import type Actions from '../../core/Actions.js';
import CursorFeed from '../../core/mixins/CursorFeed.js';
import Post from '../nodes/Post.js';
import TokParser from '../TokParser.js';
import { API_PATHS } from '../../utils/Constants.js';
import type { ObservedArray } from '../helpers.js';
import { resolveVideo, type ResolvedVideo } from '../../utils/VideoResolver.js';

export interface DramaEpisodeOptions {
  /** Drama ID (e.g. '7696090095891715080') */
  dramaId: string;
  /** Regional store market (default: 'US') */
  storeRegion?: string;
  /** Number of episodes per page (default: 20) */
  count?: number;
  /** Offset cursor (default: 0) */
  cursor?: number;
}

export default class DramaEpisodeFeed extends CursorFeed<Post> {
  readonly dramaId: string;
  readonly totalEpisodeCount: number;
  readonly storeRegion: string;

  constructor(
    actions: Actions,
    items: ObservedArray<Post>,
    cursor: number | string,
    hasMore: boolean,
    dramaId: string,
    totalEpisodeCount: number = 0,
    storeRegion: string = 'US',
    count: number = 20
  ) {
    super(
      actions,
      items,
      cursor,
      hasMore,
      API_PATHS.DRAMA_EPISODES,
      {
        dramaID: dramaId,
        count,
        aid: '1233',
        storeRegion,
      },
      TokParser.parseItemList,
      'itemList',
      { headers: { referer: 'https://www.tiktok.com/shortdrama' } }
    );
    this.dramaId = dramaId;
    this.totalEpisodeCount = totalEpisodeCount;
    this.storeRegion = storeRegion;
  }

  /**
   * Fetch the first page of episodes for a short drama series.
   */
  static async create(
    actions: Actions,
    options: DramaEpisodeOptions
  ): Promise<DramaEpisodeFeed> {
    const dramaId = options.dramaId;
    const storeRegion = options.storeRegion ?? 'US';
    const count = options.count ?? 20;
    const cursor = options.cursor ?? 0;

    const response = await actions.fetchAPI(
      API_PATHS.DRAMA_EPISODES,
      {
        dramaID: dramaId,
        count,
        cursor,
        aid: '1233',
        storeRegion,
      },
      { headers: { referer: 'https://www.tiktok.com/shortdrama' } }
    );

    const respData = response as unknown as Record<string, unknown>;
    const rawItems = (respData['itemList'] ?? []) as unknown[];
    const items = TokParser.parseItemList(rawItems);
    const newCursor = (respData['cursor'] as number | string) ?? items.length;
    const hasMore = (respData['hasMore'] as boolean) ?? false;
    const totalCount = Number(respData['totalEpisodeCount'] ?? items.length);

    return new DramaEpisodeFeed(
      actions,
      items,
      newCursor,
      hasMore,
      dramaId,
      totalCount,
      storeRegion,
      count
    );
  }

  /**
   * Convenience getter for array of episode Post nodes.
   */
  get episodes(): Post[] {
    return [...this.items];
  }

  /**
   * Find an episode by its 1-indexed episode number.
   */
  getEpisode(episodeNumber: number): Post | undefined {
    return this.items.find(ep => {
      const num = (ep as unknown as { rawData?: Record<string, unknown> })?.rawData?.['dramaInfo'] as Record<string, unknown> | undefined;
      const vidData = num?.['DramaVideoData'] as Record<string, unknown> | undefined;
      return vidData?.['EpisodeNumber'] === episodeNumber;
    }) ?? this.items[episodeNumber - 1];
  }

  /**
   * Resolve direct playable video stream for a specific episode in this feed.
   */
  async resolveEpisodeStream(episodeNumberOrId: number | string): Promise<ResolvedVideo> {
    if (typeof episodeNumberOrId === 'number') {
      const ep = this.getEpisode(episodeNumberOrId);
      if (!ep) {
        throw new Error(`Episode #${episodeNumberOrId} not found in current loaded episodes`);
      }
      return resolveVideo(ep.id);
    }
    return resolveVideo(episodeNumberOrId);
  }
}
