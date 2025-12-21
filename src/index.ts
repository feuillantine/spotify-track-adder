import path from 'node:path';
import { createSpotifyUtility } from 'spotify-utility';
import getConfig from './config/env';
import { readTrackUrisFromFile } from './utils';

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
    const fileTrackUris = new Set(await readTrackUrisFromFile(tracksFilePath));
    console.log(`${fileTrackUris.size}件のトラックをファイルから検出`);

    if (fileTrackUris.size === 0) {
      console.log('追加するトラックがありません。終了します。');
      return;
    }

    console.log('お気に入り曲を取得中...');
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
