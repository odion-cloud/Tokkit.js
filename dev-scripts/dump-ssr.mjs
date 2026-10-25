/**
 * Dev script: Dump SSR rehydration data from any TikTok page.
 *
 * Usage: node dev-scripts/dump-ssr.mjs /@username
 *        node dev-scripts/dump-ssr.mjs /foryou
 *        node dev-scripts/dump-ssr.mjs /explore
 */

import TokKit from '../dist/src/index.js';

const path = process.argv[2] || '/foryou';

console.log(`Fetching SSR data from: ${path}\n`);

const tt = await TokKit.create();

try {
  const scope = await tt.actions.fetchSSR(path);

  console.log('Scope keys:', Object.keys(scope));
  console.log();

  for (const [key, value] of Object.entries(scope)) {
    const json = JSON.stringify(value, null, 2);
    const lines = json.split('\n').length;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📦 ${key} (${lines} lines)`);
    console.log('═'.repeat(60));

    if (lines > 50) {
      // Print first 50 lines for large objects
      console.log(json.split('\n').slice(0, 50).join('\n'));
      console.log(`  ... (${lines - 50} more lines)`);
    } else {
      console.log(json);
    }
  }
} catch (e) {
  console.error('Error:', e.message);
}
