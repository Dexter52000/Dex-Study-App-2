const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto('file://' + path.resolve('deck.html'), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const n = await p.evaluate(() => document.querySelectorAll('.page').length);
  const overflow = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.page').forEach((pg, i) => {
      const r = pg.getBoundingClientRect();
      pg.querySelectorAll('*').forEach(el => {
        const e = el.getBoundingClientRect();
        if (e.width === 0 || e.height === 0) return;
        if (e.bottom > r.bottom + 1 || e.right > r.right + 1) out.push(`page ${i+1}: <${el.tagName.toLowerCase()} class="${el.className}"> bottom=${Math.round(e.bottom - r.top)} right=${Math.round(e.right - r.left)}`);
      });
      // scroll overflow inside fixed-height boxes
      pg.querySelectorAll('.hotel, .day, .sight, .route, .panel, .card').forEach(el => {
        if (el.scrollHeight > el.clientHeight + 1) out.push(`page ${i+1}: overflow in .${el.className.split(' ')[0]} (${el.scrollHeight} > ${el.clientHeight}) "${(el.querySelector('h3')||el).textContent.trim().slice(0,30)}"`);
      });
    });
    return out;
  });
  console.log('pages', n); console.log(overflow.length ? overflow.join('\n') : 'no overflow detected');
  await p.pdf({ path: 'deck.pdf', printBackground: true, preferCSSPageSize: true, width: '1600px', height: '900px', margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await b.close();
  console.log('pdf written');
})().catch(e => { console.error('ERR', e); process.exit(1); });
