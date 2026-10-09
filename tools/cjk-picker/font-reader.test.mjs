import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHanCharacters, isHan } from './src/font-reader.mjs';

function wrap(subtable, glyphs = 100) {
  const buffer = new ArrayBuffer(62 + subtable.byteLength), view = new DataView(buffer);
  view.setUint32(0, 0x00010000); view.setUint16(4, 2);
  view.setUint32(12, 0x6d617870); view.setUint32(20, 44); view.setUint32(24, 6);
  view.setUint32(44, 0x00010000); view.setUint16(48, glyphs);
  view.setUint32(28, 0x636d6170); view.setUint32(36, 50); view.setUint32(40, 12 + subtable.byteLength);
  view.setUint16(52, 1); view.setUint16(54, 3); view.setUint16(56, 10); view.setUint32(58, 12);
  new Uint8Array(buffer, 62).set(new Uint8Array(subtable));
  return buffer;
}
function format12(groups, format = 12) {
  const buffer = new ArrayBuffer(16 + groups.length * 12), view = new DataView(buffer);
  view.setUint16(0, format); view.setUint32(4, buffer.byteLength); view.setUint32(12, groups.length);
  groups.forEach((group, i) => group.forEach((value, j) => view.setUint32(16 + i * 12 + j * 4, value)));
  return buffer;
}
function format4(indexed = false) {
  const buffer = new ArrayBuffer(indexed ? 38 : 32), view = new DataView(buffer);
  view.setUint16(0, 4); view.setUint16(2, buffer.byteLength); view.setUint16(6, 4);
  view.setUint16(14, 0x4e02); view.setUint16(16, 0xffff);
  view.setUint16(20, 0x4e00); view.setUint16(22, 0xffff);
  view.setUint16(24, indexed ? 2 : (1 - 0x4e00) & 0xffff); view.setUint16(26, 1);
  if (indexed) { view.setUint16(28, 4); view.setUint16(32, 0); view.setUint16(34, 1); view.setUint16(36, 99); }
  return buffer;
}
test('format 12 includes supplementary Han, excludes Latin, missing and invalid glyphs', () => {
  assert.deepEqual(readHanCharacters(wrap(format12([[65, 66, 1], [0x4e00, 0x4e02, 0], [0x20000, 0x20001, 98]]))), [0x4e01, 0x4e02, 0x20000, 0x20001]);
});
test('format 4 applies delta and glyph-index mappings; glyph zero stays absent', () => {
  assert.deepEqual(readHanCharacters(wrap(format4())), [0x4e00, 0x4e01, 0x4e02]);
  assert.deepEqual(readHanCharacters(wrap(format4(true))), [0x4e01]);
});
test('format 13 supports constant glyph mappings', () => {
  assert.deepEqual(readHanCharacters(wrap(format12([[0x4e00, 0x4e02, 1]], 13))), [0x4e00, 0x4e01, 0x4e02]);
});
test('rejects malformed bounds, overlapping groups, and unsupported file types', () => {
  assert.throws(() => readHanCharacters(new ArrayBuffer(2)), /invalid/);
  assert.throws(() => readHanCharacters(new ArrayBuffer(12)), /ttf/);
  const broken = wrap(format12([[0x4e00, 0x4e02, 1]]));
  new DataView(broken).setUint32(58, 0xffffffff);
  assert.throws(() => readHanCharacters(broken), /invalid/);
  assert.throws(() => readHanCharacters(wrap(format12([[0x4e00, 0x4e02, 1], [0x4e01, 0x4e03, 1]]))), /overlapping/);
});
test('Han filter includes extensions and compatibility characters, excludes kana and hangul', () => {
  for (const cp of [0x3007, 0x3400, 0xf900, 0x20000, 0x2f800, 0x323b0]) assert.equal(isHan(cp), true);
  for (const cp of [65, 0x3042, 0xac00, 0x1f600, 0x10ffff]) assert.equal(isHan(cp), false);
});
