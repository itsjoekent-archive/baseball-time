// Was used on the droplet to copy files around under an earlier file structure.

const fs = require('fs');
const path = require('path');

const finderPath = `${__dirname}/.../data/www/crawled_at_1541303337869`;
const archivePath = `${__dirname}/../../baseball-time-raw-data/xml`;

const files = fs.readdirSync(finderPath).map(path => ({
  from: `${finderPath}/${path}`,
  to: `${archivePath}/${path}`,
}));

files.forEach((file, index) => {
  console.log(`Copying file ${index} of ${files.length}`);

  const { from, to } = file;
  fs.copyFileSync(from, to);
});

console.log('Done!');
