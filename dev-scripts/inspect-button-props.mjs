import puppeteer from 'puppeteer-core';

async function inspectButtonProps() {
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

  const details = await page.evaluate(() => {
    const btn = document.querySelector('button[data-e2e="short-drama-library-card"]');
    if (!btn) return 'No card button';

    // Find React props on the button or parent
    const key = Object.keys(btn).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
    const props = key ? btn[key] : null;

    // Inspect attributes
    const attrs = {};
    for (const attr of btn.attributes) {
      attrs[attr.name] = attr.value;
    }

    return {
      attrs,
      reactPropKeys: props ? Object.keys(props) : null,
      memoizedProps: props?.memoizedProps ? Object.keys(props.memoizedProps) : null,
      dramaData: props?.memoizedProps?.drama || props?.memoizedProps?.item || props?.memoizedProps?.data
    };
  });

  console.log('Button details:');
  console.log(JSON.stringify(details, null, 2));

  await browser.close();
}

inspectButtonProps().catch(console.error);
