import Session from '../dist/src/core/Session.js';

const session = await Session.create();
const res = await session.http.fetchAPI('/api/explore/item_list/', {
  categoryType: 108,
  count: 16
});

const items = res.data?.itemList || [];
console.log(`Fetched ${items.length} raw items from category 108.\n`);

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  console.log(`Item #${i + 1}:`);
  console.log(`  id: ${item.id}`);
  console.log(`  desc: "${item.desc}"`);
  console.log(`  categoryType: ${item.CategoryType}`);
  console.log(`  diversificationLabels:`, item.diversificationLabels);
  console.log(`  anchors:`, item.anchors?.map(a => a.name || a.type));
  console.log(`  poi:`, item.poi);
  console.log(`  playlist / mix:`, item.playlist, item.mix_info, item.playlist_info);
  console.log(`  series:`, item.series, item.series_info);
  console.log(`  author.shortDramaCreator:`, item.author?.shortDramaCreator);
}
