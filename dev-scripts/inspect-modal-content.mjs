import puppeteer from 'puppeteer-core';

async function inspectModalContent() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

  console.log('Navigating to short drama...');
  await page.goto('https://www.tiktok.com/shortdrama', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Clicking drama card...');
  await page.click('button[data-e2e="short-drama-library-card"]');
  await new Promise(r => setTimeout(r, 5000));

  const modalData = await page.evaluate(() => {
    const modal = document.querySelector('div[class*="DivModalContainer"], [role="dialog"]');
    if (!modal) return 'No modal found';
    return {
      text: modal.innerText,
      buttons: Array.from(modal.querySelectorAll('button, a')).map(b => ({
        tag: b.tagName,
        text: b.textContent?.trim(),
        href: b.href,
        className: b.className
      }))
    };
  });

  console.log('Modal Data:');
  console.log(JSON.stringify(modalData, null, 2));

  await browser.close();
}

inspectModalContent().catch(console.error);
