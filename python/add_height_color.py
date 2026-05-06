import sys
import numpy as np
from PIL import Image

# ----------------------------
# Helpers
# ----------------------------

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return np.array([int(hex_color[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float32)

def lerp(a, b, t):
    return a + (b - a) * t

def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)

# ----------------------------
# Palettes
# ----------------------------

LIGHT = {
    "water_deep":  "#2a5d9f",
    "water_shallow": "#4f88c6",
    "coast": "#d9d4a5",
    "low": "#4F8A4A",
    "mid": "#9FCB4F",
    "high": "#8B7A5A",
    "mountain": "#9A9A9A",
    "snow": "#F2F6FA",
}

DARK = {
    "water_deep":  "#0B1220",
    "water_shallow": "#1E3554",
    "coast": "#4A4A34",
    "low": "#2A4A36",
    "mid": "#3E5A2A",
    "high": "#5A5E48",
    "mountain": "#7A7A7A",
    "snow": "#C0CCD6",
}

# DARK = {
#     "water_deep":  "#0B1220",
#     "water_shallow": "#1E3554",
#     "coast": "#000000",
#     "low": "#FFFF00",
#     "mid": "#00FF00",
#     "high": "#FF00FF",
#     "mountain": "#FFFFFF",
#     "snow": "#008000",
# }

# Convert to RGB arrays
LIGHT = {k: hex_to_rgb(v) for k, v in LIGHT.items()}
DARK = {k: hex_to_rgb(v) for k, v in DARK.items()}

# ----------------------------
# Color mapping
# ----------------------------

SEA_LEVEL =   0.368625  # try 0.45 (more land) or 0.55 (more ocean)
COAST_WIDTH = 0.000001  # thickness of beaches


# ----------------------------
# Main
# ----------------------------

def render(height, palette):
    sea = SEA_LEVEL
    coast = SEA_LEVEL + COAST_WIDTH

    h, w = height.shape
    out = np.zeros((h, w, 3), dtype=np.float32)

    # -------------------------
    # WATER
    # -------------------------
    water_mask = height < sea
    t = np.zeros_like(height)
    t[water_mask] = np.divide(height[water_mask], sea, where=sea > 0)

    water = lerp(palette["water_deep"], palette["water_shallow"], t[..., None])
    out[water_mask] = water[water_mask]

    # -------------------------
    # LAND BASE
    # -------------------------
    land_mask = ~water_mask

    land_h = np.zeros_like(height)
    land_h[land_mask] = (height[land_mask] - coast) / (1.0 - coast)
    land_h = np.clip(land_h, 0, 1)

    # -------------------------
    # COAST
    # -------------------------
    coast_mask = (height >= sea) & (height < coast)
    out[coast_mask] = palette["coast"]

    # -------------------------
    # LOW → MID
    # -------------------------
    m1 = land_mask & (land_h < 0.025)
    t = np.zeros_like(height)
    t[m1] = smoothstep(0.0, 0.025, land_h[m1])
    out[m1] = lerp(palette["low"], palette["mid"], t[m1][..., None])

    # -------------------------
    # MID → HIGH
    # -------------------------
    m2 = land_mask & (land_h >= 0.025) & (land_h < 0.03)
    t = np.zeros_like(height)
    t[m2] = smoothstep(0.025, 0.03, land_h[m2])
    out[m2] = lerp(palette["mid"], palette["high"], t[m2][..., None])

    # -------------------------
    # HIGH → MOUNTAIN
    # -------------------------
    m3 = land_mask & (land_h >= 0.03) & (land_h < 0.1)
    t = np.zeros_like(height)
    t[m3] = smoothstep(0.03, 0.1, land_h[m3])
    out[m3] = lerp(palette["high"], palette["mountain"], t[m3][..., None])

    # -------------------------
    # MOUNTAIN → SNOW
    # -------------------------
    m4 = land_mask & (land_h >= 0.1) & (land_h < 0.3)
    t = np.zeros_like(height)
    t[m4] = smoothstep(0.1, 0.3, land_h[m4])
    out[m4] = lerp(palette["mountain"], palette["snow"], t[m4][..., None])

    # -------------------------
    # SNOW
    # -------------------------
    out[land_mask & (land_h >= 0.3)] = palette["snow"]

    return np.clip(out, 0, 255).astype(np.uint8)

def process(input_path):
    img = Image.open(input_path).convert("L")
    height = np.array(img).astype(np.float32) / 255.0

    light_img = Image.fromarray(render(height, LIGHT))
    dark_img = Image.fromarray(render(height, DARK))

    base = input_path.rsplit(".", 1)[0]
    light_img.save(f"{base}_light.png")
    dark_img.save(f"{base}_dark.png")

    print("Done:")
    print(f"  {base}_light.png")
    print(f"  {base}_dark.png")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python terrain_map.py input.png")
        sys.exit(1)

    process(sys.argv[1])