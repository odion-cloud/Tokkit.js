import puppeteer from 'puppeteer-core';

async function testEpisodeInChrome() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  const capturedStreams = [];

  page.on('response', async (res) => {
    const u = res.url();
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('video') || u.includes('.mp4') || u.includes('/video/tos/')) {
      console.log('🎬 [NETWORK VIDEO CAPTURED]');
      console.log('Status:', res.status());
      console.log('Content-Type:', ct);
      console.log('URL:', u);
      capturedStreams.push({ url: u, contentType: ct, status: res.status() });
    }
  });

  const testUrl = 'https://www.tiktok.com/@vervedramaca/video/7696090556186971410';
  console.log('Navigating to episode in Chrome:', testUrl);
  try {
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 35000 });
  } catch (e) {
    console.log('Nav done (or timeout):', e.message);
  }

  await new Promise(r => setTimeout(r, 5000));

  // Inspect DOM <video> element
  const videoState = await page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return null;
    return {
      src: v.src,
      currentSrc: v.currentSrc,
      paused: v.paused,
      currentTime: v.currentTime,
      duration: v.duration,
      readyState: v.readyState,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      error: v.error ? { code: v.error.code, message: v.error.message } : null
    };
  });

  console.log('\n<video> element state in Chrome:');
  console.log(JSON.stringify(videoState, null, 2));

  console.log('\nTotal captured video network streams:', capturedStreams.length);
  if (capturedStreams.length) {
    console.log('Best stream URL:');
    console.log(capturedStreams[0].url);
  }

  await browser.close();
}

testEpisodeInChrome().catch(console.error);
