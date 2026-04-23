import os
import numpy as np
from PIL import Image
import mercantile

# --------------------
# CONFIG
# --------------------
INPUT = "./jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-eroded.png"
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
    bounds = mercantile.bounds(x, y, z)

    # Create normalized pixel grid [0,1)
    px = np.linspace(0, 1, TILE_SIZE, endpoint=False, dtype=np.float32)
    py = np.linspace(0, 1, TILE_SIZE, endpoint=False, dtype=np.float32)
    px_grid, py_grid = np.meshgrid(px, py)

    # Convert to lon/lat
    lon = bounds.west + px_grid * (bounds.east - bounds.west)
    lat = bounds.north - py_grid * (bounds.north - bounds.south)

    # Map to local heightmap space
    nx = (lon - BBOX["west"]) / (BBOX["east"] - BBOX["west"])
    ny = (BBOX["north"] - lat) / (BBOX["north"] - BBOX["south"])

    # Mask out-of-bounds
    mask = (nx >= 0) & (nx <= 1) & (ny >= 0) & (ny <= 1)

    # Convert to pixel indices
    ix = np.clip((nx * (w - 1)).astype(np.int32), 0, w - 1)
    iy = np.clip((ny * (h - 1)).astype(np.int32), 0, h - 1)

    # Sample heightmap
    hval = height[iy, ix]

    # Convert to elevation
    elev = MIN_ELEV + (hval / 255.0) * (MAX_ELEV - MIN_ELEV)

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