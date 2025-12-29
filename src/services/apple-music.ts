export interface AppleMusicTrackInfo {
  title?: string;
  artist?: string;
}

export class AppleMusicService {
  isAppleMusicTrackUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'music.apple.com') {
        return false;
      }
      if (!urlObj.pathname.includes('/album/')) {
        return false;
      }
      if (!urlObj.searchParams.has('i')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async fetchTrackInfo(url: string): Promise<AppleMusicTrackInfo | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const html = await response.text();

      const titleMatch = html.match(/<meta name="apple:title" content="([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : undefined;

      const artistMatch = html.match(/<a[^>]+href="[^"]+\/artist\/[^"]+"[^>]*>([^<]+)<\/a>/);
      const artist = artistMatch ? artistMatch[1] : undefined;

      if (!title || !artist) {
        return null;
      }

      return { title, artist };
    } catch {
      return null;
    }
  }
}
