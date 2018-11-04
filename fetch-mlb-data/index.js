const fs = require('fs');
const path = require('path');
const url = require('url');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const uuid = require('uuid');

const baseUri = 'https://gd2.mlb.com/components/game/mlb';
const baseStoragePath = path.join(__dirname, '../data/www', `crawled_at_${Date.now()}`);

fs.mkdirSync(baseStoragePath);

const table = {};

const years = [
  '2010', '2011', '2012',
  '2013', '2014', '2015',
  '2016', '2017', '2018',
].map(year => `${baseUri}/year_${year}`);

const acceptedContentTypes = [
  'application/json',
  'application/xml',
  'text/html',
  'text/xml',
];

async function fetchHtml(uri) {
  const res = await fetch(uri);

  const contentType = res.headers.get('content-type');
  if (! acceptedContentTypes.includes(contentType)) {
    return null;
  }

  const html = await res.text();

  return { html, contentType };
}

async function findAllLinks(uri) {
  const res = await fetchHtml(uri);
  if (! res) return [];

  const { html } = res;
  const $ = cheerio.load(html);

  const links = $('a').map((index, element) => (
    $(element).attr('href')
  )).get();

  return links
    .map((link) => {
      if (! link.includes('/gid_') && link.endsWith('/')) {
        return link.slice(0, link.length - 1);
      }

      return link;
    })
    .map(link => url.resolve(uri, link))
}

async function filterLinksFor(uri, onFilter) {
  const links = await findAllLinks(uri);

  return links.filter(onFilter);
}

async function findLinkFor(uri, onFind) {
  const links = await findAllLinks(uri);

  return links.find(onFind);
}

async function findAllMonths(yearUri) {
  const onFilter = link => link.includes('/month_');

  return filterLinksFor(yearUri, onFilter);
}

async function findAllDaysWithinMonth(monthUri) {
  const onFilter = link => link.includes('/day_');

  return filterLinksFor(monthUri, onFilter);
}

async function findAllGamesForDay(dayUri) {
  const onFilter = link => link.includes('/gid_');

  return filterLinksFor(dayUri, onFilter);
}

async function findInningsForGame(gameUri) {
  const onFind = link => link.includes('/inning');

  return findLinkFor(gameUri, onFind);
}

async function findAllInningData(inningUri) {
  const onFind = link => link.endsWith('inning_all.xml');

  return findLinkFor(inningUri, onFind);
}

async function run() {
  for (const yearUri of years) {
    const months = await findAllMonths(yearUri);

    for (const month of months) {
      const days = await findAllDaysWithinMonth(month);

      for (const day of days) {
        const games = await findAllGamesForDay(day);

        for (const game of games) {
          const innings = await findInningsForGame(game);
          if (! innings) continue;

          const allInnings = await findAllInningData(innings);
          if (! allInnings) continue;

          const id = game.split('/').find(part => part.startsWith('gid'));
          if (! id) throw new Error(`Invalid ID? ${yearUri} ${month} ${day} ${game}`);

          const res = await fetchHtml(allInnings);
          if (! res) throw new Error(`Invalid game data? ${yearUri} ${month} ${day} ${game}`);

          const { html } = res;
          const filePath = path.join(baseStoragePath, `${id}.xml`);

          console.log(`Saving result for ${id}...`);

          fs.writeFileSync(filePath, html);
        }
      }
    }
  }
}

try {
  console.log('Fetching data...');
  console.time('fetch-mlb-data');

  run().then(() => {
    console.log('Done.');
    console.timeEnd('fetch-mlb-data');
  });
} catch (error) {
  console.error(error);
}
