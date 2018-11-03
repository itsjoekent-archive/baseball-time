const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

function filterMonthsFromLinks(links) {
  return links.filter((link) => (
    link.startsWith('year_') &&
    link.includes('/month_')
  ));
}
