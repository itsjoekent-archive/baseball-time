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
  '2005', '2006', '2007',
  '2008', '2009', '2010',
  '2011', '2012', '2013',
  '2014', '2015', '2016',
  '2017', '2018',
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

function findAllLinks(html) {
  const $ = cheerio.load(html);

  const links = $('a').map((index, element) => (
    $(element).attr('href')
  )).get();

  return links;
}

async function crawl(uri) {
  console.log(`Crawling '${uri}'`);
  const res = await fetchHtml(uri);

  if (! res) {
    return;
  }

  const { html, contentType } = res;

  if (uri.includes('/gid_')) {
    const fileName = uuid.v4();

    const type = contentType.split('/')[1];

    table[uri] = {
      type,
      fileName,
      uri,
    };

    const filePath = path.join(baseStoragePath, fileName);
    fs.writeFileSync(filePath, html);

    console.log(`Stored result of ${uri}`)
  }

  const links = findAllLinks(html)
    .map((link) => {
      if (! link.includes('/gid_') && link.endsWith('/')) {
        return link.slice(0, link.length - 1);
      }

      return link;
    })
    .map(link => url.resolve(uri, link))
    .filter(link =>
      ! link.includes('/.0.')
      && ! link.includes('/batters')
      && ! link.includes('/pitchers')
      && ! link.includes('/media')
      && ! link.includes('/mobile')
      && ! link.endsWith('/components/game/mlb')
      && ! table[link]
      && link.length > uri.length
    );

  const hasGameData = links.find(link => link.includes('/gid_'));

  if (uri.includes('day_') && ! hasGameData) {
    return;
  }

  for (const link of links) {
    await crawl(link);
  }
}

async function run() {
  for (const yearUri of years) {
    await crawl(yearUri);
  }

  const indexPath = path.join(baseStoragePath, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(table, null, 2));
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
