import os
import numpy as np
from PIL import Image
import mercantile

# --------------------
# CONFIG
# --------------------
INPUT = "./jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height.png"
OUT = "./jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-tiles"

MIN_ELEV = 750
MAX_ELEV = 1500
MAX_ZOOM = 12

BBOX = {
    "west": -36.6552,
    "east": -32.5872,
    "south": 9.084375,
    "north": 14.54625
}

TILE_SIZE = 256

# --------------------
# LOAD HEIGHTMAP
# --------------------
img = Image.open(INPUT).convert("L")
height = np.array(img, dtype=np.float32)

h, w = height.shape

# --------------------
# SAMPLE HEIGHTMAP
# --------------------
def sample(x, y):
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
# MAP WORLD COORDS → LOCAL HEIGHTMAP SPACE
# --------------------
def world_to_local(lon, lat):
    nx = (lon - BBOX["west"]) / (BBOX["east"] - BBOX["west"])
    ny = (BBOX["north"] - lat) / (BBOX["north"] - BBOX["south"])
    return nx, ny

# --------------------
# TILE RENDER
# --------------------
def render_tile(z, x, y):
    tile = np.zeros((TILE_SIZE, TILE_SIZE, 3), dtype=np.uint8)

    bounds = mercantile.bounds(x, y, z)

    for py in range(TILE_SIZE):
        for px in range(TILE_SIZE):

            lon = bounds.west + (px / TILE_SIZE) * (bounds.east - bounds.west)
            lat = bounds.north - (py / TILE_SIZE) * (bounds.north - bounds.south)

            # 🔥 FIXED: use bbox mapping, not fake global projection
            nx, ny = world_to_local(lon, lat)

            # optional: clamp outside region
            if nx < 0 or nx > 1 or ny < 0 or ny > 1:
                tile[py, px] = (0, 0, 0)  # ocean / empty
                continue

            hval = sample(nx, ny)

            elev = MIN_ELEV + (hval / 255.0) * (MAX_ELEV - MIN_ELEV)
            tile[py, px] = encode_elevation(elev)

    return tile

# --------------------
# WRITE TILE
# --------------------
def write_tile(tile, z, x, y):
    path = f"{OUT}/{z}/{x}"
    os.makedirs(path, exist_ok=True)
    Image.fromarray(tile, mode="RGB").save(f"{path}/{y}.png")

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
        img = render_tile(t.z, t.x, t.y)
        write_tile(img, t.z, t.x, t.y)

print("Done.")