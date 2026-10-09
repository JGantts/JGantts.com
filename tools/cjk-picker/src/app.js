const definitions = JSON.parse(document.querySelector('#definitions').textContent);
const $ = selector => document.querySelector(selector);
const systemPool = Object.keys(definitions).map(Number).filter(cp => cp >= 0x4e00 && cp <= 0x9fff);
let available = systemPool, pool = [], selected = [], loadedFont = null, loadVersion = 0, toastTimer;
const error = message => { $('#error').textContent = message; $('#error').hidden = !message; };
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2000);
}
function randomInt(max) {
  const values = new Uint32Array(1), limit = 0x100000000 - (0x100000000 % max);
  do { crypto.getRandomValues(values); } while (values[0] >= limit);
  return values[0] % max;
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const area = document.createElement('textarea');
    area.value = text; area.style.cssText = 'position:fixed;left:-9999px';
    document.body.append(area); area.select();
    const succeeded = document.execCommand('copy'); area.remove();
    if (!succeeded) { toast('Select the character and copy it manually.'); return; }
  }
  toast('Copied to clipboard');
}
function shuffle() {
  const remaining = [...pool];
  selected = [];
  for (let i = 0, n = Math.min(Number($('#count').value), remaining.length); i < n; i++) {
    const at = randomInt(remaining.length);
    selected.push(remaining[at]); remaining[at] = remaining[remaining.length - 1]; remaining.pop();
  }
  const cards = $('#cards'); cards.replaceChildren(); cards.classList.toggle('single', selected.length === 1);
  for (const cp of selected) {
    const char = String.fromCodePoint(cp), code = cp.toString(16).toUpperCase();
    const card = document.createElement('article'); card.className = 'card';
    const glyph = document.createElement('div'); glyph.className = 'glyph'; glyph.textContent = char;
    const detail = document.createElement('div');
    const label = document.createElement('span'); label.className = 'code'; label.textContent = `U+${code}`;
    const meaning = document.createElement('p'); meaning.className = 'meaning'; meaning.textContent = definitions[cp] || 'No English gloss in Unihan.';
    const actions = document.createElement('div'); actions.className = 'card-actions';
    const button = document.createElement('button'); button.className = 'copy'; button.textContent = 'Copy character'; button.setAttribute('aria-label', `Copy ${char}`); button.onclick = () => copy(char);
    const link = document.createElement('a'); link.href = `https://en.wiktionary.org/wiki/${encodeURIComponent(char)}`; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = 'Dictionary ↗'; link.setAttribute('aria-label', `Dictionary entry for ${char}`);
    actions.append(button, link); detail.append(label, meaning, actions); card.append(glyph, detail); cards.append(card);
  }
  $('#empty').hidden = selected.length !== 0;
  $('#copy-all').disabled = !selected.length;
}
function updatePool() {
  pool = available.filter(cp => !$('#defined').checked || definitions[cp]);
  const source = loadedFont ? 'in your font' : 'in system-font preview';
  $('#pool-info').textContent = `${pool.length.toLocaleString()} eligible characters ${source}`;
  $('#shuffle').disabled = !pool.length;
  shuffle();
}
async function loadFont(file) {
  if (!file) return;
  const version = ++loadVersion;
  error('');
  $('#font-name').textContent = `Reading ${file.name}…`;
  try {
    if (file.size > 64 * 1024 * 1024) throw new Error('Please choose a font smaller than 64 MB.');
    const buffer = await file.arrayBuffer();
    if (version !== loadVersion) return;
    const characters = readHanCharacters(buffer);
    if (!characters.length) throw new Error('This font contains no supported Han ideographs. Try a CJK .ttf or .otf font.');
    const font = new FontFace(`CabinetFont${version}`, buffer);
    await font.load();
    if (version !== loadVersion) return;
    document.fonts.add(font);
    if (loadedFont) document.fonts.delete(loadedFont);
    loadedFont = font; available = characters;
    document.documentElement.style.setProperty('--glyph-font', `"${font.family}"`);
    $('#font-name').textContent = file.name; $('#font-name').title = file.name;
    $('#reset').hidden = false;
    updatePool();
  } catch (e) {
    if (version !== loadVersion) return;
    error(e instanceof Error ? e.message : 'Could not read this font. Please try a .ttf or .otf file.');
    $('#font-name').textContent = loadedFont ? 'Previous font still selected' : 'Choose a font file';
  }
}
$('#font-file').addEventListener('change', event => { loadFont(event.target.files[0]); event.target.value = ''; });
const drop = $('#drop-zone');
for (const name of ['dragenter', 'dragover']) drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('drag'); });
drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
drop.addEventListener('drop', event => { event.preventDefault(); drop.classList.remove('drag'); loadFont(event.dataTransfer.files[0]); });
// Prevent dropping outside the target from navigating away from the picker.
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
$('#reset').onclick = () => {
  ++loadVersion;
  if (loadedFont) document.fonts.delete(loadedFont);
  loadedFont = null; available = systemPool;
  document.documentElement.style.removeProperty('--glyph-font');
  $('#font-name').textContent = 'Choose a font file'; $('#font-name').removeAttribute('title'); $('#reset').hidden = true;
  error(''); updatePool();
};
$('#shuffle').onclick = shuffle;
$('#count').onchange = shuffle;
$('#defined').onchange = updatePool;
$('#copy-all').onclick = () => copy(selected.map(cp => String.fromCodePoint(cp)).join(''));
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.target.closest('button,input,select,textarea,a,dialog,[contenteditable]') && !$('#license-dialog').open) {
    event.preventDefault(); if (pool.length) shuffle();
  }
});
$('#license-text').textContent = JSON.parse($('#license').textContent);
$('#license-button').onclick = () => $('#license-dialog').showModal();
$('#close-license').onclick = () => $('#license-dialog').close();
updatePool();
