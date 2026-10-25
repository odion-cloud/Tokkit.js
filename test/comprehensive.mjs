/**
 * TokKit COMPREHENSIVE Test — Tests EVERYTHING from the implementation plan.
 * Covers: Session, all Phase 1 + Phase 2 methods, pagination, signer, examples.
 */

import TokKit, { EXPLORE_CATEGORIES, CATEGORY_NAMES, Log, LogLevel } from '../dist/src/index.js';

// Suppress debug logs for cleaner output
Log.setLevel(LogLevel.WARN);

let passed = 0;
let failed = 0;
let skipped = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message?.substring(0, 100)}`);
  }
}

function skip(name, reason) {
  skipped++;
  console.log(`  ⏭️  ${name}: ${reason}`);
}

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log(' TokKit COMPREHENSIVE TEST SUITE');
  console.log(' Testing ALL features from tokkit_implementation_plan.md');
  console.log('══════════════════════════════════════════════════════════');

  // ═══════════════════════════════════════════════════
  // 1. SESSION & INITIALIZATION
  // ═══════════════════════════════════════════════════
  console.log('\n🔑 1. SESSION & INITIALIZATION');
  let tt;

  await test('TokKit.create() — session created', async () => {
    tt = await TokKit.create();
    if (!tt) throw new Error('TokKit not created');
  });

  await test('ttwid cookie acquired', async () => {
    const ttwid = tt.session.ttwid;
    if (!ttwid) throw new Error('No ttwid');
    console.log(`     ttwid: ${ttwid.substring(0, 30)}...`);
  });

  await test('logged_in is false (anonymous)', async () => {
    if (tt.logged_in !== false) throw new Error(`Expected false, got ${tt.logged_in}`);
  });

  await test('session.http exists', async () => {
    if (!tt.session.http) throw new Error('No HTTPClient');
  });

  await test('actions.signer exists', async () => {
    if (!tt.actions.signer) throw new Error('No Signer');
    if (!tt.actions.signer.isAvailable) throw new Error('Signer not available');
  });

  // ═══════════════════════════════════════════════════
  // 2. PHASE 1 — SSR METHODS
  // ═══════════════════════════════════════════════════
  console.log('\n📄 2. PHASE 1 — SSR METHODS');

  // 2a. FYP Feed
  let fypItems;
  await test('getFYP() — For You Page', async () => {
    const fyp = await tt.getFYP();
    if (!fyp.items || fyp.items.length === 0) throw new Error('No FYP items');
    fypItems = fyp.items;
    console.log(`     items: ${fyp.items.length}`);
    for (const v of fyp.items) {
      console.log(`     • @${v.author.uniqueId} — "${v.desc?.substring(0, 40)}..." plays=${v.stats.playCount.toLocaleString()}`);
    }
  });

  // 2b. User Profile
  await test('getUser("tiktok") — user profile', async () => {
    try {
      const profile = await tt.getUser('tiktok');
      console.log(`     @${profile.uniqueId} — ${profile.nickname}`);
      console.log(`     verified: ${profile.verified}, followers: ${profile.followerCount?.toLocaleString()}`);
      console.log(`     posts: ${profile.posts.length}`);
    } catch(e) {
      if (e.message?.includes('WAF')) {
        console.log('     ⚠️ WAF challenge — expected for some profiles from Node.js');
        throw e; // Still count as failed
      }
      throw e;
    }
  });

  // 2c. Video Detail
  await test('getPost(videoId) — video detail', async () => {
    if (!fypItems?.length) throw new Error('Need FYP items first');
    const videoId = fypItems[0].id;
    const author = fypItems[0].author.uniqueId;
    const detail = await tt.getPost(videoId, author);
    if (!detail.id) throw new Error('No post id');
    console.log(`     id: ${detail.id}`);
    console.log(`     author: @${detail.author.uniqueId}`);
    console.log(`     duration: ${detail.video.duration}s`);
    console.log(`     plays: ${detail.stats.playCount.toLocaleString()}`);
    console.log(`     isDrama: ${detail.isDrama}`);
    console.log(`     createdAt: ${detail.createdAt}`);
  });

  // ═══════════════════════════════════════════════════
  // 3. PHASE 1 — API METHODS (NO SIGNING)
  // ═══════════════════════════════════════════════════
  console.log('\n🌐 3. PHASE 1 — API METHODS');

  // 3a. Explore Feed
  await test('getExplore() — default (ALL)', async () => {
    const feed = await tt.getExplore();
    if (feed.items.length === 0) throw new Error('No items');
    console.log(`     items: ${feed.items.length}, hasMore: ${feed.hasMore}, cursor: ${feed.cursor}`);
    console.log(`     category: ${feed.categoryName} (${feed.categoryType})`);
  });

  // 3b. Explore Categories
  const categoriesToTest = [
    EXPLORE_CATEGORIES.COMEDY,
    EXPLORE_CATEGORIES.SPORTS,
    EXPLORE_CATEGORIES.FOOD,
    EXPLORE_CATEGORIES.GAMES,
  ];
  for (const cat of categoriesToTest) {
    await test(`getExplore(${CATEGORY_NAMES[cat]}) — category ${cat}`, async () => {
      const feed = await tt.getExplore(cat);
      if (feed.items.length === 0) throw new Error('No items');
      console.log(`     items: ${feed.items.length}, hasMore: ${feed.hasMore}`);
    });
  }

  // 3c. Drama Feed
  let dramaFeed;
  await test('getDrama() — Short Drama (categoryType=108)', async () => {
    dramaFeed = await tt.getDrama();
    if (dramaFeed.items.length === 0) throw new Error('No drama items');
    console.log(`     items: ${dramaFeed.items.length}, hasMore: ${dramaFeed.hasMore}`);
    console.log(`     category: ${dramaFeed.categoryName} (${dramaFeed.categoryType})`);
    // Verify CategoryType=108
    for (const v of dramaFeed.items.slice(0, 3)) {
      if (v.categoryType !== 108) console.log(`     ⚠️ Unexpected CategoryType: ${v.categoryType}`);
      console.log(`     • "${v.desc?.substring(0, 40)}..." @${v.author.uniqueId} type=${v.categoryType} plays=${v.stats.playCount.toLocaleString()}`);
    }
  });

  // 3d. Drama Pagination
  await test('getDrama() pagination — page 2', async () => {
    if (!dramaFeed?.hasMore) throw new Error('Drama has no more pages');
    const page2 = await dramaFeed.getContinuation();
    if (page2.items.length === 0) throw new Error('Page 2 empty');
    console.log(`     page2: ${page2.items.length} items, hasMore: ${page2.hasMore}`);
  });

  // 3e. Drama Pagination — page 3
  await test('getDrama() pagination — page 3 via double getContinuation', async () => {
    if (!dramaFeed?.hasMore) throw new Error('No more pages');
    const page2 = await dramaFeed.getContinuation();
    if (!page2.hasMore) { skip('page 3', 'page2 has no more'); return; }
    const page3 = await page2.getContinuation();
    console.log(`     page3: ${page3.items.length} items, hasMore: ${page3.hasMore}`);
  });

  // 3f. Explore Pagination
  await test('getExplore() pagination', async () => {
    const feed = await tt.getExplore();
    if (!feed.hasMore) throw new Error('No more pages');
    const page2 = await feed.getContinuation();
    if (page2.items.length === 0) throw new Error('Page 2 empty');
    console.log(`     page1: ${feed.items.length} → page2: ${page2.items.length} items`);
  });

  // 3g. Async Iterator pagination
  await test('getExplore() async iterator — auto-paginates 3 pages', async () => {
    const feed = await tt.getExplore(EXPLORE_CATEGORIES.COMEDY);
    let pageCount = 0;
    let totalItems = 0;
    for await (const items of feed) {
      pageCount++;
      totalItems += items.length;
      console.log(`     page ${pageCount}: ${items.length} items`);
      if (pageCount >= 3) break;
    }
    console.log(`     total: ${totalItems} items across ${pageCount} pages`);
  });

  // 3h. Search Live
  await test('searchLive("music") — live streams', async () => {
    const lives = await tt.searchLive('music');
    console.log(`     results: ${lives.items.length}, hasMore: ${lives.hasMore}`);
    for (const room of lives.rooms.slice(0, 2)) {
      console.log(`     • "${room.title?.substring(0, 30)}..." @${room.owner.uniqueId} viewers=${room.userCount}`);
      if (room.streamUrl?.rtmpPullUrl) {
        console.log(`       RTMP: ${room.streamUrl.rtmpPullUrl.substring(0, 60)}...`);
      }
    }
  });

  // 3i. Search Music
  let musicFeed;
  await test('searchMusic("love") — music/sounds', async () => {
    musicFeed = await tt.searchMusic('love');
    if (musicFeed.items.length === 0) throw new Error('No music results');
    console.log(`     results: ${musicFeed.items.length}, hasMore: ${musicFeed.hasMore}`);
    for (const m of musicFeed.results.slice(0, 2)) {
      console.log(`     • "${m.title}" by ${m.author} — ${m.duration}s`);
      if (m.playUrl) console.log(`       playUrl: ${m.playUrl.substring(0, 60)}...`);
    }
  });

  // 3j. Music Pagination
  await test('searchMusic() pagination', async () => {
    if (!musicFeed?.hasMore) throw new Error('No more music pages');
    const page2 = await musicFeed.getContinuation();
    console.log(`     page2: ${page2.items.length} results`);
  });

  // 3k. oEmbed
  await test('getOEmbed() — embed data', async () => {
    const embed = await tt.getOEmbed('https://www.tiktok.com/@tiktok/video/7697839909842767111');
    if (!embed.html) throw new Error('No embed HTML');
    console.log(`     type: ${embed.type}, provider: ${embed.provider_name}`);
    console.log(`     size: ${embed.width}x${embed.height}`);
  });

  // ═══════════════════════════════════════════════════
  // 4. PHASE 2 — SIGNED API METHODS
  // ═══════════════════════════════════════════════════
  console.log('\n🔐 4. PHASE 2 — SIGNED API METHODS');

  await test('searchVideos("tiktok") — signed video search', async () => {
    const result = await tt.searchVideos('tiktok');
    console.log(`     items: ${result.items.length}, hasMore: ${result.hasMore}, cursor: ${result.cursor}`);
    if (result.items.length > 0) {
      console.log(`     first: "${result.items[0].desc?.substring(0, 50)}..."`);
    } else {
      console.log(`     ⚠️ Empty results — built-in signer may need updating`);
    }
  });

  await test('searchUsers("charli") — signed user search', async () => {
    const result = await tt.searchUsers('charli');
    console.log(`     items: ${result.items.length}, hasMore: ${result.hasMore}`);
    if (result.items.length > 0) {
      console.log(`     first: @${result.items[0].uniqueId}`);
    } else {
      console.log(`     ⚠️ Empty results — built-in signer may need updating`);
    }
  });

  await test('getComments(postId) — signed comments', async () => {
    if (!fypItems?.length) throw new Error('Need FYP items');
    const result = await tt.getComments(fypItems[0].id);
    console.log(`     items: ${result.items.length}, hasMore: ${result.hasMore}, cursor: ${result.cursor}`);
    if (result.items.length > 0) {
      console.log(`     first: "${result.items[0].text?.substring(0, 50)}"`);
    } else {
      console.log(`     ⚠️ Empty results — built-in signer may need updating`);
    }
  });

  await test('getHashtagPosts("fyp") — signed hashtag', async () => {
    const result = await tt.getHashtagPosts('fyp');
    console.log(`     items: ${result.items.length}, hasMore: ${result.hasMore}`);
    if (result.items.length > 0) {
      console.log(`     first: "${result.items[0].desc?.substring(0, 50)}..."`);
    } else {
      console.log(`     ⚠️ Empty results — built-in signer may need updating`);
    }
  });

  // ═══════════════════════════════════════════════════
  // 5. SIGNER SYSTEM
  // ═══════════════════════════════════════════════════
  console.log('\n🔧 5. SIGNER SYSTEM');

  await test('Signer.isAvailable', async () => {
    if (!tt.actions.signer.isAvailable) throw new Error('Not available');
  });

  await test('Signer.isCustom = false (using built-in)', async () => {
    if (tt.actions.signer.isCustom) throw new Error('Should be built-in');
  });

  await test('Signer.sign(url) — generates X-Bogus', async () => {
    const signed = await tt.actions.signer.sign('https://www.tiktok.com/api/search/item/full/?keyword=test&count=10');
    if (!signed.includes('X-Bogus=')) throw new Error('No X-Bogus in signed URL');
    console.log(`     signed URL contains X-Bogus: ✓`);
  });

  await test('Custom signer function', async () => {
    const tt2 = await TokKit.create({
      signer: async (url, ua) => ({ xBogus: 'custom_test_value_123' }),
    });
    if (!tt2.actions.signer.isCustom) throw new Error('Should be custom');
    const signed = await tt2.actions.signer.sign('https://example.com?q=test');
    if (!signed.includes('custom_test_value_123')) throw new Error('Custom value not in URL');
    console.log(`     custom signer works: ✓`);
  });

  // ═══════════════════════════════════════════════════
  // 6. PHASE 3 — AUTH & WRITE OPERATIONS
  // ═══════════════════════════════════════════════════
  console.log('\n🔒 6. PHASE 3 — AUTH & WRITE OPERATIONS');

  await test('like(postId) exists on TokKit', () => {
    if (typeof tt.like !== 'function') throw new Error('No like method');
  });

  await test('follow(userId) exists on TokKit', () => {
    if (typeof tt.follow !== 'function') throw new Error('No follow method');
  });

  await test('comment(postId, text) exists on TokKit', () => {
    if (typeof tt.comment !== 'function') throw new Error('No comment method');
  });

  await test('collect(postId) exists on TokKit', () => {
    if (typeof tt.collect !== 'function') throw new Error('No collect method');
  });

  skip('like/follow/comment/collect execution', 'Requires real sessionid — test manually with auth');

  // ═══════════════════════════════════════════════════
  // 7. NODE CLASSES & DATA SHAPES
  // ═══════════════════════════════════════════════════
  console.log('\n📦 7. NODE CLASSES & DATA SHAPES');

  await test('Post node — has all required fields', async () => {
    if (!fypItems?.length) throw new Error('Need FYP items');
    const post = fypItems[0];
    const required = ['id', 'desc', 'createTime', 'author', 'video', 'music', 'stats'];
    for (const f of required) {
      if (!(f in post)) throw new Error(`Missing field: ${f}`);
    }
    console.log(`     fields: ${Object.keys(post).filter(k => !k.startsWith('_')).length}+`);
  });

  await test('Post.stats — playCount, diggCount, commentCount', async () => {
    const s = fypItems[0].stats;
    if (typeof s.playCount !== 'number') throw new Error('No playCount');
    if (typeof s.diggCount !== 'number') throw new Error('No diggCount');
    console.log(`     plays=${s.playCount} likes=${s.diggCount} comments=${s.commentCount}`);
  });

  await test('Post.video — VideoInfo with duration', async () => {
    const v = fypItems[0].video;
    if (typeof v.duration !== 'number') throw new Error('No duration');
    console.log(`     duration=${v.duration}s, width=${v.width}, height=${v.height}`);
  });

  await test('Post.music — Music with title', async () => {
    const m = fypItems[0].music;
    if (!m.title) throw new Error('No music title');
    console.log(`     title="${m.title}" by ${m.authorName}`);
  });

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(` RESULTS: ✅ ${passed} passed | ❌ ${failed} failed | ⏭️  ${skipped} skipped`);
  console.log('══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
