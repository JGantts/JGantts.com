// Unicode cmap formats specified by Microsoft OpenType. No font leaves the browser.
export function isHan(cp) {
  return cp === 0x3007 || [
    [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xf900, 0xfaff],
    [0x20000, 0x2a6df], [0x2a700, 0x2b73f], [0x2b740, 0x2b81f],
    [0x2b820, 0x2ceaf], [0x2ceb0, 0x2ebef], [0x2ebf0, 0x2ee5f],
    [0x2f800, 0x2fa1f], [0x30000, 0x3134f], [0x31350, 0x3347f],
  ].some(([first, last]) => cp >= first && cp <= last);
}

export function readHanCharacters(buffer) {
  const view = new DataView(buffer);
  function check(offset, length, end = view.byteLength) {
    if (!Number.isSafeInteger(offset) || offset < 0 || length < 0 || offset + length > end) {
      throw new Error('This font has an incomplete or invalid character table.');
    }
  }
  const u16 = o => { check(o, 2); return view.getUint16(o); };
  const u32 = o => { check(o, 4); return view.getUint32(o); };
  const magic = u32(0);
  if (magic !== 0x00010000 && magic !== 0x4f54544f && magic !== 0x74727565) {
    throw new Error('Please choose a .ttf or .otf font. Font collections (.ttc) and webfonts (.woff/.woff2) are not supported.');
  }
  const tables = u16(4);
  check(12, tables * 16);
  let cmap, cmapEnd, glyphCount;
  for (let i = 0; i < tables; i++) {
    const record = 12 + i * 16, tag = u32(record);
    const offset = u32(record + 8), length = u32(record + 12);
    check(offset, length);
    if (tag === 0x636d6170) { cmap = offset; cmapEnd = offset + length; }
    if (tag === 0x6d617870) { check(offset, 6, offset + length); glyphCount = u16(offset + 4); }
  }
  if (cmap === undefined || !glyphCount) throw new Error('This font is missing its character or glyph table.');
  check(cmap, 4, cmapEnd);
  const count = u16(cmap + 2), candidates = [];
  check(cmap + 4, count * 8, cmapEnd);
  for (let i = 0; i < count; i++) {
    const r = cmap + 4 + i * 8, platform = u16(r), encoding = u16(r + 2);
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;
    const start = cmap + u32(r + 4);
    check(start, 2, cmapEnd);
    const format = u16(start);
    if ([4, 12, 13].includes(format)) candidates.push({ start, format, platform });
  }
  // Match a browser's preference for a full Unicode map, rather than merging incompatible maps.
  candidates.sort((a, b) => ((b.format === 12 ? 30 : b.format === 4 ? 20 : 10) + b.platform) - ((a.format === 12 ? 30 : a.format === 4 ? 20 : 10) + a.platform));
  if (!candidates.length) throw new Error('No supported Unicode character map was found in this font.');
  const { start, format } = candidates[0], result = new Set();
  const add = (cp, glyph) => { if (glyph > 0 && glyph < glyphCount && isHan(cp)) result.add(cp); };
  if (format === 4) {
    check(start, 16, cmapEnd);
    const length = u16(start + 2), end = start + length, segCountX2 = u16(start + 6), segments = segCountX2 / 2;
    check(start, length, cmapEnd);
    if (!segments || segCountX2 % 2) throw new Error('Invalid segmented character map.');
    check(start, 16 + segments * 8, end);
    const ends = start + 14, starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2, ranges = deltas + segments * 2;
    let previousEnd = -1;
    for (let i = 0; i < segments; i++) {
      const first = u16(starts + i * 2), last = u16(ends + i * 2);
      if (first > last || first <= previousEnd) throw new Error('Invalid overlapping character ranges.');
      previousEnd = last;
      const delta = u16(deltas + i * 2), range = u16(ranges + i * 2);
      for (let cp = first; cp <= last && cp < 0xffff; cp++) {
        let glyph;
        if (range === 0) glyph = (cp + delta) & 0xffff;
        else {
          const at = ranges + i * 2 + range + (cp - first) * 2;
          check(at, 2, end);
          glyph = u16(at);
          if (glyph) glyph = (glyph + delta) & 0xffff;
        }
        add(cp, glyph);
      }
    }
  } else {
    check(start, 16, cmapEnd);
    const length = u32(start + 4), end = start + length, groups = u32(start + 12);
    check(start, length, cmapEnd);
    check(start + 16, groups * 12, end);
    let previousEnd = -1;
    for (let i = 0; i < groups; i++) {
      const at = start + 16 + i * 12, first = u32(at), last = u32(at + 4), glyph = u32(at + 8);
      if (first > last || last > 0x10ffff || first <= previousEnd) throw new Error('Invalid overlapping character ranges.');
      previousEnd = last;
      for (let cp = first; cp <= last; cp++) add(cp, format === 13 ? glyph : glyph + cp - first);
    }
  }
  return [...result].sort((a, b) => a - b);
}
