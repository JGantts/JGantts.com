# Map visual improvements

Preserve the existing colorful political map, relief, multilingual names, and black unexplored territory. Significant display parameters live in `jgantts-com/src/views/kovyalo/maps/cartography.ts`.

## Completed implementation stages

| Tasks | Implementation and verification |
| --- | --- |
| 1–2: typography | Proportional halos; primary, romanized, supplementary, and ruby size hierarchy. Renderer unit tests and six language modes in both themes. |
| 3–5: placement | Full-image label collisions, reserved marker footprints, eight close offsets accounting for annotations, weighted boundary clearance. Synthetic crowded-marker and boundary tests plus real-map desktop/phone inspection. Boundary avoidance is a preference when no clear candidate exists. |
| 6–9: rivers | Existing paths become a connected vector network with eight reviewed gap repairs, height-derived contributing-area estimates, gradual widths, round junctions, and finer tributaries. Display tails outside the known terrain footprint are clipped. The network drains to the existing southeastern lake. Raw flux conservation, full-source geometry checks, and close-up browser checks cover every repaired gap and the outlet. |
| 10–13: terrain/color | Modest configurable political shadow floor and saturation reduction; source relief and alpha remain unchanged. Black background layers are excluded. Light/dark real-map screenshots verify legibility without altering terrain generation. |
| 14–16: settlements | Explicit class support, population fallback, contrasting outlines, collision-aware marker priority, and progressive minor settlement visibility. No capital designation or coordinates invented. |
| 17–19: boundaries | User-defined hierarchy: Ziemúnd is one country; four political colors are provinces; remaining strokes are counties. Offline compiler derives three vector classes with independently configurable widths/opacity. National/province casings separate dark relief from black territory. County junctions reconnect to existing parent boundaries. Synthetic geometry, cache invalidation, and real-map layer-order checks cover the pipeline. The national outline also marks unexplored territory; artwork does not supply a separate legal boundary classification there. |

## Hydrology evidence and limits

The source raster contained small disconnected strokes. Close-up inspection confirmed short gaps at existing confluences and continuations; `maps-sources/kovyalo/ziemund/rivers-network.json` records the reviewed repair anchors. The compiler reconnects only those listed pairs, checks that they stay within known terrain, and fails if the artwork changes enough to invalidate them. The original river PNG and height map remain unchanged.

Contributing drainage area is estimated from the existing grayscale height raster and conditioned to the mapped river paths. It is a runoff proxy for relative line widths, not measured water discharge. Raw accumulation is conserved through confluences and braid splits; display smoothing changes only stroke width. The original lake endpoint is checked against the blue lake artwork. A full-source test samples all rendered segments against the river artwork and opaque terrain mask.

The final review also caught and fixed layers disappearing at the map’s maximum zoom: Ziemúnd now has a display maximum of 11 while retaining data zoom 10. Marker synchronization waits for settled symbol placement, avoiding transient label-query errors during rapid language/zoom changes.

## Validation commands

- Frontend: `cd jgantts-com && npm test && npm run build`.
- Browser: `cd jgantts-com && npx playwright test tests/e2e/map-*.spec.ts --project=chrome` (requires local map assets and prepared browser).
- Python: `python -m unittest discover -s python -p 'test_*.py'`, using Python 3.10+ with `python/requirements-cartography.txt` installed.
- Map build: from `python/`, `python make_all_tiles.py --dev`, with GDAL and production tiling tools available as described in the architecture docs.

Generated map assets and Playwright screenshots are ignored build products. Source PNGs, terrain, town names, language data, and settlement coordinates remain authoritative.
