# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-10-24

### Added
- Initial release with Phase 1 features
- `TokKit.create()` — auto session with ttwid cookie acquisition
- `getUser(username)` — user profile via SSR extraction
- `getPost(videoId)` — video detail via SSR extraction
- `getFYP()` — For You Page feed
- `getExplore(category)` — 21 explore categories with pagination
- `getDrama()` — Short Drama feed (categoryType 108)
- `searchLive(keyword)` — live stream search with RTMP URLs
- `searchMusic(keyword)` — music/sound search with play URLs
- `getOEmbed(url)` — oEmbed embed data
- Full TypeScript support with strict mode
- Cursor-based pagination with async iterator support
- 8 node classes: Post, User, VideoInfo, Music, Hashtag, Comment, LiveRoom, MusicSearchResult
- 7 view classes: ForYouFeed, UserProfile, PostDetail, ExploreFeed, DramaFeed, LiveSearchFeed, MusicSearchFeed
- WAF retry logic for SSR pages
