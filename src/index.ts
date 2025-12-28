import path from 'node:path';
import { createSpotifyUtility } from 'spotify-utility';
import getConfig from './config/env';
import { readTrackUrlsFromFile, UrlType, ParsedUrl } from './utils';
import { fetchTrackMetadata, findSpotifyUri, toSpotifyUri } from './services/apple-music';

/**
 * パースされたURLをSpotify URIに変換する
 * Apple Music URLの場合は、メタデータを取得してSpotifyで検索する
 */
async function convertToSpotifyUris(urls: ParsedUrl[], client: Awaited<ReturnType<typeof createSpotifyUtility>>): Promise<string[]> {
  const spotifyUris: string[] = [];

  for (const url of urls) {
    if (url.type === UrlType.Spotify) {
      // Spotify URLはそのままURIに変換
      spotifyUris.push(toSpotifyUri(url.id));
    } else if (url.type === UrlType.AppleMusic) {
      // Apple Music URLはメタデータを取得してSpotifyで検索
      console.log(`\nApple Music: ${url.originalUrl}`);
      console.log(`  メタデータを取得中...`);
      const metadata = await fetchTrackMetadata(url.id);
      if (!metadata) {
        console.log(`  ✗ メタデータの取得に失敗しました。スキップします。`);
        continue;
      }
      console.log(`  曲名: ${metadata.trackName}`);
      console.log(`  アーティスト: ${metadata.artistName}`);
      console.log(`  ISRC: ${metadata.isrc || 'なし'}`);

      const spotifyUri = await findSpotifyUri(metadata, client);
      if (spotifyUri) {
        spotifyUris.push(spotifyUri);
      } else {
        console.log(`  ✗ Spotifyで見つかりませんでした。スキップします。`);
      }
    }
  }

  return spotifyUris;
}

async function main() {
  try {
    // 設定の読み込みとバリデーション
    const config = getConfig();

    // クライアントの初期化
    const client = await createSpotifyUtility({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    });

    console.log('トラックファイルを読み込み中...');
    const tracksFilePath = path.resolve(process.cwd(), 'tracks.txt');
    const parsedUrls = await readTrackUrlsFromFile(tracksFilePath);

    const spotifyCount = parsedUrls.filter((u) => u.type === UrlType.Spotify).length;
    const appleMusicCount = parsedUrls.filter((u) => u.type === UrlType.AppleMusic).length;

    console.log(`${spotifyCount}件のSpotify URL、${appleMusicCount}件のApple Music URLを検出`);

    if (parsedUrls.length === 0) {
      console.log('追加するトラックがありません。終了します。');
      return;
    }

    // Apple Music URLをSpotify URIに変換
    if (appleMusicCount > 0) {
      console.log('\nApple Music URLをSpotifyトラックに変換中...');
    }
    const fileTrackUris = new Set(await convertToSpotifyUris(parsedUrls, client));
    console.log(`\n${fileTrackUris.size}件のトラックを処理対象として検出`);

    if (fileTrackUris.size === 0) {
      console.log('追加するトラックがありません。終了します。');
      return;
    }

    console.log('\nお気に入り曲を取得中...');
    const savedTrackUris = await client.tracks.listMyFavoriteUris();
    console.log(`${savedTrackUris.size}件のお気に入り曲を取得`);

    console.log('プレイリストの既存曲を取得中...');
    const playlistTrackUris = await client.playlists.listTrackUris(config.playlistId);
    console.log(`${playlistTrackUris.size}件のプレイリスト曲を取得`);

    console.log('差分を確認中...');

    // 新規追加
    const newTrackUris = fileTrackUris.difference(savedTrackUris).difference(playlistTrackUris);
    console.log(`${newTrackUris.size}件の新規追加曲を検出`);

    if (newTrackUris.size > 0) {
      console.log('プレイリストに新規追加曲を追加中...');
      await client.playlists.addTracks(config.playlistId, newTrackUris);
      console.log('追加完了');
    } else {
      console.log('新規追加曲なし');
    }

    console.log('処理完了');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
