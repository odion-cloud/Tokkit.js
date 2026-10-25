import puppeteer from 'puppeteer-core';

async function testDramaModal() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  const capturedNetwork = [];

  page.on('response', async (res) => {
    const u = res.url();
    const ct = res.headers()['content-type'] || '';
    if (u.includes('/api/') || ct.includes('video') || u.includes('.mp4') || u.includes('/video/tos/')) {
      console.log(`[NETWORK ${res.status()}] [${ct}] ${u.substring(0, 110)}`);
      capturedNetwork.push({ url: u, status: res.status(), contentType: ct });
    }
  });

  console.log('Navigating to https://www.tiktok.com/shortdrama...');
  await page.goto('https://www.tiktok.com/shortdrama', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Clicking button[data-e2e="short-drama-library-card"]...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[data-e2e="short-drama-library-card"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked card button:', clicked);

  // Wait 8 seconds for modal and player to load
  console.log('Waiting 8s for modal & video player to load...');
  await new Promise(r => setTimeout(r, 8000));

  console.log('Current URL after card click:', page.url());

  // Check for modal or video elements
  const playerState = await page.evaluate(() => {
    const vids = Array.from(document.querySelectorAll('video'));
    const modal = document.querySelector('[role="dialog"], [class*="Modal"], [class*="Player"], [class*="drawer"]');
    return {
      hasModal: !!modal,
      modalClass: modal?.className,
      videoCount: vids.length,
      videos: vids.map(v => ({
        src: v.src,
        currentSrc: v.currentSrc,
        paused: v.paused,
        currentTime: v.currentTime,
        duration: v.duration,
        readyState: v.readyState,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        error: v.error ? { code: v.error.code, message: v.error.message } : null
      }))
    };
  });

  console.log('Player & Modal State:');
  console.log(JSON.stringify(playerState, null, 2));

  await browser.close();
}

testDramaModal().catch(console.error);
