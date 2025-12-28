import fs from 'fs-extra';
import { parseAppleMusicUrl } from './services/apple-music';

/**
 * URLの種別
 */
export enum UrlType {
  Spotify = 'spotify',
  AppleMusic = 'apple-music',
  Unknown = 'unknown',
}

/**
 * パースされたURL情報
 */
export interface ParsedUrl {
  type: UrlType;
  originalUrl: string;
  id: string;
}

/**
 * URLの種別を判定してパースする
 */
export function parseUrl(url: string): ParsedUrl | null {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;

  try {
    const urlObj = new URL(trimmedUrl);

    // Spotify URL
    if (urlObj.hostname === 'open.spotify.com') {
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      if (pathSegments.length >= 2 && pathSegments[0] === 'track' && pathSegments[1].length === 22) {
        return {
          type: UrlType.Spotify,
          originalUrl: trimmedUrl,
          id: pathSegments[1],
        };
      }
    }

    // Apple Music URL
    if (urlObj.hostname === 'music.apple.com') {
      const trackId = parseAppleMusicUrl(trimmedUrl);
      if (trackId) {
        return {
          type: UrlType.AppleMusic,
          originalUrl: trimmedUrl,
          id: trackId,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * SpotifyのトラックURLからSpotify URIを抽出する
 */
export function convertSpotifyUri(url: string): string | null {
  const parsed = parseUrl(url);
  if (parsed?.type === UrlType.Spotify) {
    return `spotify:track:${parsed.id}`;
  }
  return null;
}

/**
 * テキストファイルからトラックURLを読み込み、パース済みURLのリストを返却
 */
export async function readTrackUrlsFromFile(filePath: string): Promise<ParsedUrl[]> {
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  return lines
    .map((line) => parseUrl(line))
    .filter((url): url is ParsedUrl => url !== null);
}

/**
 * テキストファイルからトラックURLを読み込み、Spotify URIのリストを返却
 * （Spotify URLのみ対応、Apple Music URLは無視される）
 *
 * @deprecated 代わりに readTrackUrlsFromFile を使用してください
 */
export async function readTrackUrisFromFile(filePath: string): Promise<string[]> {
  const parsedUrls = await readTrackUrlsFromFile(filePath);
  return parsedUrls
    .filter((url) => url.type === UrlType.Spotify)
    .map((url) => `spotify:track:${url.id}`);
}
