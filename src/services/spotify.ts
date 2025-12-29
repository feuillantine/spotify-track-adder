import { type SpotifyUtility, createSpotifyUtility } from 'spotify-utility';

export class SpotifyService {
  private client: SpotifyUtility;

  private constructor(client: SpotifyUtility) {
    this.client = client;
  }

  static async create(config: { clientId: string; clientSecret: string; refreshToken: string }) {
    const client = await createSpotifyUtility({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    });
    return new SpotifyService(client);
  }

  async listMyFavoriteUris(): Promise<Set<string>> {
    return await this.client.tracks.listMyFavoriteUris();
  }

  async listPlaylistTrackUris(playlistId: string): Promise<Set<string>> {
    return await this.client.playlists.listTrackUris(playlistId);
  }

  async addTracksToPlaylist(playlistId: string, trackUris: Set<string>) {
    await this.client.playlists.addTracks(playlistId, trackUris);
  }

  async findTrackUri(title: string, artist: string): Promise<string | null> {
    const result = await this.client.tracks.searchByTitleAndArtist(title, artist);
    return result ? result.uri : null;
  }

  extractTrackUri(url: string): string | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'open.spotify.com') {
        return null;
      }

      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      if (pathSegments.length < 2 || pathSegments[0] !== 'track') {
        return null;
      }

      const trackId = pathSegments[1].split('?')[0]; // クエリパラメータを除去
      if (trackId.length !== 22) {
        return null;
      }

      return `spotify:track:${trackId}`;
    } catch {
      return null;
    }
  }
}
