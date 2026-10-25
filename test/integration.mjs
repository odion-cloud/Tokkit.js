/**
 * TokKit Live Integration Test
 * Tests all Phase 1 functionality against live TikTok servers.
 */

import TokKit from '../dist/src/index.js';

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('TokKit Live Integration Tests');
  console.log('═'.repeat(60));

  // 1. Session initialization
  console.log('\n📦 1. Session');
  let tt;
  await test('TokKit.create() — acquires ttwid', async () => {
    tt = await TokKit.create();
    const ttwid = tt.session.ttwid;
    if (!ttwid) throw new Error('ttwid not acquired');
    console.log(`     ttwid: ${ttwid.substring(0, 40)}...`);
    console.log(`     logged_in: ${tt.logged_in}`);
  });

  // 2. User Profile (SSR)
  console.log('\n👤 2. User Profile');
  await test('getUser("charlidamelio") — verified user', async () => {
    const profile = await tt.getUser('charlidamelio');
    if (!profile.uniqueId) throw new Error('No uniqueId');
    console.log(`     @${profile.uniqueId} — ${profile.nickname}`);
    console.log(`     verified: ${profile.verified}`);
    console.log(`     followers: ${profile.followerCount?.toLocaleString()}`);
    console.log(`     videos: ${profile.videoCount}`);
    console.log(`     isDramaCreator: ${profile.isShortDramaCreator}`);
    console.log(`     avatar: ${profile.avatarUrl?.substring(0, 60)}...`);
    console.log(`     posts loaded: ${profile.posts.length}`);
    if (profile.posts.length > 0) {
      const p = profile.posts[0];
      console.log(`     first post: "${p.desc?.substring(0, 50)}..." plays=${p.stats.playCount}`);
    }
  });

  // 3. Video Detail (SSR)
  console.log('\n🎬 3. Video Detail');
  await test('getPost(videoId) — full video data', async () => {
    // First get a video ID from FYP
    const fyp = await tt.getFYP();
    if (fyp.items.length === 0) throw new Error('No FYP items');
    const videoId = fyp.items[0].id;
    const authorId = fyp.items[0].author.uniqueId;

    const detail = await tt.getPost(videoId, authorId);
    console.log(`     id: ${detail.id}`);
    console.log(`     desc: "${detail.desc?.substring(0, 60)}..."`);
    console.log(`     author: @${detail.author.uniqueId}`);
    console.log(`     duration: ${detail.video.duration}s`);
    console.log(`     playUrl: ${detail.playUrl ? 'YES ✓' : 'NO ✗'}`);
    console.log(`     plays: ${detail.stats.playCount.toLocaleString()}`);
    console.log(`     isDrama: ${detail.isDrama}`);
  });

  // 4. FYP Feed (SSR)
  console.log('\n🏠 4. For You Page');
  await test('getFYP() — trending videos', async () => {
    const fyp = await tt.getFYP();
    console.log(`     items: ${fyp.items.length}`);
    for (const v of fyp.items) {
      console.log(`     • "${v.desc?.substring(0, 40)}..." @${v.author.uniqueId} plays=${v.stats.playCount.toLocaleString()}`);
    }
  });

  // 5. Explore Feed (API)
  console.log('\n🔍 5. Explore Feed');
  await test('getExplore() — all categories paginated', async () => {
    const feed = await tt.getExplore();
    console.log(`     items: ${feed.items.length}, hasMore: ${feed.hasMore}, cursor: ${feed.cursor}`);
    console.log(`     category: ${feed.categoryName} (${feed.categoryType})`);
    if (feed.items.length > 0) {
      console.log(`     first: "${feed.items[0].desc?.substring(0, 50)}..."`);
    }
  });

  // 6. Short Drama Feed (Portal API /api/drama/theme/drama_list/)
  console.log('\n🎭 6. Short Drama Feed');
  await test('getDrama() — short drama series feed', async () => {
    const drama = await tt.getDrama();
    console.log(`     series: ${drama.items.length}, hasMore: ${drama.hasMore}, cursor: ${drama.cursor}`);
    for (const d of drama.items.slice(0, 3)) {
      console.log(`     • "${d.title}" (${d.episodeCount} eps) @${d.author.uniqueId} views=${d.watchCount.toLocaleString()}`);
    }

    // Test pagination
    if (drama.hasMore) {
      const page2 = await drama.getContinuation();
      console.log(`     page2: ${page2.items.length} series, hasMore: ${page2.hasMore}`);
    }
  });

  // 7. Search Live (API)
  console.log('\n📡 7. Search Live');
  await test('searchLive("music") — live streams', async () => {
    const lives = await tt.searchLive('music');
    console.log(`     results: ${lives.items.length}, hasMore: ${lives.hasMore}`);
    for (const room of lives.items.slice(0, 3)) {
      console.log(`     • "${room.title?.substring(0, 40)}..." by @${room.owner.uniqueId} viewers=${room.userCount} live=${room.isLive}`);
      if (room.streamUrl) {
        console.log(`       stream: ${room.streamUrl.rtmpPullUrl?.substring(0, 80)}...`);
      }
    }
  });

  // 8. Search Music (API)
  console.log('\n🎵 8. Search Music');
  await test('searchMusic("love") — music/sounds', async () => {
    const music = await tt.searchMusic('love');
    console.log(`     results: ${music.items.length}, hasMore: ${music.hasMore}`);
    for (const m of music.items.slice(0, 3)) {
      console.log(`     • "${m.title}" by ${m.author} — ${m.duration}s`);
      console.log(`       playUrl: ${m.playUrl?.substring(0, 80)}...`);
    }
  });

  // 9. oEmbed (Public API)
  console.log('\n📎 9. oEmbed');
  await test('getOEmbed() — embed data', async () => {
    const embed = await tt.getOEmbed('https://www.tiktok.com/@tiktok/video/7697839909842767111');
    console.log(`     type: ${embed.type}`);
    console.log(`     provider: ${embed.provider_name}`);
    console.log(`     html: ${embed.html?.substring(0, 60)}...`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('All tests complete!');
  console.log('═'.repeat(60));
}

main().catch(console.error);
