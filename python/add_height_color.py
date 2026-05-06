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

def colorize(height, palette):
    """
    height: 0.0 → 1.0
    """
    sea = SEA_LEVEL
    coast = SEA_LEVEL + COAST_WIDTH

    # Water
    if height < sea:
        t = height / sea if sea > 0 else 0
        return lerp(palette["water_deep"], palette["water_shallow"], t)

    # Coast
    if height < coast:
        return palette["coast"]

    land_h = (height - coast) / (1.0 - coast)
    land_h = np.clip(land_h, 0, 1)

    # Land
    low = 0
    mid = 0.025
    high = 0.03
    mountain = 0.1
    snow = 0.3
    if land_h < mid:
        t = smoothstep(low, mid, land_h)
        return lerp(palette["low"], palette["mid"], t)

    if land_h < high:
        t = smoothstep(mid, high, land_h)
        return lerp(palette["mid"], palette["high"], t)

    if land_h < mountain:
        t = smoothstep(high, mountain, land_h)
        return lerp(palette["high"], palette["mountain"], t)

    if land_h < snow:
        t = smoothstep(mountain, snow, land_h)
        return lerp(palette["mountain"], palette["snow"], t)
    
    return palette["snow"]


# ----------------------------
# Main
# ----------------------------

def process(input_path):
    img = Image.open(input_path).convert("L")
    height = np.array(img).astype(np.float32) / 255.0

    h, w = height.shape

    def render(palette):
        out = np.zeros((h, w, 3), dtype=np.float32)

        for y in range(h):
            for x in range(w):
                c = colorize(height[y, x], palette)
                out[y, x] = c

        return np.clip(out, 0, 255).astype(np.uint8)

    light_img = Image.fromarray(render(LIGHT))
    dark_img = Image.fromarray(render(DARK))

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