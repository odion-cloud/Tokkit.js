/**
 * UserProfile view — parsed from SSR webapp.user-detail scope.
 */

import { ObservedArray } from '../../parser/helpers.js';
import User from '../../parser/nodes/User.js';
import type { UserStats } from '../../parser/nodes/User.js';
import Post from '../../parser/nodes/Post.js';

export default class UserProfile {
  readonly user: User;
  readonly posts: ObservedArray<Post>;

  constructor(user: User, posts: ObservedArray<Post>) {
    this.user = user;
    this.posts = posts;
  }

  get uniqueId(): string { return this.user.uniqueId; }
  get nickname(): string { return this.user.nickname; }
  get verified(): boolean { return this.user.verified; }
  get signature(): string { return this.user.signature; }
  get stats(): UserStats | undefined { return this.user.stats; }
  get isShortDramaCreator(): boolean { return this.user.isShortDramaCreator; }
  get followerCount(): number { return this.user.stats?.followerCount ?? 0; }
  get videoCount(): number { return this.user.stats?.videoCount ?? 0; }
  get avatarUrl(): string { return this.user.avatarLarger; }

  get videos(): Post[] {
    return [...this.posts];
  }
}
