import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function crawlShortDrama() {
  console.log('Launching Chrome with full network inspection...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1600,1000'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  const capturedNetwork = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const parsed = new URL(url);
      let body = null;
      try {
        const text = await response.text();
        body = JSON.parse(text);
      } catch (e) {
        // Not JSON
      }

      const entry = {
        timestamp: Date.now(),
        status: response.status(),
        path: parsed.pathname,
        url: url,
        searchParams: Object.fromEntries(parsed.searchParams),
        responseSummary: body ? {
          statusCode: body.statusCode ?? body.status_code,
          hasMore: body.hasMore ?? body.has_more,
          cursor: body.cursor,
          keys: Object.keys(body),
          dataCount: body.dramaList?.length ?? body.itemList?.length ?? body.categoryList?.length ?? (Array.isArray(body.data) ? body.data.length : undefined)
        } : null,
        fullBody: body
      };

      capturedNetwork.push(entry);
      console.log(`[CDP API ${response.status()}] ${parsed.pathname} (Params: ${Object.keys(entry.searchParams).join(', ')})`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[BROWSER ERR]', msg.text().substring(0, 100));
    }
  });

  console.log('1. Navigating to https://www.tiktok.com/shortdrama...');
  await page.goto('https://www.tiktok.com/shortdrama', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  // Inspect page buttons/tabs
  const tabElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, a, div[role="tab"], div[role="button"], span, p'));
    return elements
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim(),
        role: el.getAttribute('role'),
        href: el.getAttribute('href'),
        className: el.className
      }))
      .filter(el => el.text && el.text.length < 35 && el.text.length > 1);
  });

  console.log(`Found ${tabElements.length} text elements. Filtering for navigation tabs/buttons...`);
  const keywords = ['all', 'ranking', 'trend', 'latest', 'new', 'release', 'hot', 'for you', 'drama'];
  const relevantTabs = tabElements.filter(t => keywords.some(k => t.text.toLowerCase().includes(k)));
  console.log('Relevant UI Elements:', JSON.stringify(relevantTabs.slice(0, 20), null, 2));

  // Try clicking tabs by text
  const tabsToClick = ['Ranking', 'Trending', 'Latest', 'New Releases', 'All', 'In 7 Days', 'Mystery', 'Action'];
  for (const tabText of tabsToClick) {
    console.log(`\nAttempting to find and click tab: "${tabText}"...`);
    const clicked = await page.evaluate((text) => {
      const candidates = Array.from(document.querySelectorAll('button, div[role="tab"], div[role="button"], a, span'));
      const target = candidates.find(c => c.textContent && c.textContent.trim().toLowerCase() === text.toLowerCase());
      if (target) {
        target.scrollIntoView();
        target.click();
        return true;
      }
      return false;
    }, tabText);

    if (clicked) {
      console.log(` -> Clicked "${tabText}" successfully! Waiting 4s for network calls...`);
      await new Promise(r => setTimeout(r, 4000));
    } else {
      console.log(` -> Tab "${tabText}" not directly found by exact text.`);
    }
  }

  // Scroll down to trigger pagination
  console.log('\nScrolling down to trigger pagination...');
  await page.evaluate(() => window.scrollBy(0, 1500));
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => window.scrollBy(0, 2000));
  await new Promise(r => setTimeout(r, 4000));

  // Click on the first drama card to open drama detail / watch modal
  console.log('\nClicking on first drama card to capture detail / episode list API...');
  const dramaClicked = await page.evaluate(() => {
    // Look for cards with drama titles or images
    const images = Array.from(document.querySelectorAll('img[src*="tiktokcdn"]'));
    for (const img of images) {
      const card = img.closest('div, a');
      if (card && card.clientHeight > 100) {
        card.click();
        return true;
      }
    }
    return false;
  });
  console.log('Drama card clicked:', dramaClicked);
  await new Promise(r => setTimeout(r, 5000));

  // Save all network records
  console.log(`\nTotal API calls captured: ${capturedNetwork.length}`);
  const summary = capturedNetwork.map(c => ({
    status: c.status,
    path: c.path,
    searchParams: c.searchParams,
    responseSummary: c.responseSummary
  }));

  fs.writeFileSync('dev-scripts/shortdrama-cdp-summary.json', JSON.stringify(summary, null, 2), 'utf-8');
  fs.writeFileSync('dev-scripts/shortdrama-cdp-full.json', JSON.stringify(capturedNetwork, null, 2), 'utf-8');
  console.log('Saved summary to dev-scripts/shortdrama-cdp-summary.json');
  console.log('Saved full network log to dev-scripts/shortdrama-cdp-full.json');

  await browser.close();
}

crawlShortDrama().catch(console.error);
