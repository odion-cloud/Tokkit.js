async function probeUrl() {
  const url = 'https://www.tiktok.com/@vervedramaca/video/7696090556186971410';
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  console.log('Status:', res.status, 'Final URL:', res.url);
  const text = await res.text();
  console.log('HTML length:', text.length);

  // Search for SIGI_STATE or __UNIVERSAL_DATA_FOR_REHYDRATION__
  const hasRehydration = text.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__');
  const hasSigi = text.includes('SIGI_STATE');
  console.log('Has rehydration script:', hasRehydration, 'Has SIGI_STATE:', hasSigi);

  // Look for any playAddr or video stream URL
  const playAddrMatch = text.match(/"playAddr":\s*"([^"]+)"/);
  if (playAddrMatch) {
    const rawPlayAddr = playAddrMatch[1].replace(/\\u0026/g, '&');
    console.log('Found playAddr in HTML!');
    console.log('URL:', rawPlayAddr);
  } else {
    console.log('playAddr regex did not match directly');
  }

  // Look for any v16m or tiktokcdn video URL
  const videoUrls = text.match(/https:\/\/[^"'\s]+\.tiktokcdn[^"'\s]+video\/tos\/[^"'\s]+/g);
  if (videoUrls) {
    console.log('Found direct video URLs:', videoUrls.length);
    console.log('First video URL:', videoUrls[0]);
  }
}

probeUrl().catch(console.error);
