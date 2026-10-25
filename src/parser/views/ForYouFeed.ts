/**
 * ForYouFeed view — parsed from SSR webapp.foryou.video scope.
 */

import { ObservedArray } from '../../parser/helpers.js';
import Post from '../../parser/nodes/Post.js';

export default class ForYouFeed {
  readonly items: ObservedArray<Post>;

  constructor(items: ObservedArray<Post>) {
    this.items = items;
  }

  get videos(): Post[] {
    return [...this.items];
  }
}
