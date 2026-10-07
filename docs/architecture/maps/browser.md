# Kovyálo browser map

**Responsibility:** display the fictional world with configurable raster layers, towns, theme, compass, and layer-tree controls.

**Entry points:** `/kovyalo` and its dev/game variants mount `IndexView.vue`; `maps.ts` coordinates map setup and `initMapSourcesAndLayers` installs sources/layers.

**Dependencies:** MapLibre, PMTiles protocol, `/assets/maps/geo-data/regions.json`, [generated map assets](generation.md), reactive settings, and HUD GUI types.

**Consumers:** Kovyálo page/layout and map HUD components.

**Town labels:** points use `name` for native spelling and optional `latin` for romanization. Labels default to both on two lines, with Latin at 80% size; absent, blank, or identical romanizations do not add a second line. The HUD selector switches between both, native, and Latin, persisting the choice with map settings. Either single-script mode falls back to the available spelling. Native labels use bundled Noto Serif and Noto Serif KR; Latin labels use Noto Sans, including when used as a fallback for a missing native name; the needed font subsets load before MapLibre generates glyphs.

Points can supply an optional `hangul` reading alongside `name`, for example `"name": "餉", "hangul": "아똬"`. Readings appear at 55% size above only the differing spans of the native name. Shared characters remain unannotated, with Latin below in bilingual mode. Blank readings or missing native names do not create ruby. Legacy `{base|reading}` spans remain supported when `hangul` is absent or blank; an explicit `hangul` reading takes precedence. Ruby names are drawn with the loaded native fonts into high-resolution inline images, so MapLibre places and collision-checks each complete label together. The source's `name` property contains the base spelling without markup; malformed spans remain literal text.

**Invariants:** browser layer paths must match Python's parent-region path construction and dark suffixes. Region bounds use latitude/longitude tuples and need conversion for MapLibre coordinates. Layer visibility combines GUI selection and theme metadata. Region IDs, parent IDs, zoom ranges, and UI paths form a cross-language contract. Declaring a terrain source does not mean terrain rendering is enabled; that setup is currently commented out.

**Source:** [map view, HUD, settings, and map modules](../../../jgantts-com/src/views/kovyalo), [layout](../../../jgantts-com/src/layouts/KovyaloLayout.vue), [region source](../../../maps-sources/geo-data/regions.json).

[Maps map](index.md)
