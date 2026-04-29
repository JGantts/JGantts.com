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
import shutil
import subprocess
import sys
from pathlib import Path

TILER = Path("./tile_pm.py").resolve()
DEMMER = Path("./tile_dem.py").resolve()

from path_constants import SRC_DIR, WORLD_IMAGE_IN, WORLD_ERODED_IN, WORLD_IMAGE_OUT, REGIONS_JSON_IN, OUTPUT_DIR, REGIONS_JSON_OUT

# ---------------------------------------------------
# helpers
# ---------------------------------------------------

def run(cmd):
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True, stdout=sys.stdout, stderr=sys.stderr)
   
def normalize_in_file_path(path):
    p = Path(path)
    if p.is_absolute():
        return p
    return SRC_DIR / p

def make_normalize_out_file_path(args):
    def normalize_out_file_path(path):
        base = OUTPUT_DIR(args.dev)
        p = Path(path)
        if p.is_absolute():
            return p
        return base / p
    return normalize_out_file_path

def build(input_file, output_file, bounds, minzoom, maxzoom):
    west, south, east, north = bounds

    run([
        sys.executable,
        str(TILER),
        "--input", str(input_file),
        "--output", str(output_file),
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

    p.add_argument("--dev", action="store_true")

    args = p.parse_args()

    normalize_out_file_path = make_normalize_out_file_path(args)
    
    regions_json_in = Path(REGIONS_JSON_IN).resolve()
    regions_json_out = Path(REGIONS_JSON_OUT(args.dev)).resolve()

    if not TILER.exists():
        print("Missing tiler:", TILER)
        sys.exit(1)

    if not regions_json_in.exists():
        print("Missing regions file:", regions_json_in)
        sys.exit(1)

    regions = json.loads(regions_json_in.read_text(encoding="utf-8"))


    print("\n=== COPYING REGIONS GEOJSON ===")
    #copy input regions geojson to output
    regions_json_out.parent.mkdir(parents=True, exist_ok=True)
    regions_json_out.write_text(regions_json_in.read_text(encoding="utf-8"), encoding="utf-8")



    # -------------------------------------------------
    # WORLD
    # -------------------------------------------------

    print("\n=== WORLD ===")

    build(
        WORLD_IMAGE_IN.with_suffix(".png"),
        WORLD_IMAGE_OUT(args.dev).with_suffix(".pmtiles"),
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

        def convert_region_layer(relative_file):
            input_file = normalize_in_file_path(relative_file).with_suffix(".png")
            output_file = normalize_out_file_path(relative_file).with_suffix(".pmtiles")

            print(f"\n=== REGION {region_id} ===")

            print(input_file)

            build(
                input_file,
                output_file,
                bounds,
                region["minZoom"],
                region["maxZoom"]
            )

        background = region.get("background")
        if background:
            convert_region_layer(background["imageUrl"])

        base = region.get("base")
        if base:
            convert_region_layer(base["imageUrl"])
        
        layers = region.get("layers", [])
        for layer in layers:
            layerType = layer.get("type")
            if layerType == "tiled":
                convert_region_layer(layer["imageUrl"])
            elif layerType == "single":
                # copy png file
                input_file = normalize_in_file_path(layer["imageUrl"]).with_suffix(".png")
                output_file = normalize_out_file_path(layer["imageUrl"]).with_suffix(".png")
                shutil.copy(input_file, output_file)
        

    relative_file = WORLD_ERODED_IN
    input_file = normalize_in_file_path(relative_file).with_suffix(".png")
    output_dir = normalize_out_file_path("height-tiles")

    print(f"\n=== HEIGHT {region_id} ===")

    print(input_file)

    run([
        sys.executable,
        str(DEMMER),
        "--input", str(input_file),
        "--output", str(output_dir),
        "--bounds",
        str(west),
        str(south),
        str(east),
        str(north)
    ])

    print("\nDONE")


if __name__ == "__main__":
    main()
