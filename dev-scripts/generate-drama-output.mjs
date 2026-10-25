import fs from 'node:fs';
import TokKit from '../dist/src/index.js';

async function main() {
  console.log('Initializing TokKit...');
  const tt = await TokKit.create();

  console.log('Fetching Drama Categories...');
  const categories = await tt.getDramaCategories();

  console.log('Fetching Drama Trending (themeType: 7)...');
  const trending = await tt.getDramaTrending({ count: 5 });

  console.log('Fetching Drama Ranking (themeType: 9)...');
  const ranking = await tt.getDramaRanking({ count: 5 });

  console.log('Fetching Drama Latest (themeType: 10)...');
  const latest = await tt.getDramaLatest({ count: 5 });

  console.log('Fetching Drama New Releases (categoryDateType: 1)...');
  const newReleases = await tt.getDramaNewReleases({ count: 5 });

  let sampleEpisodes = null;
  let sampleStream = null;

  if (trending.items.length > 0) {
    const drama = trending.items[0];
    console.log(`Fetching episodes for sample drama "${drama.title}" (${drama.id})...`);
    sampleEpisodes = await tt.getDramaEpisodes(drama.id, { count: 10 });

    console.log('Resolving direct video stream for first episode...');
    try {
      sampleStream = await drama.resolveFirstEpisodeStream(tt);
    } catch (e) {
      console.warn('Stream resolution fallback:', e.message);
    }
  }

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'https://www.tiktok.com/shortdrama',
      runtimeCompatibility: [
        'Node.js (>=18)',
        'CapacitorJS (iOS / Android WebViews with CapacitorHttp or custom fetch)',
        'Modern Browsers (Chrome, Safari, Firefox, Edge)',
        'Deno & Bun'
      ],
      html5Playable: true
    },
    categories: {
      storyThemes: categories.storyThemes?.slice(0, 5),
      genres: categories.genres?.slice(0, 10),
      releaseDates: categories.releaseDates
    },
    trending: {
      count: trending.items.length,
      hasMore: trending.hasMore,
      cursor: trending.cursor,
      sampleSeries: trending.items.slice(0, 3).map(d => ({
        id: d.id,
        title: d.title,
        author: {
          uniqueId: d.author.uniqueId,
          nickname: d.author.nickname,
          avatarUrl: d.author.avatarUrl
        },
        episodeCount: d.episodeCount,
        watchCount: d.watchCount,
        coverUrl: d.coverUrl,
        synopsis: d.synopsis,
        themeNames: d.themeNames,
        firstEpisodeVideoId: d.firstEpisodeVideoId,
        firstEpisodePlayUrl: d.firstEpisodePlayUrl
      }))
    },
    ranking: {
      count: ranking.items.length,
      hasMore: ranking.hasMore,
      cursor: ranking.cursor,
      sampleSeries: ranking.items.slice(0, 3).map(d => ({
        id: d.id,
        title: d.title,
        author: d.author,
        episodeCount: d.episodeCount,
        watchCount: d.watchCount,
        coverUrl: d.coverUrl
      }))
    },
    latest: {
      count: latest.items.length,
      hasMore: latest.hasMore,
      cursor: latest.cursor,
      sampleSeries: latest.items.slice(0, 3).map(d => ({
        id: d.id,
        title: d.title,
        author: d.author,
        episodeCount: d.episodeCount,
        watchCount: d.watchCount,
        coverUrl: d.coverUrl
      }))
    },
    newReleases: {
      count: newReleases.items.length,
      hasMore: newReleases.hasMore,
      cursor: newReleases.cursor,
      sampleSeries: newReleases.items.slice(0, 3).map(d => ({
        id: d.id,
        title: d.title,
        author: d.author,
        episodeCount: d.episodeCount,
        watchCount: d.watchCount,
        coverUrl: d.coverUrl
      }))
    },
    sampleEpisodePlaylist: sampleEpisodes ? {
      dramaId: sampleEpisodes.dramaId,
      totalEpisodesLoaded: sampleEpisodes.items.length,
      hasMore: sampleEpisodes.hasMore,
      cursor: sampleEpisodes.cursor,
      episodes: sampleEpisodes.items.slice(0, 5).map(ep => ({
        id: ep.id,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        duration: ep.video?.duration,
        coverUrl: ep.video?.coverUrl,
        stats: ep.stats,
        directPlayUrl: ep.playUrl,
        downloadAddrUrl: ep.video?.downloadAddrUrl
      }))
    } : null,
    sampleResolvedStream: sampleStream ? {
      status: 'playable',
      sourceType: 'mp4',
      playUrl: sampleStream.playUrl,
      downloadUrl: sampleStream.downloadUrl,
      duration: sampleStream.duration,
      ratio: sampleStream.ratio,
      qualities: sampleStream.qualities,
      allPlayUrls: sampleStream.allPlayUrls?.slice(0, 3)
    } : null
  };

  fs.writeFileSync('short_drama_output.json', JSON.stringify(output, null, 2), 'utf8');
  console.log('Successfully saved to short_drama_output.json!');
}

main().catch(err => {
  console.error('Error generating drama output:', err);
  process.exit(1);
});
