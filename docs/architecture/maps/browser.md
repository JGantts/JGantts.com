# Kovyálo browser map

**Responsibility:** display the fictional world with configurable raster layers, towns, theme, compass, and layer-tree controls.

**Entry points:** `/kovyalo` and its dev/game variants mount `IndexView.vue`; `maps.ts` coordinates map setup and `initMapSourcesAndLayers` installs sources/layers.

**Dependencies:** MapLibre, PMTiles protocol, `/assets/maps/geo-data/regions.json`, [generated map assets](generation.md), reactive settings, and HUD GUI types.

**Consumers:** Kovyálo page/layout and map HUD components.

**Town labels:** points use `name` for native spelling, optional `latin` for romanization, and optional `hangul` for a reading. The HUD persists five modes: Native, Native + Latin (the default), Native + Hangul, Latin, and Hangul. Native labels use Noto Serif and Noto Serif KR; Latin uses Noto Sans Light (300). Ruby and all below-native translations use Noto Sans Light with Noto Sans KR Light for Hangul. All needed Unicode subsets load before labels are drawn. Primary labels use 18 px on small/short map views, 20 px from 768×500, 22 px from 1200×700, and 24 px from 1600×900 (CSS pixels; both dimensions must qualify). Map resize events update the size; fitted images scale ruby and translations proportionally while retaining native-only anchoring.

A native name containing Hangul or Han retains divergent ruby from `hangul` in Native and Native + Latin modes. Hangul mode keeps the annotated native name when it contains Hangul; Han-only names use the standalone `hangul` field. Other native names appear without automatic ruby in Native mode; Native + Hangul puts the Hangul reading below Latin-script native names as an 80%-size translation, while other names use ruby above differing spans, and Hangul mode shows the standalone `hangul` field. Latin mode uses `latin` when nonblank, otherwise the resolved native label. Native + Latin adds any nonblank Latin field below at 80% size, including an identical spelling; a Latin-only entry uses that spelling as its primary label. Missing native or standalone Hangul labels remain empty in their respective modes. Legacy `{base|reading}` spans are still understood; explicit `hangul` readings take precedence where ruby is enabled.

Ruby appears at 55% size over only the differing spans; shared characters remain unannotated. Visible labels are high-resolution images with a content rectangle covering only the primary line. Invisible single-line text controls MapLibre variable-anchor placement and collision checks. Placement tries eight directions at successively wider offsets (0.25, 1.25, and 2.25 em) so crowded towns can fit without forcing native text to overlap; the fitted image places ruby above and Latin centered below without moving that anchor. Ruby does not widen native character advances. Standalone Latin/Hangul modes anchor to their displayed spelling. Dots render independently, and secondary annotations do not affect placement, so they may overlap in crowded areas.

**Invariants:** browser layer paths must match Python's parent-region path construction and dark suffixes. Region bounds use latitude/longitude tuples and need conversion for MapLibre coordinates. Layer visibility combines GUI selection and theme metadata. Region IDs, parent IDs, zoom ranges, and UI paths form a cross-language contract. Declaring a terrain source does not mean terrain rendering is enabled; that setup is currently commented out.

**Source:** [map view, HUD, settings, and map modules](../../../jgantts-com/src/views/kovyalo), [layout](../../../jgantts-com/src/layouts/KovyaloLayout.vue), [region source](../../../maps-sources/geo-data/regions.json).

[Maps map](index.md)
