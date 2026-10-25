/**
 * Example: Search for music/sounds.
 *
 * Usage: node examples/search/search-music.mjs love
 */

import TokKit from '../../dist/src/index.js';

const keyword = process.argv[2] || 'love';

const tt = await TokKit.create();
const results = await tt.searchMusic(keyword);

console.log('═'.repeat(60));
console.log(`🎵 Music Search: "${keyword}"`);
console.log(`   ${results.items.length} results, hasMore: ${results.hasMore}`);
console.log('═'.repeat(60));

for (const track of results.results) {
  console.log();
  console.log(`  🎶 "${track.title}" by ${track.author}`);
  console.log(`     Album: ${track.album || '(single)'}`);
  console.log(`     Duration: ${track.duration}s`);
  console.log(`     Original: ${track.isOriginal}`);
  console.log(`     Play URL: ${track.playUrl?.substring(0, 80)}...`);
  if (track.coverUrl) {
    console.log(`     Cover: ${track.coverUrl.substring(0, 80)}...`);
  }
}
