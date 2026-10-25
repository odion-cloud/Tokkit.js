import puppeteer from 'puppeteer-core';
import TokKit from '../dist/src/index.js';

async function verifyHtml5Playability() {
  const tt = await TokKit.create();
  console.log('Fetching trending dramas...');
  const trending = await tt.getDramaTrending({ count: 10 });

  console.log(`Checking ${trending.items.length} dramas for HTML5 playability...\n`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  for (let i = 0; i < Math.min(5, trending.items.length); i++) {
    const drama = trending.items[i];
    console.log(`[#${i + 1}] Testing: "${drama.title}"`);
    console.log(`     Ep 1 ID: ${drama.firstEpisodeItemID}`);

    try {
      const stream = await drama.resolveFirstEpisodeStream();
      const testUrl = stream.playUrl || stream.downloadUrl;
      console.log(`     Play URL: ${testUrl ? testUrl.substring(0, 80) + '...' : 'NONE'}`);

      if (!testUrl) {
        console.log(`     ❌ No stream URL`);
        continue;
      }

      // Check with HTTP Range Request
      const headRes = await fetch(testUrl, {
        headers: {
          'range': 'bytes=0-100',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'referer': 'https://www.tiktok.com/'
        }
      });

      const contentType = headRes.headers.get('content-type') || '';
      console.log(`     HTTP Status: ${headRes.status} | Content-Type: ${contentType}`);

      // Now load in REAL HTML5 <video> player in Chrome
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Player</title></head>
        <body>
          <video id="v" controls autoplay muted src="${testUrl}"></video>
        </body>
        </html>
      `;

      await page.setContent(html);
      // Wait for playback / data load
      await new Promise(r => setTimeout(r, 4000));

      const playResult = await page.evaluate(() => {
        const v = document.getElementById('v');
        if (!v) return { loaded: false, error: 'No video element' };
        return {
          loaded: true,
          readyState: v.readyState, // 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
          paused: v.paused,
          currentTime: v.currentTime,
          duration: v.duration,
          videoWidth: v.videoWidth,
          videoHeight: v.videoHeight,
          error: v.error ? { code: v.error.code, message: v.error.message } : null
        };
      });

      console.log(`     HTML5 Video Player State in Chrome:`);
      console.log(`     • readyState: ${playResult.readyState} (4 = HAVE_ENOUGH_DATA)`);
      console.log(`     • duration: ${playResult.duration}s`);
      console.log(`     • dimensions: ${playResult.videoWidth}x${playResult.videoHeight}`);
      console.log(`     • currentTime: ${playResult.currentTime}s`);
      console.log(`     • error: ${playResult.error ? JSON.stringify(playResult.error) : 'null (NO ERROR)'}`);

      if (playResult.readyState >= 2 && playResult.error === null) {
        console.log(`     ✅ PLAYABLE in HTML5 Video Player!`);
      } else {
        console.log(`     ⚠️ Playback status: readyState=${playResult.readyState}`);
      }

    } catch (err) {
      console.log(`     ❌ Error:`, err.message);
    }
    console.log();
  }

  await browser.close();
}

verifyHtml5Playability().catch(console.error);
