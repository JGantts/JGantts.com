# Kovyálo browser map

**Responsibility:** display the fictional world with configurable raster layers, towns, theme, compass, and layer-tree controls.

**Entry points:** `/kovyalo` and its dev/game variants mount `IndexView.vue`; `maps.ts` coordinates map setup and `initMapSourcesAndLayers` installs sources/layers.

**Dependencies:** MapLibre, PMTiles protocol, `/assets/maps/geo-data/regions.json`, [generated map assets](generation.md), reactive settings, and HUD GUI types.

**Consumers:** Kovyálo page/layout and map HUD components.

**Invariants:** browser layer paths must match Python's parent-region path construction and dark suffixes. Region bounds use latitude/longitude tuples and need conversion for MapLibre coordinates. Layer visibility combines GUI selection and theme metadata. Region IDs, parent IDs, zoom ranges, and UI paths form a cross-language contract. Declaring a terrain source does not mean terrain rendering is enabled; that setup is currently commented out.

**Source:** [map view, HUD, settings, and map modules](../../../jgantts-com/src/views/kovyalo), [layout](../../../jgantts-com/src/layouts/KovyaloLayout.vue), [region source](../../../maps-sources/geo-data/regions.json).

[Maps map](index.md)
