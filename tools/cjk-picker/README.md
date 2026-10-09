# Character Cabinet

Open `index.html` in a modern browser. No installation or server is needed. Choose or drop a `.ttf` or `.otf` font, then shuffle Han ideographs with English glosses beside them. Click **Copy character**, **Copy all characters**, or follow a dictionary link. Space shuffles when focus is outside a control. Choose 1, 6, 12, or 24 results.

Uploaded fonts are processed locally. The picker reads the font's Unicode character map and excludes missing glyphs. Font collections (`.ttc`) and compressed webfonts (`.woff`, `.woff2`) are unsupported. The initial system-font preview uses basic Han characters with known meanings; browser fallback fonts may be used in this preview. Loading a font enables its full supported Han range, including supplementary and compatibility ideographs. Kana, Hangul, punctuation, and variation sequences are not included.

English glosses are Unicode Unihan 17.0 `kDefinition` data (23,285 entries), bundled for convenience. They are short general glosses, not comprehensive Chinese, Japanese, or Korean dictionary entries. “Only with meanings” is enabled by default. Turning it off includes supported Han characters without a gloss.

## Development

Edit `src/`, then rebuild the standalone HTML:

```sh
node tools/cjk-picker/build.mjs
node --test tools/cjk-picker/font-reader.test.mjs
```

The source data in `data/definitions.json` maps decimal code points to `kDefinition` values extracted from `Unihan_Readings.txt` in [Unicode 17.0 Unihan.zip](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip). The [Unicode license](data/UNICODE-LICENSE.txt) is also embedded in the HTML. Character-map parsing follows the [OpenType cmap specification](https://learn.microsoft.com/en-us/typography/opentype/spec/cmap), supporting formats 4, 12, and 13.

Validated in Chrome using a real Noto Sans CJK OTF: font loading, definition filtering, unique sampling within a batch, result counts, malformed-font recovery, system-font reset, and mobile layout.
