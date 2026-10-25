/**
 * Hashtag / Challenge node.
 */

import { TokNode } from '../helpers.js';

export default class Hashtag extends TokNode {
  readonly id: string;
  readonly title: string;
  readonly desc: string;
  readonly coverLarger: string;
  readonly coverMedium: string;
  readonly coverThumb: string;
  readonly isCommerce: boolean;
  readonly profileLarger: string;
  readonly profileMedium: string;
  readonly profileThumb: string;

  constructor(data: Record<string, unknown>) {
    super('Hashtag');
    this.id = String(data['id'] ?? '');
    this.title = (data['title'] as string) ?? '';
    this.desc = (data['desc'] as string) ?? '';
    this.coverLarger = (data['coverLarger'] as string) ?? '';
    this.coverMedium = (data['coverMedium'] as string) ?? '';
    this.coverThumb = (data['coverThumb'] as string) ?? '';
    this.isCommerce = (data['isCommerce'] as boolean) ?? false;
    this.profileLarger = (data['profileLarger'] as string) ?? '';
    this.profileMedium = (data['profileMedium'] as string) ?? '';
    this.profileThumb = (data['profileThumb'] as string) ?? '';
  }

  get url(): string {
    return `https://www.tiktok.com/tag/${this.title}`;
  }
}
