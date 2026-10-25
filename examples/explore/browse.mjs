/**
 * Example: Browse Explore feed by category.
 *
 * Usage: node examples/explore/browse.mjs
 */

import TokKit, { EXPLORE_CATEGORIES, CATEGORY_NAMES } from '../../dist/src/index.js';

const tt = await TokKit.create();

// Show all categories
console.log('═'.repeat(60));
console.log('📂 Available Explore Categories:');
console.log('═'.repeat(60));
for (const [name, type] of Object.entries(EXPLORE_CATEGORIES)) {
  console.log(`  ${type.toString().padStart(3)} — ${CATEGORY_NAMES[type] || name}`);
}

// Fetch Comedy category
console.log('\n' + '═'.repeat(60));
console.log('😂 Comedy Feed:');
console.log('═'.repeat(60));

const comedy = await tt.getExplore(EXPLORE_CATEGORIES.COMEDY);
console.log(`  ${comedy.items.length} items, hasMore: ${comedy.hasMore}`);

for (const video of comedy.items.slice(0, 5)) {
  console.log(`\n  📺 ${video.desc?.substring(0, 50)}`);
  console.log(`     @${video.author.uniqueId} | 👁 ${video.stats.playCount.toLocaleString()} plays`);
}

// Auto-paginate with async iterator
console.log('\n--- Auto-paginating all pages (max 3) ---');
let pageCount = 0;
for await (const items of comedy) {
  pageCount++;
  console.log(`  Page ${pageCount}: ${items.length} items`);
  if (pageCount >= 3) break;
}
