/**
 * Example: Get oEmbed data for a TikTok video.
 *
 * Usage: node examples/oembed/get-embed.mjs https://www.tiktok.com/@tiktok/video/7697839909842767111
 */

import TokKit from '../../dist/src/index.js';

const url = process.argv[2] || 'https://www.tiktok.com/@tiktok/video/7697839909842767111';

const tt = await TokKit.create();
const embed = await tt.getOEmbed(url);

console.log('═'.repeat(60));
console.log(`📎 oEmbed for: ${url}`);
console.log('═'.repeat(60));
console.log(`  Type:     ${embed.type}`);
console.log(`  Provider: ${embed.provider_name}`);
console.log(`  Size:     ${embed.width}x${embed.height}`);
console.log(`  HTML:\n${embed.html}`);
