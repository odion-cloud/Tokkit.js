/**
 * Example: Search for live streams and display stream URLs.
 *
 * Usage: node examples/search/search-live.mjs music
 */

import TokKit from '../../dist/src/index.js';

const keyword = process.argv[2] || 'music';

const tt = await TokKit.create();
const results = await tt.searchLive(keyword);

console.log('═'.repeat(60));
console.log(`📡 Live Search: "${keyword}"`);
console.log(`   ${results.items.length} live rooms found`);
console.log('═'.repeat(60));

for (const room of results.rooms) {
  console.log();
  console.log(`  🔴 ${room.title || '(no title)'}`);
  console.log(`     Host: @${room.owner.uniqueId} (${room.owner.nickname})`);
  console.log(`     Viewers: ${room.userCount.toLocaleString()}`);
  console.log(`     Status: ${room.isLive ? 'LIVE' : 'OFFLINE'}`);
  console.log(`     Started: ${room.startedAt.toLocaleString()}`);
  if (room.streamUrl) {
    console.log(`     RTMP: ${room.streamUrl.rtmpPullUrl}`);
    if (room.streamUrl.flvPullUrl) {
      const qualities = Object.keys(room.streamUrl.flvPullUrl);
      console.log(`     FLV Qualities: ${qualities.join(', ')}`);
    }
  }
}
