/**
 * Comment node.
 */

import { TokNode } from '../helpers.js';
import User from './User.js';

export default class Comment extends TokNode {
  readonly id: string;
  readonly text: string;
  readonly createTime: number;
  readonly diggCount: number;
  readonly replyCount: number;
  readonly author: User;
  readonly isAuthorLiked: boolean;

  constructor(data: Record<string, unknown>) {
    super('Comment');
    this.id = String(data['cid'] ?? data['id'] ?? '');
    this.text = (data['text'] as string) ?? '';
    this.createTime = (data['create_time'] as number) ?? 0;
    this.diggCount = (data['digg_count'] as number) ?? 0;
    this.replyCount = (data['reply_comment_total'] as number) ?? 0;
    this.isAuthorLiked = (data['is_author_digged'] as boolean) ?? false;

    const userData = (data['user'] ?? {}) as Record<string, unknown>;
    this.author = new User(userData);
  }

  get createdAt(): Date {
    return new Date(this.createTime * 1000);
  }
}
