import puppeteer from 'puppeteer-core';

async function findVideoPlaySource() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  const mediaRequests = [];

  page.on('response', async (res) => {
    const u = res.url();
    const contentType = res.headers()['content-type'] || '';
    if (contentType.includes('video') || u.includes('.mp4') || u.includes('/video/tos/') || u.includes('mime_type=video_mp4')) {
      console.log('\n🎬 [CAPTURED VIDEO PLAYBACK STREAM]:');
      console.log('URL:', u);
      console.log('Status:', res.status());
      console.log('Content-Type:', contentType);
      mediaRequests.push({ url: u, contentType, status: res.status() });
    }
  });

  console.log('Navigating to https://www.tiktok.com/shortdrama...');
  await page.goto('https://www.tiktok.com/shortdrama', { waitUntil: 'networkidle2', timeout: 35000 });

  await new Promise(r => setTimeout(r, 4000));

  // Find all links or cards
  const links = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a, div[role="button"]'));
    return els.map(e => ({ text: e.textContent?.trim(), href: e.href || e.getAttribute('href') })).filter(e => e.href);
  });
  console.log('Links on page:', links.slice(0, 10));

  // Click on the first drama card
  console.log('Clicking on the first drama poster...');
  const clicked = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img[src*="tiktokcdn"]'));
    if (imgs.length > 0) {
      const parent = imgs[0].closest('div');
      if (parent) {
        parent.click();
        return true;
      }
    }
    return false;
  });
  console.log('Clicked poster:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  // Check <video> elements
  const videoDetails = await page.evaluate(() => {
    const vids = Array.from(document.querySelectorAll('video'));
    return vids.map(v => ({
      src: v.src,
      currentSrc: v.currentSrc,
      paused: v.paused,
      readyState: v.readyState,
      duration: v.duration,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      error: v.error ? { code: v.error.code, message: v.error.message } : null
    }));
  });
  console.log('\nVideo elements found on page:');
  console.log(JSON.stringify(videoDetails, null, 2));

  await browser.close();
}

findVideoPlaySource().catch(console.error);
