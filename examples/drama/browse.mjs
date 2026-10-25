/**
 * Example: Browse TikTok Short Drama series.
 *
 * Usage: node examples/drama/browse.mjs
 */

import TokKit from '../../dist/src/index.js';

const tt = await TokKit.create();
console.log('Fetching live Short Drama series from TikTok shortdrama portal...');
const feed = await tt.getDrama({ storeRegion: 'US' });

console.log('═'.repeat(70));
console.log(`🎭 TikTok Short Drama Portal (https://www.tiktok.com/shortdrama)`);
console.log(`   Fetched ${feed.items.length} series | Cursor: ${feed.cursor} | hasMore: ${feed.hasMore}`);
console.log('═'.repeat(70));

for (let i = 0; i < feed.items.length; i++) {
  const drama = feed.items[i];
  const themesStr = drama.themes.map(t => t.tagVal).join(', ') || 'General';
  console.log();
  console.log(`[${i + 1}] 🎬 ${drama.title} (${drama.episodeCount} Episodes)`);
  console.log(`    🆔 ID: ${drama.id} | 👁 ${drama.watchCount.toLocaleString()} total views | ⏱ ${Math.round(drama.durationSeconds / 60)} mins`);
  console.log(`    👤 Creator: ${drama.author.nickname} (@${drama.author.uniqueId})`);
  console.log(`    🏷 Themes: ${themesStr}`);
  console.log(`    📖 Synopsis: ${drama.description.substring(0, 110)}...`);
  console.log(`    🎬 Ep 1 Item ID: ${drama.firstEpisodeItemID}`);
  if (drama.isLimitedFree) console.log(`    ✨ Limited Free`);
  if (drama.isHot) console.log(`    🔥 Hot Label`);
}

// Test Episode 1 stream resolution for the first drama
if (feed.items.length > 0) {
  const first = feed.items[0];
  console.log('\n' + '─'.repeat(70));
  console.log(`Resolving direct HTML5 MP4 stream for Ep 1 of: "${first.title}"`);
  try {
    const stream = await first.resolveFirstEpisodeStream();
    console.log(`  ✅ Direct Playable Stream: ${stream.playUrl.substring(0, 80)}...`);
    if (stream.downloadUrl) {
      console.log(`  📥 Download URL: ${stream.downloadUrl.substring(0, 80)}...`);
    }
  } catch (err) {
    console.log(`  ⚠️ Stream resolution note:`, err.message);
  }
}

// Pagination demo
if (feed.hasMore) {
  console.log('\n' + '─'.repeat(70));
  console.log('Fetching next page of Short Drama series via feed.getContinuation()...');
  const page2 = await feed.getContinuation();
  console.log(`Page 2: ${page2.items.length} series fetched | Cursor: ${page2.cursor} | hasMore: ${page2.hasMore}`);
  for (const d of page2.items.slice(0, 3)) {
    console.log(`  🎬 ${d.title} (${d.episodeCount} eps) — ${d.watchCount.toLocaleString()} views`);
  }
}
