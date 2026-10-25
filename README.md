<div align="center">
  <br/>
  <h1>🎵 TokKit</h1>
  <p>A comprehensive, modular TypeScript client for TikTok's internal Web & Gateway APIs.<br/>Works seamlessly on <b>Node.js (18+)</b>, <b>CapacitorJS (iOS & Android)</b>, <b>Deno</b>, <b>Bun</b>, and modern web environments.</p>

[![NPM Version](https://img.shields.io/npm/v/@odion-cloud/tokkit.js?color=%2300f2fe)](https://www.npmjs.com/package/@odion-cloud/tokkit.js)
[![License](https://img.shields.io/npm/l/@odion-cloud/tokkit.js)](LICENSE)
[![Cross Platform](https://img.shields.io/badge/platform-Node.js%20%7C%20CapacitorJS%20%7C%20Browser%20%7C%20Bun%20%7C%20Deno-blue)](https://github.com/odion-cloud/Tokkit.js)

</div>

## Features

- 🔓 **No authentication required** — auto-acquires device identity, `ttwid` cookie, and app context
- 🎬 **Direct Video Stream Resolver** — extract direct HTML5-playable MP4 CDN streams (`video/mp4`) & watermark-free downloads without auth
- 🎭 **Complete Short Drama Portal (`/shortdrama`)**:
  - **Trending Tab** (`getDramaTrending`)
  - **Ranking Tab** (`getDramaRanking`)
  - **Latest Tab** (`getDramaLatest`)
  - **New Releases** (`getDramaNewReleases`)
  - **Filter by Genre & Theme** (`tagIDList` filtering across 18 genres & 28 themes)
  - **Series Details & Metadata** (`getDramaDetail`)
  - **Episode Playlists** (`getDramaEpisodes` with full pagination 1..N)
  - **Direct HTML5 Playback** — verified playable in `<video>` elements
- 🔍 **Explore** — 21 categories with cursor-based pagination
- 📡 **Search Live** — find live broadcasts with FLV & RTMP pull stream URLs
- 🎵 **Search Music** — search audio tracks with direct play URLs
- 🏠 **For You Page** — trending feed items
- 📎 **oEmbed** — official embed HTML snippets for any video
- 📱 **CapacitorJS & Mobile-Ready** — pure web standards (`fetch`, WebCrypto fallback, zero Node-only binary dependencies)
- 🧩 **Type-safe** — written in strict TypeScript with complete typings
- 📦 **Zero Runtime Dependencies** — lightweight ESM package

---

## Installation

```bash
npm install @odion-cloud/tokkit.js
```

---

## Quick Start

```ts
import TokKit from '@odion-cloud/tokkit.js';

// 1. Initialize client
const tt = await TokKit.create();

// 2. Browse TikTok Short Drama portal
const trendingDrama = await tt.getDramaTrending();
console.log(`Found ${trendingDrama.items.length} trending drama series`);

for (const drama of trendingDrama.items.slice(0, 3)) {
  console.log(`\n🎭 ${drama.title} (${drama.episodeCount} episodes)`);
  console.log(`   Author: @${drama.author.uniqueId}`);
  console.log(`   Views: ${drama.watchCount.toLocaleString()}`);

  // Fetch full episode playlist
  const playlist = await tt.getDramaEpisodes(drama.id, { count: 10 });
  console.log(`   Loaded ${playlist.items.length} episodes`);

  // Resolve direct playable stream for Episode 1 (HTML5 MP4)
  const stream = await drama.resolveFirstEpisodeStream();
  console.log(`   Playable MP4: ${stream.playUrl}`);
  console.log(`   Watermark-free: ${stream.downloadUrl}`);
}

// 3. Resolve any TikTok Video or Drama Episode directly
const video = await tt.resolveVideo('https://www.tiktok.com/@user/video/7449553535941954848');
console.log('Direct MP4 Stream:', video.playUrl);
console.log('Available Qualities:', video.qualities.map(q => q.gearName));
```

---

## Short Drama Portal (`/shortdrama`)

TokKit reverse-engineers TikTok's official Short Drama portal endpoints (`/api/drama/*`):

### 1. Browse All Drama Tabs

```ts
// Trending Short Dramas
const trending = await tt.getDramaTrending({ count: 20 });

// Top Ranked Short Dramas
const ranking = await tt.getDramaRanking({ count: 20 });

// Latest Uploaded Dramas
const latest = await tt.getDramaLatest({ count: 20 });

// New Releases (Filtered by date)
const newReleases = await tt.getDramaNewReleases({ count: 20 });
```

### 2. Category & Tag Filtering

TikTok organizes short dramas by 18 genres (Action, Romance, Werewolf, CEO, Revenge, etc.) and 28 themes:

```ts
// 1. Fetch available taxonomy categories
const categories = await tt.getDramaCategories();
console.log(categories.genres);      // Action, Romance, Fantasy, etc.
console.log(categories.storyThemes); // Second chance, Billionaire, etc.

// 2. Filter drama feed by category/genre
const actionDramas = await tt.getDrama({
  tagIDList: '0,7628991193808147457,0', // "0,{genreId},0"
  count: 20
});
```

### 3. Episode Playlists & Pagination

Fetch the entire series playlist and paginate through episodes:

```ts
const episodes = await tt.getDramaEpisodes('7696090095891715080', { count: 20 });

for (const ep of episodes.items) {
  console.log(`Episode #${ep.id}: duration=${ep.video.duration}s views=${ep.stats.playCount}`);
  
  // Resolve direct CDN stream for this episode
  const stream = await ep.resolveStream();
  console.log(`Stream URL: ${stream.playUrl}`);
}

// Fetch next 20 episodes
if (episodes.hasMore) {
  const nextEpisodes = await episodes.getContinuation();
}
```

### 4. HTML5 Video Player Verification

The resolved stream URLs are pure CDN `video/mp4` files supporting HTTP 206 Partial Content range requests, rendering directly in standard HTML5 `<video>` tags:

```html
<video id="player" controls autoplay playsinline src="RESOLVED_PLAY_URL"></video>
```

---

## 📱 CapacitorJS & Hybrid Mobile App Integration

TokKit is built with **pure JavaScript & Web Standards** (`fetch`, `Headers`, `Response`, pure JS RFC 1321 MD5, and `crypto.getRandomValues`). It has **zero native Node.js binary dependencies**, allowing modern bundlers (Vite, Rollup, Webpack, esbuild) to bundle it cleanly for iOS and Android webviews.

### Bypassing WebView CORS with `CapacitorHttp`

In CapacitorJS apps, webviews execute under `http://localhost` or `capacitor://localhost`. Direct browser `fetch()` requests to external domains like `tiktok.com` may be subject to browser CORS policies.

With Capacitor, you can pass Capacitor's native HTTP client directly to TokKit via the `fetch` option:

```ts
import TokKit from '@odion-cloud/tokkit.js';
import { CapacitorHttp } from '@capacitor/core';

// Bridge CapacitorHttp into standard Fetch signature
const capacitorFetch: typeof globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || 'GET';
  
  // Format headers
  const headers: Record<string, string> = {};
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
  }

  const response = await CapacitorHttp.request({
    url,
    method,
    headers,
    data: init?.body,
    responseType: 'text',
  });

  // Return a standard Fetch Response
  return new Response(response.data, {
    status: response.status,
    headers: new Headers(response.headers as Record<string, string>),
  });
};

// Initialize TokKit with Capacitor Native HTTP
const tt = await TokKit.create({
  fetch: capacitorFetch,
  region: 'US',
});

// Now all calls (drama, search, feeds) route seamlessly through native Android/iOS networking!
const dramas = await tt.getDramaTrending();
```

---

## API Reference

### Phase 1 — No Authentication Required

| Method | Returns | Description |
|:---|:---|:---|
| `getDramaTrending(options?)` | `DramaFeed` | Trending Short Drama series (themeType: 7) |
| `getDramaRanking(options?)` | `DramaFeed` | Ranking Short Drama series (themeType: 9) |
| `getDramaLatest(options?)` | `DramaFeed` | Latest Short Drama series (themeType: 10) |
| `getDramaNewReleases(options?)` | `DramaFeed` | New release Short Dramas (categoryDateType: 1) |
| `getDrama(options?)` | `DramaFeed` | Filterable Short Drama portal feed |
| `getDramaEpisodes(dramaId, options?)` | `DramaEpisodeFeed` | Paginated episode playlist (1..N) |
| `getDramaDetail(dramaId)` | `Record` | Series metadata & synopsis |
| `getDramaCategories()` | `DramaCategories` | All 18 genres, 28 themes & date tags |
| `resolveVideo(urlOrId)` | `ResolvedVideo` | Direct playable MP4, watermark-free download & qualities |
| `getUser(username)` | `UserProfile` | User profile via SSR |
| `getPost(videoId, author?)` | `PostDetail` | Full video detail |
| `getFYP()` | `ForYouFeed` | For You Page trending videos |
| `getExplore(category?)` | `ExploreFeed` | Browse by category (21 categories) |
| `searchLive(keyword)` | `LiveSearchFeed` | Live streams with RTMP URLs |
| `searchMusic(keyword)` | `MusicSearchFeed` | Music/sounds with play URLs |
| `getOEmbed(url)` | `OEmbedResult` | Embed HTML snippet |

### Phase 2 — Search & Interaction

| Method | Returns | Description |
|:---|:---|:---|
| `searchVideos(keyword)` | `{ items, hasMore, cursor }` | Search videos |
| `searchUsers(keyword)` | `{ items, hasMore }` | Search users |
| `getComments(postId, cursor?)` | `{ items, hasMore, cursor }` | Video comments |
| `getCommentReplies(postId, commentId)` | `{ items, hasMore, cursor }` | Reply threads |
| `getHashtagPosts(tag, cursor?)` | `{ items, hasMore, cursor }` | Hashtag video feed |
| `getHashtagDetail(name)` | `Record` | Hashtag/challenge info |
| `getSound(musicId, cursor?)` | `{ items, hasMore, cursor }` | Videos using a sound |
| `getMusicDetail(musicId)` | `Record` | Sound/music info |
| `getUserPosts(secUid, cursor?)` | `{ items, hasMore, cursor }` | User's video posts |
| `getLikedPosts(secUid, cursor?)` | `{ items, hasMore, cursor }` | User's liked videos |

---

## Feed Pagination

All feeds implement cursor-based pagination and standard async iteration:

```ts
const dramaFeed = await tt.getDramaTrending();

// 1. Manual continuation
if (dramaFeed.hasMore) {
  const page2 = await dramaFeed.getContinuation();
  console.log('Page 2 count:', page2.items.length);
}

// 2. Async iteration (auto-paginates across pages)
for await (const dramas of dramaFeed) {
  for (const drama of dramas) {
    console.log(drama.title);
  }
}
```

---

## Output Demonstration

A sample output covering live data returned across all Short Drama endpoints is saved at [`short_drama_output.json`](short_drama_output.json).

---

## License

Distributed under the [MIT](LICENSE) License.
