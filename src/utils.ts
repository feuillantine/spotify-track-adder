import fs from 'fs-extra';

/**
 * SpotifyのトラックURLからSpotify URIを抽出する
 */
export function convertTrackUri(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    if (pathSegments.length >= 2 && pathSegments[0] === 'track' && pathSegments[1].length === 22) {
      const trackId = pathSegments[1];
      return `spotify:track:${trackId}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * テキストファイルからトラックURLを読み込み、Spotify URIのリストを返却
 */
export async function readTrackUrisFromFile(filePath: string): Promise<string[]> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  return lines.map((line) => convertTrackUri(line.trim()))
    .filter((uri) => uri !== null)
    .filter((uri) => uri !== '');
}
