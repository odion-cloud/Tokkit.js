/**
 * Dev script: Test all API endpoints and report status.
 *
 * Usage: node dev-scripts/test-endpoints.mjs
 */

import TokKit, { EXPLORE_CATEGORIES, CATEGORY_NAMES, API_PATHS, URLS } from '../dist/src/index.js';

async function testEndpoint(name, fn) {
  try {
    const result = await fn();
    console.log(`  ✅ ${name}: ${result}`);
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message?.substring(0, 80)}`);
  }
}

const tt = await TokKit.create();

console.log('═'.repeat(60));
console.log('TokKit Endpoint Test Report');
console.log('═'.repeat(60));

// SSR endpoints
console.log('\n📄 SSR Endpoints:');
await testEndpoint('FYP (/foryou)', async () => {
  const fyp = await tt.getFYP();
  return `${fyp.items.length} items`;
});
await testEndpoint('User Profile (/@tiktok)', async () => {
  const p = await tt.getUser('tiktok');
  return `@${p.uniqueId}, ${p.followerCount} followers`;
});

// Tier 1 API endpoints
console.log('\n🌐 Tier 1 API (No signing):');
await testEndpoint('Explore ALL', async () => {
  const f = await tt.getExplore(EXPLORE_CATEGORIES.ALL);
  return `${f.items.length} items, hasMore=${f.hasMore}`;
});
await testEndpoint('Explore DRAMA (108)', async () => {
  const f = await tt.getDrama();
  return `${f.items.length} items, hasMore=${f.hasMore}`;
});
await testEndpoint('Search Live', async () => {
  const r = await tt.searchLive('music');
  return `${r.items.length} rooms`;
});
await testEndpoint('Search Music', async () => {
  const r = await tt.searchMusic('love');
  return `${r.items.length} tracks`;
});
await testEndpoint('oEmbed', async () => {
  const e = await tt.getOEmbed('https://www.tiktok.com/@tiktok/video/7697839909842767111');
  return `type=${e.type}, provider=${e.provider_name}`;
});

// All explore categories
console.log('\n📂 All Explore Categories:');
for (const [name, type] of Object.entries(EXPLORE_CATEGORIES)) {
  await testEndpoint(`${CATEGORY_NAMES[type] || name} (${type})`, async () => {
    const f = await tt.getExplore(type);
    return `${f.items.length} items`;
  });
}

// Tier 2 API endpoints (expected to fail without signing)
console.log('\n🔐 Tier 2 API (Needs X-Bogus — expected failures):');
const tier2 = [
  ['Search General', API_PATHS.SEARCH_GENERAL],
  ['Search Video', API_PATHS.SEARCH_VIDEO],
  ['Search User', API_PATHS.SEARCH_USER],
  ['Comment List', API_PATHS.COMMENT_LIST],
  ['Item Detail', API_PATHS.ITEM_DETAIL],
];
for (const [name, path] of tier2) {
  await testEndpoint(name, async () => {
    await tt.actions.fetchAPI(path, { keyword: 'test', count: 1 });
    return 'OK';
  });
}

console.log('\n' + '═'.repeat(60));
console.log('Done!');
