import os
import numpy as np
from PIL import Image
import mercantile

# --------------------
# CONFIG
# --------------------
INPUT = "../jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-eroded.png"
OUT = "../jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-tiles"

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
# SAMPLE HEIGHTMAP
# --------------------
def sample_bilinear(nx, ny):
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
    hval = sample_bilinear(nx, ny)

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