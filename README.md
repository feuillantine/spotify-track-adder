# Spotify Track Adder
`tracks.txt`に記載されたSpotifyの曲を、指定されたプレイリストに自動追加するツールです。

## 機能
- `tracks.txt`からSpotifyの曲URLを読み取り
- お気に入り登録済やプレイリストに未追加の曲のみを追加

## セットアップ方法
### 1. Spotify開発者アカウントの設定
1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)にログイン
2. 新しいアプリケーションを作成
3. Client IDとClient Secretを取得
4. Redirect URIを設定（例: `http://localhost:8888/callback`）
5. 必要なスコープを設定:
   - `user-library-read`: （将来用）
   - `playlist-modify-public`: 公開プレイリストの編集用
   - `playlist-modify-private`: 非公開プレイリストの編集用

### 2. プロジェクトのセットアップ
1. 依存パッケージをインストール：

   ```bash
   pnpm install --frozen-lockfile
   ```
2. `.env.example`を`.env`にコピーして、`CLIENT_ID`, `CLIENT_SECRET`, `PLAYLIST_ID`を入力

   ```bash
   cp .env.example .env
   ```

### 3. リフレッシュトークンの取得
以下のコマンドを実行して、リフレッシュトークンを取得します。

```bash
pnpm get-refresh-token
```

認証が成功したら、表示されたリフレッシュトークンを`.env`ファイルの`REFRESH_TOKEN`に設定してください。

## 使い方
1. プロジェクトルートに`tracks.txt`を作成し、追加したい曲のSpotify URLを改行区切りで記述

   ```text
   https://open.spotify.com/track/....
   https://open.spotify.com/track/....
   ```

2. 以下のコマンドを実行

   ```bash
   pnpm start
   ```
