#!/usr/bin/env python3
"""
make_all_tiles.py

Incremental tile builder.

Behavior:
- Reads previous build hashes from output/build_hashes.json
- Walks regions.json and computes hashes for every source + settings
- Only rebuilds dirty outputs
- Writes updated hashes back to output dir

Usage:

python3 make_all_tiles.py --dev
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

TILER = Path("./tile_pm.py").resolve()
DEMMER = Path("./tile_dem.py").resolve()

from path_constants import (
    SRC_DIR,
    WORLD_IMAGE_IN,
    WORLD_ERODED_IN,
    WORLD_IMAGE_OUT,
    REGIONS_JSON_IN,
    OUTPUT_DIR,
    REGIONS_JSON_OUT
)

# ---------------------------------------------------
# incremental build config
# ---------------------------------------------------

HASH_FILE = "build_hashes.json"
BUILD_VERSION = 1

# ---------------------------------------------------
# helpers
# ---------------------------------------------------

def need(name):
    if shutil.which(name) is None:
        raise RuntimeError(f"Missing dependency: {name}")

def run(cmd):
    print(">", " ".join(map(str, cmd)))
    subprocess.run(cmd, check=True, stdout=sys.stdout, stderr=sys.stderr)

def normalize_in_file_path(path):
    p = Path(path)
    if p.is_absolute():
        return p
    return SRC_DIR / p

def make_out_file_path(args):
    def out_file_path():
        return OUTPUT_DIR(args.dev)
    return out_file_path

def make_temp_out_dir():
    with tempfile.TemporaryDirectory() as temp_dir:

        def temp_out_file_path(path):
            p = Path(path)

            if p.is_absolute():
                return p

            return Path(temp_dir) / p

        def get_temp_dir():
            return temp_dir

        return (temp_out_file_path, get_temp_dir)

# ---------------------------------------------------
# hashing
# ---------------------------------------------------

def sha256_file(path):
    h = hashlib.sha256()

    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)

            if not chunk:
                break

            h.update(chunk)

    return h.hexdigest()

def stable_json_hash(obj):
    encoded = json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":")
    ).encode("utf-8")

    return hashlib.sha256(encoded).hexdigest()

def load_old_hashes(output_dir):
    hash_path = Path(output_dir) / HASH_FILE

    if not hash_path.exists():
        return {}

    try:
        return json.loads(hash_path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def save_hashes(output_dir, hashes):
    hash_path = Path(output_dir) / HASH_FILE

    hash_path.parent.mkdir(parents=True, exist_ok=True)

    hash_path.write_text(
        json.dumps(hashes, indent=2, sort_keys=True),
        encoding="utf-8"
    )

def make_build_hash(
    *,
    input_file,
    bounds,
    minzoom=None,
    maxzoom=None,
    layer_type=None,
    dark=False,
    extra=None
):
    payload = {
        "build_version": BUILD_VERSION,
        "input_hash": sha256_file(input_file),
        "bounds": bounds,
        "minzoom": minzoom,
        "maxzoom": maxzoom,
        "layer_type": layer_type,
        "dark": dark,
        "extra": extra or {},
    }

    return stable_json_hash(payload)

# ---------------------------------------------------
# geo helpers
# ---------------------------------------------------

def warp(src, out_png, bounds):
    west, south, east, north = bounds

    with tempfile.TemporaryDirectory() as td:
        georef_tif = Path(td) / "georef.tif"
        warped_tif = Path(td) / "warped.tif"

        run([
            "gdal_translate",
            "-of", "GTiff",
            "-a_srs", "EPSG:4326",
            "-a_ullr",
            str(west),
            str(north),
            str(east),
            str(south),
            str(src),
            str(georef_tif)
        ])

        run([
            "gdalwarp",
            "-t_srs", "EPSG:3857",
            "-r", "bilinear",
            "-multi",
            "-wo", "NUM_THREADS=ALL_CPUS",
            "-dstalpha",
            "-overwrite",
            str(georef_tif),
            str(warped_tif)
        ])

        os.makedirs(Path(out_png).parent, exist_ok=True)

        run([
            "gdal_translate",
            "-of", "PNG",
            str(warped_tif),
            str(out_png)
        ])

def build(input_file, output_file, bounds, minzoom, maxzoom):
    west, south, east, north = bounds

    os.makedirs(Path(output_file).parent, exist_ok=True)

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
# region helpers
# ---------------------------------------------------

def get_layer_path(region_configs, region, layer_id):

    def get_region_by_id(region_id):
        if not region_id:
            return None

        return next(
            (r for r in region_configs if r["id"] == region_id),
            None
        )

    def get_region_parent(region):
        return get_region_by_id(region.get("parentId"))

    parents = []
    curr = region

    while curr:
        parents.append(curr)
        curr = get_region_parent(curr)

    return "/".join(r["id"] for r in reversed(parents)) + "/" + layer_id

def get_bounds_from_raw(raw):
    north = raw[0][0]
    west = raw[0][1]
    south = raw[1][0]
    east = raw[1][1]

    return (west, south, east, north)

# ---------------------------------------------------
# main
# ---------------------------------------------------

def main():

    p = argparse.ArgumentParser()

    p.add_argument("--dev", action="store_true")

    args = p.parse_args()

    need("gdalwarp")
    need("gdal_translate")

    out_file_path = make_out_file_path(args)

    final_output_dir = out_file_path()

    old_hashes = load_old_hashes(final_output_dir)
    new_hashes = {}

    build_queue = []

    def enqueue_if_needed(
        *,
        key,
        build_hash,
        build_fn
    ):
        new_hashes[key] = build_hash

        old_hash = old_hashes.get(key)

        if old_hash != build_hash:
            print(f"[DIRTY] {key}")
            build_queue.append(build_fn)
        else:
            print(f"[SKIP ] {key}")

    (temp_out_file_path, get_temp_dir) = make_temp_out_dir()

    regions_json_in = Path(REGIONS_JSON_IN).resolve()
    regions_json_out = Path(REGIONS_JSON_OUT(args.dev)).resolve()

    if not TILER.exists():
        print("Missing tiler:", TILER)
        sys.exit(1)

    if not regions_json_in.exists():
        print("Missing regions file:", regions_json_in)
        sys.exit(1)

    world_file = json.loads(
        regions_json_in.read_text(encoding="utf-8")
    )

    world = world_file["world"]
    regions = world_file["regions"]

    # -------------------------------------------------
    # layer converters
    # -------------------------------------------------

    def make_convert_region_layer(regions, region):

        bounds_raw_region = region.get("bounds")
        zoom_region = region.get("zoom")

        def convert_region_layer(layer, layer_id):

            bounds_raw_layer = layer.get("bounds")

            if bounds_raw_layer:
                bounds = get_bounds_from_raw(bounds_raw_layer)
            elif bounds_raw_region:
                bounds = get_bounds_from_raw(bounds_raw_region)
            else:
                bounds = (
                    -180,
                    -85.05113,
                    180,
                    85.05113
                )

            zoom_layer = layer.get("zoom")

            if zoom_layer:
                zoom = zoom_layer
            else:
                zoom = zoom_region

            if zoom.get("data"):
                zooms = zoom
            else:
                zooms = {
                    "data": zoom,
                    "display": zoom
                }

            relative_file = get_layer_path(
                regions,
                region,
                layer_id
            )

            input_file = normalize_in_file_path(
                relative_file
            ).with_suffix(".png")

            output_file = temp_out_file_path(
                relative_file
            ).with_suffix(".pmtiles")

            build_hash = make_build_hash(
                input_file=input_file,
                bounds=bounds,
                minzoom=zooms["data"]["min"],
                maxzoom=zooms["data"]["max"],
                layer_type="tiled",
                dark=False
            )

            enqueue_if_needed(
                key=str(relative_file),
                build_hash=build_hash,
                build_fn=lambda
                    i=input_file,
                    o=output_file,
                    b=bounds,
                    z=zooms:
                        build(
                            i,
                            o,
                            b,
                            z["data"]["min"],
                            z["data"]["max"]
                        )
            )

            if layer.get("hasDark"):

                input_file_dark = normalize_in_file_path(
                    relative_file + "-dark"
                ).with_suffix(".png")

                output_file_dark = temp_out_file_path(
                    relative_file + "-dark"
                ).with_suffix(".pmtiles")

                build_hash_dark = make_build_hash(
                    input_file=input_file_dark,
                    bounds=bounds,
                    minzoom=zooms["data"]["min"],
                    maxzoom=zooms["data"]["max"],
                    layer_type="tiled",
                    dark=True
                )

                enqueue_if_needed(
                    key=str(relative_file + "-dark"),
                    build_hash=build_hash_dark,
                    build_fn=lambda
                        i=input_file_dark,
                        o=output_file_dark,
                        b=bounds,
                        z=zooms:
                            build(
                                i,
                                o,
                                b,
                                z["data"]["min"],
                                z["data"]["max"]
                            )
                )

        return convert_region_layer

    def make_convert_layer(convert_region_layer, region):

        def convert_layer(layer, layer_id):

            layer_type = layer.get("type")

            if layer_type == "tiled":

                convert_region_layer(layer, layer_id)

            elif layer_type == "single":

                layer_path = get_layer_path(
                    regions,
                    region,
                    layer_id
                )

                input_file = normalize_in_file_path(
                    layer_path
                ).with_suffix(".png")

                output_file = temp_out_file_path(
                    layer_path
                ).with_suffix(".png")

                bounds_raw_layer = layer.get("bounds")
                bounds_raw_region = region.get("bounds")

                if bounds_raw_layer:
                    bounds = get_bounds_from_raw(bounds_raw_layer)
                elif bounds_raw_region:
                    bounds = get_bounds_from_raw(bounds_raw_region)
                else:
                    bounds = (
                        -180,
                        -85.05113,
                        180,
                        85.05113
                    )

                build_hash = make_build_hash(
                    input_file=input_file,
                    bounds=bounds,
                    layer_type="single",
                    dark=False
                )

                enqueue_if_needed(
                    key=str(layer_path),
                    build_hash=build_hash,
                    build_fn=lambda
                        i=input_file,
                        o=output_file,
                        b=bounds:
                            warp(
                                str(i),
                                str(o),
                                b
                            )
                )

                if layer.get("hasDark"):

                    input_file_dark = normalize_in_file_path(
                        layer_path + "-dark"
                    ).with_suffix(".png")

                    output_file_dark = temp_out_file_path(
                        layer_path + "-dark"
                    ).with_suffix(".png")

                    build_hash_dark = make_build_hash(
                        input_file=input_file_dark,
                        bounds=bounds,
                        layer_type="single",
                        dark=True
                    )

                    enqueue_if_needed(
                        key=str(layer_path + "-dark"),
                        build_hash=build_hash_dark,
                        build_fn=lambda
                            i=input_file_dark,
                            o=output_file_dark,
                            b=bounds:
                                warp(
                                    str(i),
                                    str(o),
                                    b
                                )
                    )

        return convert_layer

    # -------------------------------------------------
    # regions
    # -------------------------------------------------

    def convert_region(region):

        region_id = region["id"]

        print(f"\n=== REGION {region_id} ===")

        convert_region_layer = make_convert_region_layer(
            regions,
            region
        )

        convert_layer = make_convert_layer(
            convert_region_layer,
            region
        )

        background = region.get("background")

        if background:
            convert_layer(background, "background")

        base = region.get("base")

        if base:
            convert_layer(base, "base")

        layers = region.get("layers", [])

        for layer in layers:
            convert_layer(layer, layer["id"])

    # -------------------------------------------------
    # scan
    # -------------------------------------------------

    convert_region(world)

    for region in regions:
        convert_region(region)

    # -------------------------------------------------
    # process build queue
    # -------------------------------------------------

    print("\n=== PROCESSING BUILD QUEUE ===")

    for fn in build_queue:
        fn()

    # -------------------------------------------------
    # copy compiled results
    # -------------------------------------------------

    print("\n=== COPYING COMPILED IMAGES ===")

    temp_dir = get_temp_dir()
    output_dir = out_file_path()

    os.makedirs(output_dir, exist_ok=True)

    shutil.copytree(
        temp_dir,
        output_dir,
        dirs_exist_ok=True
    )

    # -------------------------------------------------
    # save hashes
    # -------------------------------------------------

    print("\n=== SAVING HASHES ===")

    save_hashes(output_dir, new_hashes)

    # -------------------------------------------------
    # copy regions json
    # -------------------------------------------------

    print("\n=== COPYING REGIONS GEOJSON ===")

    regions_json_out.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    regions_json_out.write_text(
        regions_json_in.read_text(encoding="utf-8"),
        encoding="utf-8"
    )

    print("\nDONE")

if __name__ == "__main__":
    main()