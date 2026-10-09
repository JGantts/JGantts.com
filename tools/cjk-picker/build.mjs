import { readFile, writeFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
let html = await read('src/index.html');
for (const [marker, path] of [['STYLES', 'src/style.css'], ['FONT_READER', 'src/font-reader.mjs'], ['APP', 'src/app.js'], ['DEFINITIONS', 'data/definitions.json'], ['LICENSE', 'data/UNICODE-LICENSE.txt']]) {
  let value = await read(path);
  if (marker === 'FONT_READER') value = value.replace(/^export /gm, '');
  if (marker === 'LICENSE') value = JSON.stringify(value);
  if (marker === 'LICENSE' || marker === 'DEFINITIONS') value = value.replace(/</g, '\\u003c');
  html = html.replace(`/* ${marker} */`, () => value);
}
await writeFile(new URL('index.html', import.meta.url), html);
console.log('Built standalone tools/cjk-picker/index.html');
