const fs = require('fs');
const path = require('path');
const parser = require('fast-xml-parser');
const map = require('./map');

const baseFinderPath = path.join(__dirname, '../../baseball-time-raw-data/xml');
const baseStoragePath = path.join(__dirname, '../../baseball-time-raw-data/json');

async function parse(xml) {
  return new Promise((resolve) => {
    xml2js.parseString(xml, (err, result) => {
      resolve(result);
    });
  });
}

fs.readdirSync(baseFinderPath)
  .forEach((filePath, index, files) => {
    const originalRelativeFilePath = filePath;
    const absoluteInPath = path.join(baseFinderPath, filePath);

    const xml = fs.readFileSync(absoluteInPath, 'utf8');
    const rawJson = parser.parse(xml, {
      ignoreAttributes: false,
      attributeNamePrefix: '',
      allowBooleanAttributes: true,
      parseAttributeValue: true,
    });

    const json = map(rawJson);

    const name = originalRelativeFilePath.replace('.xml', '');
    const relativePath = `${name}.json`;
    const absoluteOutPath = path.join(baseStoragePath, relativePath);

    console.log(`[${index + 1}/${files.length}] Writing ${relativePath}`);
    fs.writeFileSync(absoluteOutPath, JSON.stringify(json, null, 2));
  });
