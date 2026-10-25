import puppeteer from 'puppeteer-core';

async function clickDrama() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  const capturedAPIs = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const parsed = new URL(url);
      capturedAPIs.push({
        path: parsed.pathname,
        url: url,
        status: response.status(),
        params: Object.fromEntries(parsed.searchParams)
      });
      console.log(`[API RESPONSE ${response.status()}] ${parsed.pathname}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('drama')) {
      console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text());
    }
  });

  console.log('Navigating to https://www.tiktok.com/shortdrama...');
  await page.goto('https://www.tiktok.com/shortdrama', { waitUntil: 'networkidle2', timeout: 30000 });

  await new Promise(r => setTimeout(r, 2000));

  // Find clickable drama element
  const dramaTitle = await page.evaluate(() => {
    const el = document.querySelector('h3, h4, [class*="title"], [class*="Title"], [class*="name"], [class*="Name"]');
    return el ? el.textContent : null;
  });
  console.log('Detected drama element title on page:', dramaTitle);

  // Click the first card
  const clicked = await page.evaluate(() => {
    const cards = document.querySelectorAll('a, div[role="button"], img');
    for (const card of cards) {
      if (card.src && card.src.includes('tiktokcdn') && card.closest('div')) {
        card.click();
        return true;
      }
    }
    return false;
  });

  console.log('Clicked drama image/card:', clicked);
  await new Promise(r => setTimeout(r, 5000));

  console.log('Page URL after interaction:', page.url());
  console.log('\n--- Captured API Endpoints ---');
  for (const a of capturedAPIs) {
    console.log(`${a.status} ${a.path}`);
    if (a.path.includes('drama')) {
      console.log('  URL:', a.url.substring(0, 120));
      console.log('  Params:', JSON.stringify(a.params));
    }
  }

  await browser.close();
}

clickDrama().catch(console.error);
