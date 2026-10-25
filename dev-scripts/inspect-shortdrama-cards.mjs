import puppeteer from 'puppeteer-core';

async function inspectCards() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  await page.goto('https://www.tiktok.com/shortdrama', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  const cardsInfo = await page.evaluate(() => {
    const root = document.querySelector('div[data-e2e="short-drama-page"]');
    if (!root) return 'No short-drama-page found';
    
    // Find all links or interactive elements inside
    const links = Array.from(root.querySelectorAll('a'));
    const buttons = Array.from(root.querySelectorAll('div[role="button"], button'));
    
    // Check elements that have click listeners or drama data
    const dramaElements = Array.from(root.querySelectorAll('[data-e2e*="drama"], [class*="Drama"], [class*="card"], [class*="Card"]'));

    return {
      totalLinks: links.length,
      links: links.slice(0, 10).map(a => ({
        href: a.href,
        text: a.textContent?.trim()?.substring(0, 50),
        ariaLabel: a.getAttribute('aria-label')
      })),
      totalButtons: buttons.length,
      buttons: buttons.slice(0, 10).map(b => ({
        text: b.textContent?.trim()?.substring(0, 50),
        className: b.className
      })),
      dramaElementsCount: dramaElements.length,
      sampleDramaElements: dramaElements.slice(0, 5).map(d => ({
        tag: d.tagName,
        className: d.className,
        text: d.textContent?.trim()?.substring(0, 60),
        html: d.outerHTML.substring(0, 200)
      }))
    };
  });

  console.log('Cards Info:');
  console.log(JSON.stringify(cardsInfo, null, 2));

  await browser.close();
}

inspectCards().catch(console.error);
