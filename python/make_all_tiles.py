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
import os
import shutil
import subprocess
import sys
from pathlib import Path
import tempfile

TILER = Path("./tile_pm.py").resolve()
DEMMER = Path("./tile_dem.py").resolve()

from path_constants import SRC_DIR, WORLD_IMAGE_IN, WORLD_ERODED_IN, WORLD_IMAGE_OUT, REGIONS_JSON_IN, OUTPUT_DIR, REGIONS_JSON_OUT

# ---------------------------------------------------
# helpers
# ---------------------------------------------------



def get_layer_path(region_configs, region, layer_id):
    def get_region_by_id(region_id):
        if not region_id:
            return None
        return next((r for r in region_configs if r["id"] == region_id), None)

    def get_region_parent(region):
        return get_region_by_id(region.get("parentId"))

    parents = []
    curr = region

    while curr:
        parents.append(curr)
        curr = get_region_parent(curr)

    path = "/".join(r["id"] for r in reversed(parents)) + "/" + layer_id

    return path

def run(cmd):
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True, stdout=sys.stdout, stderr=sys.stderr)
   
def normalize_in_file_path(path):
    p = Path(path)
    if p.is_absolute():
        return p
    return SRC_DIR / p

def make_out_file_path(args):
    def out_file_path():
        base = OUTPUT_DIR(args.dev)
        return base
    return out_file_path

def make_temp_out_dir():
    with tempfile.TemporaryDirectory() as temp_dir:
        def temp_out_file_path(path):
            base = temp_dir
            p = Path(path)
            if p.is_absolute():
                return p
            return base / p
        def get_temp_dir():
            return temp_dir
        return (temp_out_file_path, get_temp_dir)

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

def make_convert_region_layer(regions, region, temp_out_file_path):
    bounds_raw_region = region.get("bounds")
    zoom_region = region.get("zoom")

    def convert_region_layer(layer, id):
        def get_bounds_from_raw(raw):
            north = raw[0][0]
            west = raw[0][1]
            south = raw[1][0]
            east = raw[1][1]

            bounds = (west, south, east, north)
            return bounds

        bounds_raw_layer = layer.get("bounds")
        bounds = None
        if bounds_raw_layer:
            bounds = get_bounds_from_raw(bounds_raw_layer)
        elif bounds_raw_region:
            bounds = get_bounds_from_raw(bounds_raw_region)
        else:
            bounds = get_bounds_from_raw([[85.05113, -180], [-85.05113, 180]])

        zoom_layer = layer.get("zoom")
        zoom = None
        if zoom_layer:
            zoom = zoom_layer
        else:
            zoom = zoom_region

        zooms = None
        if zoom.get("data"):
            zooms = zoom
        else:
            zooms = {
                "data": zoom,
                "display": zoom
            }
        print (zooms)

        relative_file = get_layer_path(regions, region, id)
        if not relative_file:
            print(f"\n=== file {relative_file} not found ===")
            return

        input_file = normalize_in_file_path(relative_file).with_suffix(".png")
        output_file = temp_out_file_path(relative_file).with_suffix(".pmtiles")

        print(input_file)

        build(
            input_file,
            output_file,
            bounds,
            zooms["data"]["min"],
            zooms["data"]["max"]
        )

        if layer.get("hasDark"):
            input_file_dark = normalize_in_file_path(relative_file + "-dark").with_suffix(".png")
            output_file_dark = temp_out_file_path(relative_file + "-dark").with_suffix(".pmtiles")

            print(input_file_dark)

            build(
                input_file_dark,
                output_file_dark,
                bounds,
                zooms["data"]["min"],
                zooms["data"]["max"]
            )

    return convert_region_layer

# ---------------------------------------------------
# main
# ---------------------------------------------------

def main():
    p = argparse.ArgumentParser()

    p.add_argument("--dev", action="store_true")

    args = p.parse_args()

    out_file_path = make_out_file_path(args)
    (temp_out_file_path, get_temp_dir) = make_temp_out_dir()


    regions_json_in = Path(REGIONS_JSON_IN).resolve()
    regions_json_out = Path(REGIONS_JSON_OUT(args.dev)).resolve()

    if not TILER.exists():
        print("Missing tiler:", TILER)
        sys.exit(1)

    if not regions_json_in.exists():
        print("Missing regions file:", regions_json_in)
        sys.exit(1)

    world_file = json.loads(regions_json_in.read_text(encoding="utf-8"))

    world = world_file["world"]
    regions = world_file["regions"]

    def make_convertLayer(convert_region_layer):
        def convertLayer(layer, id):
            layerType = layer.get("type")
            if layerType == "tiled":
                convert_region_layer(layer, id)
            elif layerType == "single":
                # copy png file
                layerPath = get_layer_path(regions, region, id)
                input_file = normalize_in_file_path(layerPath).with_suffix(".png")
                output_file = temp_out_file_path(layerPath).with_suffix(".png")
                os.makedirs(os.path.dirname(output_file), exist_ok=True)
                shutil.copy(input_file, output_file)
                if layer.get("hasDark"):
                    # copy dark png file
                    input_file_dark = normalize_in_file_path(layerPath+"-dark").with_suffix(".png")
                    output_file_dark = temp_out_file_path(layerPath+"-dark").with_suffix(".png")
                    shutil.copy(input_file_dark, output_file_dark)
        return convertLayer

    # -------------------------------------------------
    # REGIONS
    # -------------------------------------------------

    def convertRegion(region):
        convert_region_layer = make_convert_region_layer(regions, region, temp_out_file_path)
        convertLayer = make_convertLayer(convert_region_layer)
        region_id = region["id"]

        print(f"\n=== REGION {region_id} ===")
     
        convert_region_layer = make_convert_region_layer(regions, region, temp_out_file_path)

        background = region.get("background")
        if background:
            convertLayer(background, "background")

        base = region.get("base")
        if base:
            convertLayer(base, "base")
        
        layers = region.get("layers", [])
        for layer in layers:
            convertLayer(layer, layer["id"])

    convertRegion(world)

    for region in regions:
        convertRegion(region)

    relative_file = WORLD_ERODED_IN
    input_file = normalize_in_file_path(relative_file).with_suffix(".png")
    output_dir = temp_out_file_path("height-tiles")

    print(f"\n=== HEIGHT ===")

    print(input_file)

    run([
        sys.executable,
        str(DEMMER),
        "--input", str(input_file),
        "--output", str(output_dir),
        "--bounds",
        str(-36.6552), #hardcoded for now, it's Ziemund
        str(9.084375),
        str(-32.5872),
        str(14.54625)
    ])

    print("\n=== COPYING COMPILED IMAGES ===")
    #copy results
    temp_dir = get_temp_dir()
    output_dir = out_file_path()
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir) 
    shutil.copytree(temp_dir, output_dir)

    print("\n=== COPYING REGIONS GEOJSON ===")
    #copy input regions geojson to output
    regions_json_out.parent.mkdir(parents=True, exist_ok=True)
    regions_json_out.write_text(regions_json_in.read_text(encoding="utf-8"), encoding="utf-8")


    print("\nDONE")


if __name__ == "__main__":
    main()
