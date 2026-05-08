#!/usr/bin/env python3
"""
tile_pm.py

Stable raster → PMTiles pipeline (REALISTIC TOOLCHAIN)

Pipeline:
PNG
→ GeoTIFF (EPSG:4326)
→ Web Mercator GeoTIFF (EPSG:3857)
→ XYZ tiles (gdal2tiles)
→ MBTiles (mb-util)
→ PMTiles (pmtiles CLI)

Why this exists:
- pmtiles CLI ONLY accepts MBTiles (not directories)
- gdal MBTiles driver is unreliable for pyramids
- gdal2tiles ensures correct zoom coverage
"""

import argparse
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from osgeo import osr
osr.UseExceptions()

# =========================================================
# logging
# =========================================================

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


# =========================================================
# utils
# =========================================================

def run(cmd):
    log("RUN: " + " ".join(map(str, cmd)))
    t0 = time.time()
    subprocess.run(
        cmd,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    log(f"OK ({time.time() - t0:.1f}s)")


def need(name):
    if shutil.which(name) is None:
        raise RuntimeError(f"Missing dependency: {name}")


def validate_bounds(w, s, e, n):
    if s >= n:
        raise ValueError("south >= north")
    if w >= e:
        raise ValueError("west >= east")


# =========================================================
# STEP 1: GEOREFERENCE
# =========================================================

def georef(src, out_tif, w, s, e, n):
    section("STEP 1: GEOREFERENCE")

    run([
        "gdal_translate",
        "-of", "GTiff",
        "-a_srs", "EPSG:4326",
        "-a_ullr",
        str(w), str(n), str(e), str(s),
        "-co", "TILED=YES",
        "-co", "COMPRESS=DEFLATE",
        src,
        out_tif
    ])

    log(f"GeoTIFF: {out_tif}")


# =========================================================
# STEP 2: WARP
# =========================================================

def warp(src, out_tif):
    section("STEP 2: WARP → WEB MERCATOR")

    run([
        "gdalwarp",
        "-t_srs", "EPSG:3857",
        "-r", "bilinear",
        "-multi",
        "-wo", "NUM_THREADS=ALL_CPUS",
        "-dstalpha",
        "-co", "TILED=YES",
        "-co", "COMPRESS=DEFLATE",
        src,
        out_tif
    ])

    log(f"Warped: {out_tif}")


# =========================================================
# STEP 3: XYZ tiles
# =========================================================

def make_xyz(src_tif, out_dir, zmin, zmax):
    section("STEP 3: XYZ TILES")

    run([
        "gdal2tiles.py",
        "--xyz",
        "--processes=8",
        "--zoom",
        f"{zmin}-{zmax}",
        src_tif,
        out_dir
    ])

    log(f"XYZ tiles: {out_dir}")


# =========================================================
# STEP 4: XYZ → MBTILES
# =========================================================

def xyz_to_mbtiles(xyz_dir, mbtiles_path):
    section("STEP 4: MBTILES (mb-util)")

    run([
        "mb-util",
        "--scheme=xyz",
        str(xyz_dir),
        str(mbtiles_path)
    ])

    log(f"MBTiles: {mbtiles_path}")


# =========================================================
# STEP 5: MBTILES → PMTILES
# =========================================================

def mbtiles_to_pmtiles(mbtiles_path, out_pmtiles):
    section("STEP 5: PMTILES")

    run([
        "pmtiles",
        "convert",
        str(mbtiles_path),
        str(out_pmtiles)
    ])

    log(f"PMTiles: {out_pmtiles}")


# =========================================================
# MAIN
# =========================================================

def main():
    p = argparse.ArgumentParser()

    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--bounds", nargs=4, type=float, required=True)
    p.add_argument("--minzoom", type=int, default=0)
    p.add_argument("--maxzoom", type=int, default=6)

    args = p.parse_args()

    section("CHECK DEPENDENCIES")

    need("gdal_translate")
    need("gdalwarp")
    need("gdal2tiles.py")
    need("mb-util")
    need("pmtiles")

    src = Path(args.input).resolve()
    out = Path(args.output).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    validate_bounds(*args.bounds)

    w, s, e, n = args.bounds

    log(f"Input: {src}")
    log(f"Bounds: {w}, {s}, {e}, {n}")
    log(f"Zooms: {args.minzoom}-{args.maxzoom}")

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)

        geo = td / "geo.tif"
        warped = td / "warped.tif"
        xyz = td / "xyz"
        mb = td / "tiles.mbtiles"
        pm = out.with_suffix(".pmtiles")

        georef(src, geo, w, s, e, n)
        warp(geo, warped)

        make_xyz(warped, xyz, args.minzoom, args.maxzoom)
        xyz_to_mbtiles(xyz, mb)
        mbtiles_to_pmtiles(mb, pm)

    section("DONE")
    log(f"Output: {pm}")
    log(f"Total time: {elapsed()}")


if __name__ == "__main__":
    main()