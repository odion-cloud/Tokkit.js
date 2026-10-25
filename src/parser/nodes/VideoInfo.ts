/**
 * Video info node — extracted from video.* fields in TikTok item data.
 * All fields verified from live API responses.
 */

import { TokNode } from '../helpers.js';

export interface VideoThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface SubtitleInfo {
  languageCodeName: string;
  languageID: string;
  url: string;
  urlExpire: string;
  format: string;
  source: string;
}

export interface BitrateInfo {
  playAddr: VideoPlayAddr;
  bitrate: number;
  qualityType: number;
  gearName: string;
  codecType: string;
}

export interface VideoPlayAddr {
  urlList: string[];
  urlKey: string;
  dataSize: number;
  fileHash: string;
  fileCs: string;
}

export default class VideoInfo extends TokNode {
  readonly id: string;
  readonly height: number;
  readonly width: number;
  readonly duration: number;
  readonly ratio: string;
  readonly cover: string;
  readonly originCover: string;
  readonly dynamicCover: string;
  readonly playAddr?: VideoPlayAddr;
  readonly downloadAddr?: VideoPlayAddr;
  readonly format: string;
  readonly codecType: string;
  readonly definition: string;
  readonly subtitleInfos: SubtitleInfo[];
  readonly bitrateInfo: BitrateInfo[];
  readonly volumeInfo?: { loudness: number; peak: number };
  readonly zoomCover?: Record<string, string>;

  constructor(data: Record<string, unknown>) {
    super('VideoInfo');
    this.id = (data['id'] as string) ?? '';
    this.height = (data['height'] as number) ?? 0;
    this.width = (data['width'] as number) ?? 0;
    this.duration = (data['duration'] as number) ?? 0;
    this.ratio = (data['ratio'] as string) ?? '';
    this.cover = (data['cover'] as string) ?? '';
    this.originCover = (data['originCover'] as string) ?? '';
    this.dynamicCover = (data['dynamicCover'] as string) ?? '';
    this.format = (data['format'] as string) ?? '';
    this.codecType = (data['codecType'] as string) ?? '';
    this.definition = (data['definition'] as string) ?? '';

    this.playAddr = data['playAddr'] as VideoPlayAddr | undefined;
    this.downloadAddr = data['downloadAddr'] as VideoPlayAddr | undefined;
    this.subtitleInfos = (data['subtitleInfos'] as SubtitleInfo[]) ?? [];
    this.bitrateInfo = (data['bitrateInfo'] as BitrateInfo[]) ?? [];
    this.volumeInfo = data['volumeInfo'] as { loudness: number; peak: number } | undefined;
    this.zoomCover = data['zoomCover'] as Record<string, string> | undefined;
  }

  /**
   * Get the best available play URL.
   */
  get playUrl(): string | undefined {
    return this.playAddr?.urlList?.[0];
  }

  /**
   * Get the best available download URL.
   */
  get downloadUrl(): string | undefined {
    return this.downloadAddr?.urlList?.[0];
  }
}
