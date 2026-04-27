#!/usr/bin/env python3
"""
make_all_tiles.py

Calls tile_pm.py automatically.

Usage:

python3 make_all_tiles.py \
  --regions ../jgantts-com/PUBLIC/assets/kovyalo/geo-data/regions.json \
  --world ../jgantts-com/PUBLIC/assets/kovyalo/map/world.png \

Builds:
1) World map => zoom 0-6
2) Each region base layer => zoom 7-12
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

TILER = Path("./tile_pm.py").resolve()

# ---------------------------------------------------
# helpers
# ---------------------------------------------------

def run(cmd):
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True, stdout=sys.stdout, stderr=sys.stderr)

def normalize_file_path(path_str):
    path = f"../jgantts-com/PUBLIC/{path_str}"
    return path

def build(input_file, bounds, minzoom, maxzoom):
    west, south, east, north = bounds

    run([
        sys.executable,
        str(TILER),
        "--input", str(input_file),

        "--bounds",
        str(west),
        str(south),
        str(east),
        str(north),

        "--minzoom", str(minzoom),
        "--maxzoom", str(maxzoom),
    ])


# ---------------------------------------------------
# main
# ---------------------------------------------------

def main():
    p = argparse.ArgumentParser()

    p.add_argument("--regions", required=True)

    p.add_argument("--world", required=True)

    args = p.parse_args()

    regions_json = Path(args.regions).resolve()

    if not TILER.exists():
        print("Missing tiler:", TILER)
        sys.exit(1)

    if not regions_json.exists():
        print("Missing regions file:", regions_json)
        sys.exit(1)

    regions = json.loads(regions_json.read_text(encoding="utf-8"))

    # -------------------------------------------------
    # WORLD
    # -------------------------------------------------

    print("\n=== WORLD ===")


    p = Path(args.world).resolve()

    build(
        args.world,
        (-180, -85.05113, 180, 85.05113),
        0,
        6
    )

    # -------------------------------------------------
    # REGIONS
    # -------------------------------------------------

    for region in regions:
        region_id = region["id"]

        bounds_raw = region["bounds"]

        north = bounds_raw[0][0]
        west = bounds_raw[0][1]
        south = bounds_raw[1][0]
        east = bounds_raw[1][1]

        bounds = (west, south, east, north)

        base = None
        for layer in region["layers"]:
            if layer["id"] == "base":
                base = layer
                break

        if not base:
            print(f"Skipping {region_id}: no base layer")
            continue

        input_file = base["imageUrl"]
        p = Path(input_file).resolve()
        output_dir = p.with_suffix("").parent / f"{p.stem}_tiles/"

        print(f"\n=== REGION {region_id} ===")

        print(input_file)
        print(normalize_file_path(input_file))

        build(
            normalize_file_path(input_file),
            bounds,
            region["minZoom"],
            region["maxZoom"]
        )

    print("\nDONE")


if __name__ == "__main__":
    main()
