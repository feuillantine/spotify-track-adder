/**
 * Apple Music関連の処理を行うモジュール
 */

/**
 * Apple Musicのトラックメタデータ
 */
interface AppleMusicTrackMetadata {
  trackId: string;
  trackName: string;
  artistName: string;
  collectionName?: string;
  isrc?: string;
}

/**
 * iTunes Search APIのレスポンス型
 */
interface ITunesSearchResponse {
  resultCount: number;
  results: Array<{
    trackId: number;
    trackName: string;
    artistName: string;
    collectionName?: string;
    trackViewUrl: string;
    isrc?: string;
  }>;
}

/**
 * Apple MusicのトラックURLからトラックIDを抽出する
 *
 * 対応URL形式:
 * - https://music.apple.com/{country}/album/{album}/{trackId}
 * - https://music.apple.com/{country}/album/{album}
 *
 * @param url - Apple MusicのトラックURL
 * @returns トラックID、またはパースに失敗した場合はnull
 */
export function parseAppleMusicUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // ドメインチェック
    if (urlObj.hostname !== 'music.apple.com') {
      return null;
    }

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    // パス構造: [{country}/album/{album}/]???
    // Apple MusicのトラックURLの末尾には、通常英数字のID（またはスラグ+IDの形式）が含まれる
    // 例: https://music.apple.com/jp/album/track-name/123456789?i=987654321
    // URLクエリパラメータの i= がトラックIDの場合が多い

    // クエリパラメータからトラックIDを取得
    const trackIdFromQuery = urlObj.searchParams.get('i');
    if (trackIdFromQuery) {
      return trackIdFromQuery;
    }

    // パスの最後のセグメントがトラックIDの場合
    // アルバムIDとトラックIDを区別するために、クエリパラメータを優先
    if (pathSegments.length >= 4) {
      // {country}/album/{album}/{id}
      const lastSegment = pathSegments[pathSegments.length - 1];
      // 数字のみで構成されている場合はIDとみなす
      if (/^\d+$/.test(lastSegment)) {
        return lastSegment;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * iTunes Search APIを使用してトラックメタデータを取得する
 *
 * @param trackId - Apple MusicのトラックID
 * @returns トラックメタデータ、または取得に失敗した場合はnull
 */
export async function fetchTrackMetadata(trackId: string): Promise<AppleMusicTrackMetadata | null> {
  try {
    const url = new URL('https://itunes.apple.com/lookup');
    url.searchParams.set('id', trackId);
    url.searchParams.set('country', 'JP'); // デフォルトは日本
    url.searchParams.set('entity', 'song');

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.warn(`iTunes API request failed: ${response.status}`);
      return null;
    }

    const data: ITunesSearchResponse = await response.json();

    if (data.resultCount === 0 || !data.results[0]) {
      console.warn(`No metadata found for track ID: ${trackId}`);
      return null;
    }

    const track = data.results[0];
    return {
      trackId: String(track.trackId),
      trackName: track.trackName,
      artistName: track.artistName,
      collectionName: track.collectionName,
      isrc: track.isrc,
    };
  } catch (error) {
    console.warn(`Failed to fetch Apple Music metadata for ${trackId}:`, error);
    return null;
  }
}

/**
 * Spotify URI形式に変換するためのヘルパー関数
 *
 * @param spotifyTrackId - SpotifyのトラックID
 * @returns Spotify URI形式
 */
export function toSpotifyUri(spotifyTrackId: string): string {
  return `spotify:track:${spotifyTrackId}`;
}

/**
 * Spotify APIでトラックを検索する
 *
 * @param metadata - Apple Musicのトラックメタデータ
 * @param client - Spotifyクライアント（searchByIsrcとsearchを持つ）
 * @returns Spotify URI、または見つからない場合はnull
 */
export async function findSpotifyUri(
  metadata: AppleMusicTrackMetadata,
  client: {
    tracks: {
      searchByIsrc: (isrc: string) => Promise<string | null>;
      search: (query: string, options?: { limit: number }) => Promise<{ id: string }[]>;
    };
  }
): Promise<string | null> {
  try {
    // 優先度1: ISRCマッチング（最も正確）
    if (metadata.isrc) {
      console.log(`  ISRCで検索中: ${metadata.isrc}`);
      const spotifyUri = await client.tracks.searchByIsrc(metadata.isrc);
      if (spotifyUri) {
        console.log(`  ✓ ISRCマッチ: ${metadata.trackName} - ${metadata.artistName}`);
        return spotifyUri;
      }
      console.log(`  ✗ ISRCマッチなし`);
    }

    // 優先度2: キーワード検索（フォールバック）
    const query = `track:${metadata.trackName} artist:${metadata.artistName}`;
    console.log(`  キーワードで検索中: ${query}`);

    const results = await client.tracks.search(query, { limit: 1 });

    if (results.length > 0) {
      console.log(`  ✓ キーワードマッチ: ${metadata.trackName} - ${metadata.artistName}`);
      return toSpotifyUri(results[0].id);
    }

    console.log(`  ✗ マッチするトラックが見つかりませんでした`);
    return null;
  } catch (error) {
    console.warn(`  Spotify検索エラー (${metadata.trackName}):`, error);
    return null;
  }
}
