/**
 * TokParser — maps raw JSON from SSR/API into typed TokNode instances.
 * TokKit TokParser — transforms raw TikTok JSON into typed node objects.
 */

import { ObservedArray } from './helpers.js';
import Post from './nodes/Post.js';
import User from './nodes/User.js';
import LiveRoom from './nodes/LiveRoom.js';
import MusicSearchResult from './nodes/MusicSearchResult.js';
import ShortDrama from './nodes/ShortDrama.js';
import Log from '../utils/Log.js';

const TAG = 'TokParser';

const TokParser = {
  /**
   * Parse an array of raw item objects into Post nodes.
   */
  parseItemList(items: unknown[]): ObservedArray<Post> {
    if (!Array.isArray(items)) {
      Log.warn(TAG, 'parseItemList: expected array, got', typeof items);
      return new ObservedArray<Post>();
    }

    const posts = items
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map(item => {
        try {
          return new Post(item);
        } catch (e) {
          Log.warn(TAG, 'Failed to parse item:', (e as Error).message);
          return null;
        }
      })
      .filter((p): p is Post => p !== null);

    return ObservedArray.from_array(posts);
  },

  /**
   * Parse user detail data from SSR webapp.user-detail scope.
   */
  parseUserDetail(data: Record<string, unknown>): { user: User; posts: ObservedArray<Post> } {
    const userInfo = (data['userInfo'] ?? {}) as Record<string, unknown>;
    const userData = (userInfo['user'] ?? {}) as Record<string, unknown>;
    const statsData = userInfo['stats'] as Record<string, unknown> | undefined;

    if (statsData) {
      userData['authorStats'] = statsData;
    }

    const user = new User(userData);
    const itemList = (data['itemList'] ?? []) as unknown[];
    const posts = TokParser.parseItemList(itemList);

    return { user, posts };
  },

  /**
   * Parse video detail data from SSR webapp.video-detail scope.
   */
  parseVideoDetail(data: Record<string, unknown>): Post {
    const itemStruct = (data['itemInfo'] ?? data['itemStruct'] ?? data) as Record<string, unknown>;
    // Some responses have itemInfo.itemStruct nesting
    const actual = (itemStruct['itemStruct'] ?? itemStruct) as Record<string, unknown>;
    return new Post(actual);
  },

  /**
   * Parse live search results.
   */
  parseLiveSearchResults(items: unknown[]): ObservedArray<LiveRoom> {
    if (!Array.isArray(items)) return new ObservedArray<LiveRoom>();

    const rooms = items
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map(item => {
        try { return new LiveRoom(item); } catch { return null; }
      })
      .filter((r): r is LiveRoom => r !== null);

    return ObservedArray.from_array(rooms);
  },

  /**
   * Parse music search results.
   */
  parseMusicSearchResults(items: unknown[]): ObservedArray<MusicSearchResult> {
    if (!Array.isArray(items)) return new ObservedArray<MusicSearchResult>();

    const results = items
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map(item => {
        try { return new MusicSearchResult(item); } catch { return null; }
      })
      .filter((r): r is MusicSearchResult => r !== null);

    return ObservedArray.from_array(results);
  },

  /**
   * Parse drama list from /api/drama/theme/drama_list/.
   */
  parseDramaList(items: unknown[]): ObservedArray<ShortDrama> {
    if (!Array.isArray(items)) {
      Log.warn(TAG, 'parseDramaList: expected array, got', typeof items);
      return new ObservedArray<ShortDrama>();
    }

    const dramas = items
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map(item => {
        try {
          return new ShortDrama(item);
        } catch (e) {
          Log.warn(TAG, 'Failed to parse short drama:', (e as Error).message);
          return null;
        }
      })
      .filter((d): d is ShortDrama => d !== null);

    return ObservedArray.from_array(dramas);
  },
};

export default TokParser;
