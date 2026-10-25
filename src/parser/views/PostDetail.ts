/**
 * PostDetail view — parsed from SSR webapp.video-detail scope.
 */

import Post from '../../parser/nodes/Post.js';
import type User from '../../parser/nodes/User.js';
import type VideoInfo from '../../parser/nodes/VideoInfo.js';
import type Music from '../../parser/nodes/Music.js';
import type { PostStats } from '../../parser/nodes/Post.js';

export default class PostDetail {
  readonly post: Post;

  constructor(post: Post) {
    this.post = post;
  }

  get id(): string { return this.post.id; }
  get desc(): string { return this.post.desc; }
  get author(): User { return this.post.author; }
  get video(): VideoInfo { return this.post.video; }
  get music(): Music { return this.post.music; }
  get stats(): PostStats { return this.post.stats; }
  get url(): string { return this.post.url; }
  get playUrl(): string | undefined { return this.post.playUrl; }
  get isDrama(): boolean { return this.post.isDrama; }
  get createdAt(): Date { return this.post.createdAt; }
}
