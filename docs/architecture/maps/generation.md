# Map asset generation

**Responsibility:** compile source raster layers and region definitions into browser map assets independently of the Node/Vite build.

**Entry points:** `python/make_all_tiles.py` (production) or `--dev`; `tile_pm.py` builds a single PMTiles archive. Terrain/rivers/color/erosion scripts are supporting offline tools, not all stages of the main build.

**Dependencies:** `maps-sources/geo-data/regions.json`, raster inputs, Python requirements, GDAL tools, and PMTiles CLI.

**Consumers:** [browser map](browser.md) and the workflow's separate `deploy-maps` job.

**Invariants:** production output goes to `maps-rendered`; dev output goes to `jgantts-com/PUBLIC/assets/maps`. Hash-based rebuild decisions include raster and layer parameters. Parent-region paths, bounds, zooms, and dark variants must agree with browser code. Generated outputs are not authoritative source rasters. The main script copies region JSON alongside compiled assets.

**Source:** [build driver](../../../python/make_all_tiles.py), [tiler](../../../python/tile_pm.py), [paths](../../../python/path_constants.py), [supporting tools](../../../python), [source assets](../../../maps-sources), [deployment workflow](../../../.github/workflows/deploy.yml).

[Maps map](index.md)
