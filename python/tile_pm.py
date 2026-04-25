#!/usr/bin/env python3
"""
tile_pm.py

Convert raster images into .pmtiles archives for MapLibre.

REQUIRES:
    pip install pillow
    pmtiles CLI installed:
        https://github.com/protomaps/go-pmtiles

ALSO requires one tiler:
    gdal2tiles.py   (recommended)
OR
    rio rgbify etc if DEM workflow

USAGE:

python make_pmtiles.py \
  --input ./assets/world.png \
  --output ./dist/world.pmtiles \
  --bounds -180 -85.05113 180 85.05113 \
  --minzoom 0 \
  --maxzoom 6

For a region:

python make_pmtiles.py \
  --input ./assets/ziemund.png \
  --output ./dist/ziemund.pmtiles \
  --bounds -40 10 -20 30 \
  --minzoom 4 \
  --maxzoom 10
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


# ---------------------------------------------------
# helpers
# ---------------------------------------------------

def run(cmd):
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True)


def require_binary(name):
    if shutil.which(name) is None:
        print(f"ERROR: Missing required executable: {name}")
        sys.exit(1)


def write_vrt_png(src_png: Path, vrt_path: Path, west, south, east, north):
    """
    Creates a georeferenced VRT for a plain PNG image.
    """
    from PIL import Image

    img = Image.open(src_png)
    width, height = img.size

    pixel_x = (east - west) / width
    pixel_y = (south - north) / height  # negative normally

    xml = f"""<VRTDataset rasterXSize="{width}" rasterYSize="{height}">
  <SRS>EPSG:4326</SRS>
  <GeoTransform>{west}, {pixel_x}, 0, {north}, 0, {pixel_y}</GeoTransform>

  <VRTRasterBand dataType="Byte" band="1">
    <SimpleSource>
      <SourceFilename relativeToVRT="1">{src_png.name}</SourceFilename>
      <SourceBand>1</SourceBand>
    </SimpleSource>
  </VRTRasterBand>

  <VRTRasterBand dataType="Byte" band="2">
    <SimpleSource>
      <SourceFilename relativeToVRT="1">{src_png.name}</SourceFilename>
      <SourceBand>2</SourceBand>
    </SimpleSource>
  </VRTRasterBand>

  <VRTRasterBand dataType="Byte" band="3">
    <SimpleSource>
      <SourceFilename relativeToVRT="1">{src_png.name}</SourceFilename>
      <SourceBand>3</SourceBand>
    </SimpleSource>
  </VRTRasterBand>

  <VRTRasterBand dataType="Byte" band="4">
    <SimpleSource>
      <SourceFilename relativeToVRT="1">{src_png.name}</SourceFilename>
      <SourceBand>4</SourceBand>
    </SimpleSource>
  </VRTRasterBand>
</VRTDataset>
"""
    vrt_path.write_text(xml, encoding="utf-8")


# ---------------------------------------------------
# main
# ---------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input raster PNG/JPG")
    parser.add_argument("--output", required=True, help="Output .pmtiles")
    parser.add_argument(
        "--bounds",
        nargs=4,
        type=float,
        metavar=("WEST", "SOUTH", "EAST", "NORTH"),
        required=True
    )
    parser.add_argument("--minzoom", type=int, default=0)
    parser.add_argument("--maxzoom", type=int, default=8)
    parser.add_argument("--tilesize", type=int, default=256)

    args = parser.parse_args()

    require_binary("gdalwarp")
    require_binary("gdal2tiles.py")
    require_binary("pmtiles")

    src = Path(args.input).resolve()
    out = Path(args.output).resolve()

    west, south, east, north = args.bounds

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)

        local_src = tmp / src.name
        shutil.copy(src, local_src)

        vrt = tmp / "source.vrt"
        merc = tmp / "mercator.tif"
        tile_dir = tmp / "tiles"

        print("Creating georeferenced VRT...")
        write_vrt_png(local_src, vrt, west, south, east, north)

        print("Warping to Web Mercator...")
        run([
            "gdalwarp",
            "-t_srs", "EPSG:3857",
            "-r", "bilinear",
            "-dstalpha",
            str(vrt),
            str(merc)
        ])

        print("Generating XYZ tiles...")
        run([
            "gdal2tiles.py",
            "--xyz",
            "--processes=4",
            "--zoom", f"{args.minzoom}-{args.maxzoom}",
            "--tilesize", str(args.tilesize),
            str(merc),
            str(tile_dir)
        ])

        print("Packing PMTiles...")
        out.parent.mkdir(parents=True, exist_ok=True)

        run([
            "pmtiles",
            "convert",
            str(tile_dir),
            str(out)
        ])

    print()
    print("Done:")
    print(out)


if __name__ == "__main__":
    main()