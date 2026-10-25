/**
 * Test all Short Drama tabs, filters, episodes, and stream resolution.
 */

import TokKit, { DRAMA_THEMES, DRAMA_DATE_TYPES } from '../../dist/src/index.js';

async function main() {
  const tt = await TokKit.create();

  console.log('═'.repeat(70));
  console.log('🎭 TIKTOK SHORT DRAMA FULL SUITE TEST');
  console.log('═'.repeat(70));

  // 1. Categories & Genres
  console.log('\n[1/7] 🏷 Fetching Drama Categories & Filter Taxonomy...');
  const categories = await tt.getDramaCategories();
  console.log(`  • Genres found: ${categories.genres.length}`);
  console.log(`    Sample genres: ${categories.genres.slice(0, 5).map(g => g.name).join(', ')}`);
  console.log(`  • Themes found: ${categories.themes.length}`);
  console.log(`    Sample themes: ${categories.themes.slice(0, 5).map(t => t.name).join(', ')}`);
  console.log(`  • Release filters: ${categories.releaseDates.map(d => d.name).join(', ')}`);

  // 2. Trending Tab
  console.log('\n[2/7] 🔥 Fetching Trending Tab (themeType: 7)...');
  const trending = await tt.getDramaTrending({ count: 5 });
  console.log(`  • Returned ${trending.items.length} series | Cursor: ${trending.cursor} | hasMore: ${trending.hasMore}`);
  for (const d of trending.items.slice(0, 3)) {
    console.log(`    🎬 ${d.title} (${d.episodeCount} eps) — 👁 ${d.watchCount.toLocaleString()} views`);
  }

  // 3. Ranking Tab
  console.log('\n[3/7] 🏆 Fetching Ranking Tab (themeType: 9)...');
  const ranking = await tt.getDramaRanking({ count: 5 });
  console.log(`  • Returned ${ranking.items.length} series | Cursor: ${ranking.cursor} | hasMore: ${ranking.hasMore}`);
  for (const d of ranking.items.slice(0, 3)) {
    console.log(`    🎬 ${d.title} (${d.episodeCount} eps) — 👁 ${d.watchCount.toLocaleString()} views`);
  }

  // 4. Latest / All Tab
  console.log('\n[4/7] 🆕 Fetching Latest Tab (themeType: 10)...');
  const latest = await tt.getDramaLatest({ count: 5 });
  console.log(`  • Returned ${latest.items.length} series | Cursor: ${latest.cursor} | hasMore: ${latest.hasMore}`);
  for (const d of latest.items.slice(0, 3)) {
    console.log(`    🎬 ${d.title} (${d.episodeCount} eps) — 👁 ${d.watchCount.toLocaleString()} views`);
  }

  // 5. New Releases (Last 7 Days)
  console.log('\n[5/7] 📅 Fetching New Releases (in 7 days)...');
  const newReleases = await tt.getDramaNewReleases({ count: 5 });
  console.log(`  • Returned ${newReleases.items.length} series | Cursor: ${newReleases.cursor} | hasMore: ${newReleases.hasMore}`);
  for (const d of newReleases.items.slice(0, 3)) {
    console.log(`    🎬 ${d.title} (${d.episodeCount} eps) — 👁 ${d.watchCount.toLocaleString()} views`);
  }

  // 6. Drama Detail
  const targetDrama = trending.items[0];
  console.log(`\n[6/7] 📖 Fetching Drama Detail for "${targetDrama.title}" (${targetDrama.id})...`);
  const detail = await tt.getDramaDetail(targetDrama.id);
  console.log(`  • Name: ${detail.title}`);
  console.log(`  • Creator: ${detail.author.nickname} (@${detail.author.uniqueId})`);
  console.log(`  • Episodes: ${detail.episodeCount} | Total Duration: ${Math.round(detail.durationSeconds / 60)} mins`);
  console.log(`  • Synopsis: ${detail.description.substring(0, 100)}...`);

  // 7. Full Episode Playlist & Stream Playback
  console.log(`\n[7/7] 📺 Fetching Episode List for "${targetDrama.title}"...`);
  const episodeFeed = await tt.getDramaEpisodes(targetDrama.id, { count: 10 });
  console.log(`  • Total Series Episodes: ${episodeFeed.totalEpisodeCount}`);
  console.log(`  • Loaded Episodes on Page 1: ${episodeFeed.items.length} | hasMore: ${episodeFeed.hasMore} | cursor: ${episodeFeed.cursor}`);

  for (let i = 0; i < Math.min(3, episodeFeed.items.length); i++) {
    const ep = episodeFeed.items[i];
    console.log(`    [Ep ${i + 1}] ID: ${ep.id} | Duration: ${ep.video.duration}s | Views: ${ep.stats.playCount.toLocaleString()}`);
  }

  // Resolve Episode 1 playable stream
  console.log(`\n  Resolving direct HTML5 MP4 playback for Episode 1 (${episodeFeed.items[0].id})...`);
  const stream = await episodeFeed.resolveEpisodeStream(1);
  console.log(`  ✅ Playable MP4 URL: ${stream.playUrl.substring(0, 75)}...`);
  if (stream.downloadUrl) {
    console.log(`  📥 Download URL: ${stream.downloadUrl.substring(0, 75)}...`);
  }

  // Episode pagination demo
  if (episodeFeed.hasMore) {
    console.log('\n  Paginating episode list via episodeFeed.getContinuation()...');
    const page2 = await episodeFeed.getContinuation();
    console.log(`  • Page 2 episodes loaded: ${page2.items.length} | new cursor: ${page2.cursor}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 ALL SHORT DRAMA TESTS PASSED SUCCESSFULLY!');
  console.log('═'.repeat(70));
}

main().catch(console.error);
