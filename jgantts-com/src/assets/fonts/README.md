# JGantts Hangul webfonts

Two modified Noto CJK fonts, restricted to Hangul and U+0301:

- JGantts Hangul Serif Regular: native map labels; based on Noto Serif CJK KR Regular.
- JGantts Hangul Sans Light: ruby and translated readings; based on Noto Sans CJK KR Light.

Original character advances, sidebearings, and syllable outlines are preserved. Each font uses its own shorter spacing-acute outline for U+0301 and adds centered attachment anchors with 50 font units of clearance. All 11,172 syllables are checked for unchanged original advances and accent placement during generation. Latin/Han use the existing site fonts.

Sources are the Korean OTFs in https://github.com/notofonts/noto-cjk under `Sans/OTF/Korean/NotoSansCJKkr-Light.otf` and `Serif/OTF/Korean/NotoSerifCJKkr-Regular.otf`. The SIL Open Font License is included as OFL.txt (Sans) and OFL-Serif.txt (Serif). Modified families are renamed to JGantts Hangul Sans/Serif.

Regenerate with Python packages `fonttools`, `brotli`, and `uharfbuzz`:

```sh
python tools/map-fonts/patch_hangul.py NotoSansCJKkr-Light.otf /tmp/JGanttsHangulSans-Light.otf --style Sans
python tools/map-fonts/patch_hangul.py NotoSerifCJKkr-Regular.otf /tmp/JGanttsHangulSerif-Regular.otf --style Serif
```

Copy the generated WOFF2 files beside this README. The script retains Hangul, Jamo, U+0301, and applicable OpenType layout rules. CSS uses downloaded URLs without local-font shortcuts. Map initialization waits for fonts before caching label images. Fonts currently download as complete Hangul subsets; region-by-region loading is not implemented.

Source SHA-256 checksums:

- Sans: `2f45abf3908d88ee45d2831484c920ec4a65e214ec14a8e0341ff2213579d5fc`
- Serif: `77b4b741f864d27f15e90f275b17106dde90b2ad28f82bab72dc95805db5fb42`
