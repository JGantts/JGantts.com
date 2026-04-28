#!/usr/bin/env python3
"""
tile_map_fast.py

Adds:
- timestamped logging
- step timing
- command timing
- output file size
- fail-fast readable errors
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path


# ---------------------------------------------------
# logging
# ---------------------------------------------------

START_TIME = time.time()


def now():
    return time.strftime("%H:%M:%S")


def log(msg=""):
    print(f"[{now()}] {msg}", flush=True)


def section(title):
    print()
    log("=" * 60)
    log(title)
    log("=" * 60)


def elapsed():
    return f"{time.time() - START_TIME:.1f}s"


def filesize(path: Path):
    if not path.exists():
        return "missing"

    size = path.stat().st_size

    units = ["B", "KB", "MB", "GB"]
    i = 0

    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1

    return f"{size:.1f}{units[i]}"


# ---------------------------------------------------
# helpers
# ---------------------------------------------------

def run(cmd):
    cmd_str = " ".join(map(str, cmd))
    log(f"RUN: {cmd_str}")

    t0 = time.time()

    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        log(f"FAILED after {time.time() - t0:.1f}s")
        raise e

    log(f"OK ({time.time() - t0:.1f}s)")


def need(name):
    if shutil.which(name) is None:
        log(f"Missing executable: {name}")
        sys.exit(1)


# ---------------------------------------------------
# build helpers
# ---------------------------------------------------

def georef(src, out_tif, west, south, east, north):
    section("STEP 1: GEOREFERENCE IMAGE")

    run([
        "gdal_translate",
        "-of", "GTiff",
        "-a_srs", "EPSG:4326",
        "-a_ullr",
        str(west), str(north),
        str(east), str(south),
        str(src),
        str(out_tif)
    ])

    log(f"Created: {out_tif}")
    log(f"Size: {filesize(out_tif)}")


def mercator(src, out_tif):
    section("STEP 2: WARP TO WEB MERCATOR")

    run([
        "gdalwarp",
        "-multi",
        "-dstalpha",
        "-r", "bilinear",
        "-t_srs", "EPSG:3857",
        str(src),
        str(out_tif)
    ])

    log(f"Created: {out_tif}")
    log(f"Size: {filesize(out_tif)}")


def make_mbtiles(src_tif, out_mbtiles, zmin, zmax):
    section(f"STEP 3: BUILD MBTILES ({zmin}-{zmax})")

    run([
        str(Path(sys.executable).parent / "rio"),
        "mbtiles",
        str(src_tif),
        str(out_mbtiles),
        "--format", "PNG",
        "--zoom-levels", f"{zmin}..{zmax}"
    ])
    log(f"Created: {out_mbtiles}")
    log(f"Size: {filesize(out_mbtiles)}")


def make_pmtiles(src_mbtiles, out_pmtiles):
    section("STEP 4: CONVERT TO PMTILES")

    run([
        "pmtiles",
        "convert",
        str(src_mbtiles),
        str(out_pmtiles)
    ])

    log(f"Created: {out_pmtiles}")
    log(f"Size: {filesize(out_pmtiles)}")


# ---------------------------------------------------
# main
# ---------------------------------------------------

def main():
    p = argparse.ArgumentParser()

    p.add_argument("--input", required=True)

    p.add_argument("--output", required=True)

    p.add_argument(
        "--bounds",
        nargs=4,
        type=float,
        required=True,
        metavar=("WEST", "SOUTH", "EAST", "NORTH")
    )

    p.add_argument("--minzoom", type=int, default=0)
    p.add_argument("--maxzoom", type=int, default=12)

    args = p.parse_args()

    section("CHECKING DEPENDENCIES")

    need("gdal_translate")
    need("gdalwarp")
    need("pmtiles")

    src = Path(args.input).resolve()
    out = Path(args.output).resolve()
    out_dir = out.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    output = out.with_suffix(".pmtiles")

    west, south, east, north = args.bounds

    log(f"Input: {src}")
    log(f"Output: {output}")
    log(f"Bounds: {west}, {south}, {east}, {north}")
    log(f"Zooms: {args.minzoom}-{args.maxzoom}")

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)

        log(f"Temp dir: {td}")

        geo = td / "geo.tif"
        merc = td / "merc.tif"

        mb = td / "world.mbtiles"
        pm = output

        georef(src, geo, west, south, east, north)
        mercator(geo, merc)
        make_mbtiles(merc, mb, args.minzoom, args.maxzoom)
        make_pmtiles(mb, pm)

    section("DONE")

    log(f"Output: {pm}")
    log(f"Size: {filesize(pm)}")
    log(f"Total time: {elapsed()}")


if __name__ == "__main__":
    main()