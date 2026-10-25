/**
 * Music / Sound node — from music.* in TikTok item data.
 * All fields verified from live API responses.
 */

import { TokNode } from '../helpers.js';

export default class Music extends TokNode {
  readonly id: string;
  readonly title: string;
  readonly authorName: string;
  readonly album: string;
  readonly playUrl: string;
  readonly coverLarge: string;
  readonly coverMedium: string;
  readonly coverThumb: string;
  readonly duration: number;
  readonly isOriginal: boolean;
  readonly isAuthorArtist: boolean;

  constructor(data: Record<string, unknown>) {
    super('Music');
    this.id = String(data['id'] ?? '');
    this.title = (data['title'] as string) ?? '';
    this.authorName = (data['authorName'] as string) ?? '';
    this.album = (data['album'] as string) ?? '';
    this.duration = (data['duration'] as number) ?? 0;
    this.isOriginal = (data['original'] as boolean) ?? false;
    this.isAuthorArtist = (data['isAuthorArtist'] as boolean) ?? false;

    this.playUrl = (data['playUrl'] as string) ?? '';
    this.coverLarge = (data['coverLarge'] as string) ?? '';
    this.coverMedium = (data['coverMedium'] as string) ?? '';
    this.coverThumb = (data['coverThumb'] as string) ?? '';
  }
}
