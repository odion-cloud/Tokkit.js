/**
 * Dev script: Get current user agent strings from browser data.
 * Useful for keeping the default user-agent up to date.
 *
 * Usage: node dev-scripts/get-agents.mjs
 */

const BROWSER_VERSIONS = {
  chrome: ['131', '132', '133', '134', '135'],
  firefox: ['130', '131', '132', '133'],
};

console.log('═'.repeat(60));
console.log('Current User Agent Strings');
console.log('═'.repeat(60));

for (const ver of BROWSER_VERSIONS.chrome) {
  console.log(`\nChrome ${ver}:`);
  console.log(`  Windows: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`);
  console.log(`  Mac:     Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`);
  console.log(`  Linux:   Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`);
}

console.log('\nUpdate src/utils/Utils.ts getRandomUserAgent() with the latest versions.');
