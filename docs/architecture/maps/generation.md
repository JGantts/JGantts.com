# Map asset generation

**Responsibility:** compile source raster layers and region definitions into browser map assets independently of the Node/Vite build.

**Entry points:** from `python/`, run `python3 make_all_tiles.py` or add `--dev`; tiler paths require that working directory. `tile_pm.py` builds one archive; terrain/rivers/color/erosion scripts are separate offline tools.

**Dependencies:** `maps-sources/geo-data/regions.json`, raster inputs, Python requirements, GDAL tools, and PMTiles CLI.

**Consumers:** [browser map](browser.md) and the workflow's separate `deploy-maps` job.

**Invariants:** production output goes to `maps-rendered`; dev output goes to `jgantts-com/PUBLIC/assets/maps`. Hashes include raster/layer parameters. Staging survives through asset copying, including unchanged builds, and is cleaned on success or failure. Parent-region paths, bounds, zooms, and dark variants must agree with browser code. Generated outputs are not authoritative source rasters. The main script copies region JSON alongside compiled assets.

**Source:** [build driver](../../../python/make_all_tiles.py), [tiler](../../../python/tile_pm.py), [paths](../../../python/path_constants.py), [supporting tools](../../../python), [source assets](../../../maps-sources), [deployment workflow](../../../.github/workflows/deploy.yml).

[Maps map](index.md)
