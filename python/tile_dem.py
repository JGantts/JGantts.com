import os
import numpy as np
from PIL import Image
import mercantile
import argparse
from pathlib import Path
import math

MIN_ELEV = 750
MAX_ELEV = 1500
MAX_ZOOM = 12

TILE_SIZE = 256

def mercator_to_lat(my):
    return np.degrees(np.arctan(np.sinh(my / 6378137.0)))

# --------------------
# SAMPLE HEIGHTMAP
# --------------------
def sample_bilinear(height, w, h, nx, ny):
    x = np.clip(nx * (w - 1), 0, w - 1)
    y = np.clip(ny * (h - 1), 0, h - 1)

    x0 = np.floor(x).astype(np.int32)
    x1 = np.clip(x0 + 1, 0, w - 1)
    y0 = np.floor(y).astype(np.int32)
    y1 = np.clip(y0 + 1, 0, h - 1)

    tx = x - x0
    ty = y - y0

    return (
        height[y0, x0] * (1 - tx) * (1 - ty) +
        height[y0, x1] * tx * (1 - ty) +
        height[y1, x0] * (1 - tx) * ty +
        height[y1, x1] * tx * ty
    )

def sample(height, x, y):
    x = np.clip(x, 0.0, 1.0)
    y = np.clip(y, 0.0, 1.0)

    ix = min(int(x * (w - 1)), w - 1)
    iy = min(int(y * (h - 1)), h - 1)

    return height[iy, ix]

# --------------------
# TERRAIN RGB ENCODING (Mapbox spec)
# --------------------
def encode_elevation(elev):
    val = int((elev + 10000) * 10)
    r = (val >> 16) & 255
    g = (val >> 8) & 255
    b = val & 255
    return r, g, b

# --------------------
# TILE RENDER
# --------------------
def render_tile(height, w, h, BBOX, z, x, y):
    bounds_m = mercantile.xy_bounds(x, y, z)

    px = np.linspace(0, 1, TILE_SIZE, endpoint=False, dtype=np.float32)
    py = np.linspace(0, 1, TILE_SIZE, endpoint=False, dtype=np.float32)
    px_grid, py_grid = np.meshgrid(px, py)

    # mercator meters
    mx = bounds_m.left + px_grid * (bounds_m.right - bounds_m.left)
    my = bounds_m.top - py_grid * (bounds_m.top - bounds_m.bottom)

    # lon from mercator x
    lon = mx * 180.0 / 20037508.34

    # lat from mercator y
    lat = mercator_to_lat(my)

    # Map to local heightmap space
    nx = (lon - BBOX["west"]) / (BBOX["east"] - BBOX["west"])
    ny = 1.0 - ((lat - BBOX["south"]) / (BBOX["north"] - BBOX["south"]))

    # Mask out-of-bounds
    mask = (nx >= 0) & (nx <= 1) & (ny >= 0) & (ny <= 1)

    # Convert to pixel indices
    ix = np.clip((nx * (w - 1)).astype(np.int32), 0, w - 1)
    iy = np.clip((ny * (h - 1)).astype(np.int32), 0, h - 1)

    # Sample heightmap
    hval = sample_bilinear(height, w, h, nx, ny)

    # Convert to elevation
    elev = MIN_ELEV + hval * (MAX_ELEV - MIN_ELEV)

    # Encode (Mapbox terrain RGB)
    val = ((elev + 10000) * 10).astype(np.int32)

    tile = np.zeros((TILE_SIZE, TILE_SIZE, 3), dtype=np.uint8)
    tile[..., 0] = (val >> 16) & 255
    tile[..., 1] = (val >> 8) & 255
    tile[..., 2] = val & 255

    # Apply mask (outside bbox = black)
    # sea level (roughly)
    val = int((0 + 10000) * 10)
    tile[~mask] = [
    (val >> 16) & 255,
    (val >> 8) & 255,
    val & 255
    ]

    return tile

# --------------------
# WRITE TILE
# --------------------
def write_tile(OUT, tile, z, x, y):
    path = f"{OUT}/{z}/{x}"
    os.makedirs(path, exist_ok=True)
    Image.fromarray(tile, mode="RGB").save(f"{path}/{y}.png")

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

    args = p.parse_args()

    INPUT = args.input # "../jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-eroded.png"
    OUT = args.output # "../jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-tiles"

    BBOX = {
        "west": args.bounds[0],
        "south": args.bounds[1],
        "east": args.bounds[2],
        "north": args.bounds[3]
    }

    # --------------------
    # LOAD HEIGHTMAP
    # --------------------
    # --------------------
    # LOAD HEIGHTMAP (SMART)
    # --------------------
    img = Image.open(INPUT)
    arr = np.array(img)

    if arr.ndim == 3:
        # RGB / RGBA → assume terrain-rgb encoding
        R = arr[:, :, 0].astype(np.float32)
        G = arr[:, :, 1].astype(np.float32)
        B = arr[:, :, 2].astype(np.float32)

        height = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000.0

    elif arr.dtype == np.uint16:
        # true 16-bit grayscale
        height = arr.astype(np.float32)

    else:
        # fallback (you probably screwed up earlier)
        height = arr.astype(np.float32)

    h, w = height.shape

    # normalize ONCE (optional, but consistent)
    h_min = height.min()
    h_max = height.max()
    height = (height - h_min) / (h_max - h_min + 1e-8)

    # --------------------
    # GENERATE
    # --------------------
    for z in range(MAX_ZOOM + 1):
        print(f"Generating zoom {z}...")

        tiles = mercantile.tiles(
            BBOX["west"],
            BBOX["south"],
            BBOX["east"],
            BBOX["north"],
            z
        )

        for t in tiles:
            img = render_tile(height, w, h, BBOX, t.z, t.x, t.y)
            write_tile(OUT, img, t.z, t.x, t.y)

    print("Done.")

if __name__ == "__main__":
    main()