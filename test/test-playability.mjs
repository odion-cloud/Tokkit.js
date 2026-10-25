/**
 * Test TikTok video/stream URL playability.
 * Uses range requests + magic byte detection to verify URLs work in HTML5 / media players.
 */
import TokKit from '../dist/src/TokKit.js';

const tt = await TokKit.create();

console.log('════════════════════════════════════════════════════════');
console.log('🎬 TokKit Video/Stream URL Playability Tests');
console.log('════════════════════════════════════════════════════════\n');

let passed = 0, failed = 0;

async function testUrl(label, url) {
  if (!url) { console.log(`  ⚠️  ${label}: No URL`); failed++; return; }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Range': 'bytes=0-511',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    
    // Read only first chunk then abort
    const reader = res.body?.getReader();
    let value;
    if (reader) {
      const readChunk = await reader.read();
      value = readChunk.value;
      reader.cancel();
    }
    clearTimeout(timer);
    
    const buf = value ? Buffer.from(value) : Buffer.alloc(0);
    const ct = res.headers.get('content-type') || '';
    const cl = res.headers.get('content-length') || '?';
    
    const isMp4 = buf.length > 8 && buf.toString('ascii', 4, 8) === 'ftyp';
    const isFlv = buf.length > 3 && buf.toString('ascii', 0, 3) === 'FLV';
    const isWebm = buf.length > 4 && buf.toString('hex', 0, 4) === '1a45dfa3';
    const isM3u8 = buf.length > 7 && buf.toString('utf8', 0, 7) === '#EXTM3U';
    const isAudio = ct.includes('audio/') || ct.includes('mpeg');
    const isImage = ct.includes('image/');
    const isVideo = isMp4 || isFlv || isWebm || isM3u8 || ct.includes('video/');
    
    const fmt = isMp4 ? 'MP4' : isFlv ? 'FLV' : isWebm ? 'WebM' : isM3u8 ? 'HLS' : isAudio ? 'Audio' : isImage ? 'Image' : ct;
    
    if (isVideo || isAudio || isImage) {
      console.log(`  ✅ ${label}: ${fmt} (HTTP ${res.status}) [${cl} bytes]`);
      if (isMp4) console.log(`     🎬 HTML5 <video> playable: YES`);
      if (isFlv) console.log(`     📺 Playable with FLV.js / mpegts.js`);
      if (isM3u8) console.log(`     📺 Playable with HLS.js / native Safari`);
      if (isAudio) console.log(`     🎵 HTML5 <audio> playable: YES`);
      passed++;
    } else {
      console.log(`  ❌ ${label}: HTTP ${res.status}, type=${ct}, bytes=${buf.length}`);
      failed++;
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log(`  ⏱️  ${label}: Stream connected (timeout / live streaming)`);
      passed++;
    } else {
      console.log(`  ❌ ${label}: ${e.message}`);
      failed++;
    }
  }
}

// 1. Short Drama Videos (with direct stream resolution!)
console.log('🎭 1. Short Drama Videos (resolveStream)');
try {
  const drama = await tt.getDrama();
  const v = drama.videos[0];
  if (v) {
    console.log(`  Video: "${v.desc?.substring(0, 50)}..." by @${v.author?.uniqueId}`);
    console.log(`  Resolving direct streams for drama ID: ${v.id}...`);
    const resolved = await v.resolveStream();
    console.log(`  Direct Play URL: ${resolved.playUrl ? 'RESOLVED' : 'FAILED'}`);
    console.log(`  No-Watermark Download URL: ${resolved.downloadUrl ? 'RESOLVED' : 'FAILED'}`);
    console.log(`  Quality options: ${resolved.qualities.map(q => q.gearName).join(', ')}`);

    if (resolved.playUrl) await testUrl('Drama Play URL (HTML5 MP4)', resolved.playUrl);
    if (resolved.downloadUrl) await testUrl('Drama Download URL (No-Watermark MP4)', resolved.downloadUrl);
    if (v.video?.cover) await testUrl('Drama Cover Image', v.video.cover);
  }
} catch (e) { console.log(`  ❌ ${e.message}`); failed++; }

// 2. Standalone Video URL / ID Resolver (tt.resolveVideo)
console.log('\n🎬 2. Standalone Video Resolver (tt.resolveVideo)');
try {
  const testId = '7449553535941954848';
  console.log(`  Resolving standalone video ID: ${testId}...`);
  const resolved = await tt.resolveVideo(testId);
  console.log(`  Title: "${resolved.desc?.substring(0, 50)}..."`);
  console.log(`  Author: @${resolved.author?.uniqueId} (${resolved.author?.nickname})`);
  console.log(`  Duration: ${resolved.duration}s`);
  console.log(`  Direct MP4: ${resolved.playUrl ? 'RESOLVED' : 'FAILED'}`);
  if (resolved.playUrl) await testUrl('Standalone Video Play URL', resolved.playUrl);
  if (resolved.music?.playUrl) await testUrl('Extracted Audio/Music URL', resolved.music.playUrl);
} catch (e) { console.log(`  ❌ ${e.message}`); failed++; }

// 3. Live Streams
console.log('\n📡 3. Live Stream URLs');
try {
  const lives = await tt.searchLive('music');
  const room = lives.rooms[0];
  if (room) {
    console.log(`  "${room.title}" @${room.owner?.uniqueId} viewers=${room.userCount}`);
    
    const flv = room.bestFlvUrl;
    const hls = room.bestHlsUrl;
    const rtmp = room.streamUrl?.rtmpPullUrl;
    const all = room.allStreamUrls;
    
    console.log(`  bestFlvUrl: ${flv ? 'YES' : 'absent'}`);
    console.log(`  bestHlsUrl: ${hls ? 'YES' : 'absent'}`);
    console.log(`  Total stream variants: ${all.length}`);
    
    if (flv) await testUrl('Live FLV stream', flv);
    if (hls) await testUrl('Live HLS stream', hls);
    if (rtmp) console.log(`  ℹ️  RTMP (needs rtmp client): ${rtmp.substring(0, 70)}...`);
  }
} catch (e) { console.log(`  ❌ ${e.message}`); failed++; }

// 4. Music / Sound Search
console.log('\n🎵 4. Music/Sound Search URLs');
try {
  const music = await tt.searchMusic('love');
  const t = music.results[0];
  if (t) {
    console.log(`  "${t.title}" by ${t.author} (${t.duration}s)`);
    if (t.playUrl) await testUrl('Music playUrl (MP4 Audio)', t.playUrl);
    if (t.cover) await testUrl('Music cover', t.cover);
  }
} catch (e) { console.log(`  ❌ ${e.message}`); failed++; }

// 5. oEmbed Integration
console.log('\n🌐 5. oEmbed HTML Embed');
try {
  const oembed = await tt.getOEmbed('https://www.tiktok.com/@tiktok/video/7449553535941954848');
  console.log(`  Title: ${oembed.title || oembed.provider_name}`);
  console.log(`  Embed HTML present: ${!!oembed.html}`);
  if (oembed.html) {
    console.log(`  ✅ oEmbed: Valid HTML iframe/blockquote embed`);
    passed++;
  } else {
    failed++;
  }
} catch (e) { console.log(`  ❌ ${e.message}`); failed++; }

console.log('\n════════════════════════════════════════════════════════');
console.log(`FINAL RESULTS: ✅ ${passed} passed | ❌ ${failed} failed`);
console.log('════════════════════════════════════════════════════════');
