import { existsSync } from 'node:fs';

const pages = ['index.html', 'driver.html', 'report.html', 'bericht.html', 'admin.html', 'accountant.html'];
const missing = pages.filter((page) => !existsSync(`dist/${page}`));

if (missing.length > 0) {
  console.error(`Missing generated pages: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Verified generated pages: ${pages.join(', ')}`);
