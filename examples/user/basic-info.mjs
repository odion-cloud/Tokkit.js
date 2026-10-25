/**
 * Example: Get a user's profile information.
 *
 * Usage: node examples/user/basic-info.mjs charlidamelio
 */

import TokKit from '../../dist/src/index.js';

const username = process.argv[2] || 'tiktok';

const tt = await TokKit.create();
const profile = await tt.getUser(username);

console.log('═'.repeat(50));
console.log(`Profile: @${profile.uniqueId}`);
console.log('═'.repeat(50));
console.log(`  Nickname:  ${profile.nickname}`);
console.log(`  Verified:  ${profile.verified}`);
console.log(`  Bio:       ${profile.signature}`);
console.log(`  Followers: ${profile.followerCount?.toLocaleString()}`);
console.log(`  Videos:    ${profile.videoCount}`);
console.log(`  Drama Creator: ${profile.isShortDramaCreator}`);
console.log(`  Avatar:    ${profile.avatarUrl}`);

if (profile.posts.length > 0) {
  console.log(`\n  Recent Videos (${profile.posts.length}):`);
  for (const post of profile.posts.slice(0, 5)) {
    console.log(`    • "${post.desc?.substring(0, 50)}..." — ${post.stats.playCount.toLocaleString()} plays`);
  }
}
