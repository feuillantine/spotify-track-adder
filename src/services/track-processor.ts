import fs from 'fs-extra';
import type { AppleMusicService } from './apple-music';
import type { SpotifyService } from './spotify';

export class TrackProcessor {
  constructor(
    private spotifyService: SpotifyService,
    private appleMusicService: AppleMusicService,
  ) {}

  async processFile(filePath: string): Promise<Set<string>> {
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const trackUris = new Set<string>();

    for (const line of lines) {
      const url = line.trim();
      if (!url) {
        continue;
      }

      const uri = await this.resolveToSpotifyUri(url);
      if (uri) {
        trackUris.add(uri);
      }
    }

    return trackUris;
  }

  private async resolveToSpotifyUri(url: string): Promise<string | null> {
    if (url.startsWith('spotify:track:')) {
      return url;
    }

    const spotifyUri = this.spotifyService.extractTrackUri(url);
    if (spotifyUri) {
      return spotifyUri;
    }

    if (this.appleMusicService.isAppleMusicTrackUrl(url)) {
      const info = await this.appleMusicService.fetchTrackInfo(url);
      if (info?.title && info.artist) {
        return await this.spotifyService.findTrackUri(info.title, info.artist);
      }
    }

    return null;
  }
}
