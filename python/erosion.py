import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

# -----------------------------
# Load / Save (16-bit safe)
# -----------------------------
def load_heightmap(path):
    img = Image.open(path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)

    R = arr[:, :, 0]
    G = arr[:, :, 1]
    B = arr[:, :, 2]

    # Mapbox terrain-rgb decode
    h = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000.0

    # Normalize to 0–1 for your pipeline
    h_min = h.min()
    h_max = h.max()

    return (h - h_min) / (h_max - h_min + 1e-8)


def save_heightmap(arr, path):
    arr = np.clip(arr, 0, 1)

    # Convert back to actual elevation range
    h = arr * 20000 - 10000  # adjust if needed

    val = (h + 10000) / 0.1

    R = np.floor(val / (256 * 256))
    G = np.floor((val - R * 256 * 256) / 256)
    B = np.floor(val - R * 256 * 256 - G * 256)

    rgb = np.stack([R, G, B], axis=-1).astype(np.uint8)

    Image.fromarray(rgb, mode="RGB").save(path)

# -----------------------------
# Multi-pass Gaussian blur
# -----------------------------
def smooth(h, passes=3, sigma=1.0):
    for _ in range(passes):
        h = gaussian_filter(h, sigma=sigma)
    return h

# -----------------------------
# Vectorized slope limiting
# -----------------------------
def limit_slope(h, max_slope=0.02, iterations=2):
    for _ in range(iterations):
        # Neighbor differences
        up    = h - np.roll(h, -1, axis=0)
        down  = h - np.roll(h,  1, axis=0)
        left  = h - np.roll(h, -1, axis=1)
        right = h - np.roll(h,  1, axis=1)

        # Clamp diffs
        up    = np.clip(up,   -max_slope, max_slope)
        down  = np.clip(down, -max_slope, max_slope)
        left  = np.clip(left, -max_slope, max_slope)
        right = np.clip(right,-max_slope, max_slope)

        # Reconstruct from neighbors (averaged)
        h_new = (
            np.roll(h + up,   1, axis=0) +
            np.roll(h + down, -1, axis=0) +
            np.roll(h + left, 1, axis=1) +
            np.roll(h + right,-1, axis=1)
        ) * 0.25

        h = h_new

    return h

# -----------------------------
# Vectorized thermal erosion
# -----------------------------
def thermal_erosion(h, talus=0.01, strength=0.25, iterations=30):
    for _ in range(iterations):
        h0 = h

        # Neighbor differences
        d_up    = h0 - np.roll(h0, -1, axis=0)
        d_down  = h0 - np.roll(h0,  1, axis=0)
        d_left  = h0 - np.roll(h0, -1, axis=1)
        d_right = h0 - np.roll(h0,  1, axis=1)

        # Only move material if above talus
        f_up    = np.maximum(d_up   - talus, 0)
        f_down  = np.maximum(d_down - talus, 0)
        f_left  = np.maximum(d_left - talus, 0)
        f_right = np.maximum(d_right- talus, 0)

        # Clamp total movement (THIS is the important part)
        total = f_up + f_down + f_left + f_right
        total = np.minimum(total, strength)

        # Avoid divide-by-zero
        mask = total > 0

        # Distribute proportionally
        f_up[mask]    *= total[mask] / (f_up[mask] + f_down[mask] + f_left[mask] + f_right[mask])
        f_down[mask]  *= total[mask] / (f_up[mask] + f_down[mask] + f_left[mask] + f_right[mask])
        f_left[mask]  *= total[mask] / (f_up[mask] + f_down[mask] + f_left[mask] + f_right[mask])
        f_right[mask] *= total[mask] / (f_up[mask] + f_down[mask] + f_left[mask] + f_right[mask])

        # Apply
        h = h0.copy()
        h -= (f_up + f_down + f_left + f_right)

        h += np.roll(f_up,    1, axis=0)
        h += np.roll(f_down, -1, axis=0)
        h += np.roll(f_left,  1, axis=1)
        h += np.roll(f_right,-1, axis=1)

    return h

# -----------------------------
# Pipeline
# -----------------------------
def process(input_path, output_path):
    h = load_heightmap(input_path)

    h = smooth(h, passes=30, sigma=1.0)
    h = limit_slope(h, max_slope=0.02, iterations=2)
    h = thermal_erosion(h, talus=0.01, iterations=30)
    h = smooth(h, passes=30, sigma=1.0)

    save_heightmap(h, output_path)


# -----------------------------
# Run
# -----------------------------
INPUT = "./jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height.png"
OUT = "./jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-eroded.png"

if __name__ == "__main__":
    process(INPUT, OUT)
