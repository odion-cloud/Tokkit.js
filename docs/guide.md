# TokKit API Guide

## Getting Started

### Prerequisites
- Node.js 18 or later
- npm or yarn

### Installation
```bash
npm install @odion-cloud/tokkit.js
```

### Basic Usage
```ts
import TokKit from '@odion-cloud/tokkit.js';

const tt = await TokKit.create();
```

## Session & Authentication

TokKit works **without authentication** by default. It automatically acquires a `ttwid` cookie from TikTok.

### Anonymous Session
```ts
const tt = await TokKit.create();
console.log(tt.logged_in); // false
```

### Authenticated Session
To enable write operations (like, follow, comment), provide your `sessionid` cookie from the browser:

```ts
const tt = await TokKit.create({
  sessionId: 'your_session_id_from_browser_cookies'
});
console.log(tt.logged_in); // true
```

## Content Types

### Posts (Videos)
Every TikTok video is represented as a `Post` node with 50+ typed fields:

```ts
const detail = await tt.getPost('7697839909842767111', 'tiktok');

console.log(detail.id);                    // "7697839909842767111"
console.log(detail.desc);                  // Video description
console.log(detail.author.uniqueId);       // "@tiktok"
console.log(detail.video.duration);        // Duration in seconds
console.log(detail.video.playUrl);         // Direct video URL
console.log(detail.music.title);           // Sound name
console.log(detail.stats.playCount);       // Play count
console.log(detail.stats.diggCount);       // Like count
console.log(detail.isDrama);              // true if CategoryType=108
console.log(detail.createdAt);            // Date object
```

### Users
User profiles include stats, avatar URLs, and drama creator detection:

```ts
const profile = await tt.getUser('charlidamelio');

console.log(profile.uniqueId);            // "charlidamelio"
console.log(profile.nickname);            // "Charli D'Amelio"
console.log(profile.verified);            // true
console.log(profile.followerCount);       // 155000000+
console.log(profile.isShortDramaCreator); // true/false
console.log(profile.posts);              // Recent videos
```

### Short Drama Portal (`/shortdrama`)
TokKit provides complete access to TikTok's dedicated `/shortdrama` vertical:

```ts
// 1. Browse Tabs
const trending = await tt.getDramaTrending();
const ranking = await tt.getDramaRanking();
const latest = await tt.getDramaLatest();
const newReleases = await tt.getDramaNewReleases();

// 2. Filter by Category & Theme (18 Genres, 28 Themes)
const categories = await tt.getDramaCategories();
const actionDramas = await tt.getDrama({ tagIDList: '0,7628991193808147457,0' });

// 3. Series Episodes & Playlists (1..N)
const playlist = await tt.getDramaEpisodes('7696090095891715080', { count: 20 });

// 4. Resolve Direct HTML5-Playable MP4 Stream
const firstDrama = trending.items[0];
const stream = await firstDrama.resolveFirstEpisodeStream();
console.log('Playable MP4 URL:', stream.playUrl);
console.log('Watermark-free Download:', stream.downloadUrl);
```

### Direct Video Stream Resolver
Extract direct HTML5 playable MP4 CDN URLs without cookies or authentication:

```ts
const video = await tt.resolveVideo('https://www.tiktok.com/@user/video/7449553535941954848');
console.log('Direct MP4 Stream:', video.playUrl);
console.log('Download URL:', video.downloadUrl);
console.log('Qualities:', video.qualities.map(q => q.gearName));
```

### Live Rooms
Live search returns rooms with RTMP stream URLs:

```ts
const lives = await tt.searchLive('gaming');

for (const room of lives.rooms) {
  console.log(room.title);
  console.log(room.userCount);             // Current viewers
  console.log(room.isLive);               // true
  console.log(room.streamUrl.rtmpPullUrl); // RTMP URL
  console.log(room.streamUrl.flvPullUrl);  // FLV quality map
}
```

### Music/Sounds
Music search returns tracks with play URLs:

```ts
const music = await tt.searchMusic('trending');

for (const track of music.results) {
  console.log(track.title);
  console.log(track.author);
  console.log(track.duration);             // In seconds
  console.log(track.playUrl);             // Direct audio URL
  console.log(track.coverUrl);            // Album art
}
```

## Pagination

All feed methods support cursor-based pagination:

```ts
const feed = await tt.getExplore();

// Check if more pages exist
console.log(feed.hasMore);   // true
console.log(feed.cursor);    // 16

// Get next page
const page2 = await feed.getContinuation();

// Auto-paginate with async iterator
for await (const items of feed) {
  console.log(`Got ${items.length} items`);
  // Break when you have enough
}
```

## Explore Categories

TokKit supports all 21 TikTok Explore categories:

```ts
import { EXPLORE_CATEGORIES } from '@odion-cloud/tokkit.js';

const sports = await tt.getExplore(EXPLORE_CATEGORIES.SPORTS);
const comedy = await tt.getExplore(EXPLORE_CATEGORIES.COMEDY);
const drama  = await tt.getExplore(EXPLORE_CATEGORIES.DRAMA);  // = getDrama()
const tech   = await tt.getExplore(EXPLORE_CATEGORIES.TECHNOLOGY);
```

## Error Handling

```ts
import { TokKitError, WAFError, SessionError } from '@odion-cloud/tokkit.js';

try {
  const profile = await tt.getUser('nonexistent_user_12345');
} catch (e) {
  if (e instanceof WAFError) {
    console.log('TikTok WAF blocked the request');
  } else if (e instanceof TokKitError) {
    console.log('TokKit error:', e.message);
  }
}
```

## Logging

```ts
import { Log, LogLevel } from '@odion-cloud/tokkit.js';

// Enable debug logging
Log.setLevel(LogLevel.DEBUG);

// Quiet mode
Log.setLevel(LogLevel.NONE);
```

