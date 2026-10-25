/**
 * User node — from author/userInfo fields in TikTok data.
 * All 40+ fields verified from live SSR responses.
 */

import { TokNode } from '../helpers.js';

export interface UserStats {
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  diggCount: number;
  friendCount: number;
}

export interface BioLink {
  link: string;
  risk: number;
}

export default class User extends TokNode {
  readonly id: string;
  readonly uniqueId: string;
  readonly nickname: string;
  readonly avatarLarger: string;
  readonly avatarMedium: string;
  readonly avatarThumb: string;
  readonly signature: string;
  readonly verified: boolean;
  readonly secUid: string;
  readonly privateAccount: boolean;
  readonly isUnderAge18: boolean;
  readonly relation: number;
  readonly commentSetting: number;
  readonly duetSetting: number;
  readonly stitchSetting: number;
  readonly downloadSetting: number;
  readonly bioLink?: BioLink;
  readonly stats?: UserStats;
  readonly isShortDramaCreator: boolean;

  constructor(data: Record<string, unknown>) {
    super('User');
    this.id = String(data['id'] ?? '');
    this.uniqueId = (data['uniqueId'] as string) ?? '';
    this.nickname = (data['nickname'] as string) ?? '';
    this.avatarLarger = (data['avatarLarger'] as string) ?? '';
    this.avatarMedium = (data['avatarMedium'] as string) ?? '';
    this.avatarThumb = (data['avatarThumb'] as string) ?? '';
    this.signature = (data['signature'] as string) ?? '';
    this.verified = (data['verified'] as boolean) ?? false;
    this.secUid = (data['secUid'] as string) ?? '';
    this.privateAccount = (data['privateAccount'] as boolean) ?? false;
    this.isUnderAge18 = (data['isUnderAge18'] as boolean) ?? false;
    this.relation = (data['relation'] as number) ?? 0;
    this.commentSetting = (data['commentSetting'] as number) ?? 0;
    this.duetSetting = (data['duetSetting'] as number) ?? 0;
    this.stitchSetting = (data['stitchSetting'] as number) ?? 0;
    this.downloadSetting = (data['downloadSetting'] as number) ?? 0;
    this.bioLink = data['bioLink'] as BioLink | undefined;

    // Short drama creator flag
    const sdc = data['shortDramaCreator'];
    this.isShortDramaCreator = sdc !== undefined && sdc !== null && Object.keys(sdc as object).length > 0;

    // Stats may come from authorStats or user.stats
    const stats = data['authorStats'] ?? data['stats'];
    if (stats && typeof stats === 'object') {
      const s = stats as Record<string, unknown>;
      this.stats = {
        followerCount: (s['followerCount'] as number) ?? 0,
        followingCount: (s['followingCount'] as number) ?? 0,
        heartCount: (s['heartCount'] as number) ?? (s['heart'] as number) ?? 0,
        videoCount: (s['videoCount'] as number) ?? 0,
        diggCount: (s['diggCount'] as number) ?? 0,
        friendCount: (s['friendCount'] as number) ?? 0,
      };
    }
  }

  get profileUrl(): string {
    return `https://www.tiktok.com/@${this.uniqueId}`;
  }
}
