import numpy as np
from PIL import Image
import json
import time
from heapq import heapify, heappop, heappush
from numba import njit

# =========================================================
# CONFIG
# =========================================================
MIN_ELEV = 750
MAX_ELEV = 1500

DEBUG = True

def log(msg):
    if DEBUG:
        print(msg)

# =========================================================
# LOAD DEM (FIXED)
# =========================================================
def load_dem(path):
    img = Image.open(path).convert("L")

    dem = np.array(img, dtype=np.float32)
    dem /= 255.0

    dem = MIN_ELEV + dem * (MAX_ELEV - MIN_ELEV)

    # break quantization plateaus
    dem += np.random.normal(0, 0.05, dem.shape)

    log(f"[dem] min={dem.min():.2f} max={dem.max():.2f}")

    gy, gx = np.gradient(dem)
    slope = np.sqrt(gx**2 + gy**2)

    print("slope mean:", slope.mean())
    print("slope max:", slope.max())

    return dem


# =========================================================
# PIT FILL (FIXED)
# =========================================================
from collections import deque
import numpy as np
from heapq import heapify, heappop, heappush

def fill_pits_priority(dem):
    h, w = dem.shape
    filled = dem.copy()

    visited = np.zeros((h, w), dtype=np.bool_)

    heap = []
    queue = deque()

    # -----------------------------------------
    # Initialize border
    # -----------------------------------------
    for y in range(h):
        for x in range(w):
            if y == 0 or y == h-1 or x == 0 or x == w-1:
                heap.append((filled[y, x], y, x))
                visited[y, x] = True

    heapify(heap)

    dirs = [
        (-1,0),(1,0),(0,-1),(0,1),
        (-1,-1),(-1,1),(1,-1),(1,1)
    ]

    processed = 0

    # -----------------------------------------
    # Main loop
    # -----------------------------------------
    while heap or queue:

        if queue:
            y, x = queue.popleft()
            elev = filled[y, x]
        else:
            elev, y, x = heappop(heap)

        for dy, dx in dirs:
            ny, nx = y + dy, x + dx

            if ny < 0 or ny >= h or nx < 0 or nx >= w:
                continue

            if visited[ny, nx]:
                continue

            visited[ny, nx] = True
            processed += 1

            if filled[ny, nx] <= elev:
                # flood (no heap push!)
                filled[ny, nx] = elev
                queue.append((ny, nx))
            else:
                # boundary → heap
                heappush(heap, (filled[ny, nx], ny, nx))

        if processed % 1000000 == 0:
            print(f"[pitfill-fast] processed={processed}")

    print(f"[pitfill-fast] done processed={processed}")
    return filled

# =========================================================
# D8 FLOW
# =========================================================
@njit
def flow_d8(dem):
    h, w = dem.shape
    n = h * w

    out = np.full(n, -1, dtype=np.int32)

    dirs = np.array([
        (-1,0),(-1,1),(0,1),(1,1),
        (1,0),(1,-1),(0,-1),(-1,-1)
    ], dtype=np.int32)

    for y in range(1, h-1):
        for x in range(1, w-1):
            i = y * w + x
            z = dem[y, x]

            best_slope = 0.0
            best_idx = -1

            for d in range(8):
                dy, dx = dirs[d]
                ny, nx = y + dy, x + dx

                dz = z - dem[ny, nx]
                if dz < 0:
                    continue

                dist = 1.4142 if dy != 0 and dx != 0 else 1.0
                slope = dz / dist

                if slope > best_slope:
                    best_slope = slope
                    best_idx = ny * w + nx

            out[i] = best_idx

    return out


# =========================================================
# ACCUMULATION
# =========================================================
@njit
def accumulation_d8(flow_to):
    n = flow_to.shape[0]

    acc = np.ones(n, dtype=np.float32)
    indeg = np.zeros(n, dtype=np.int32)

    for i in range(n):
        j = flow_to[i]
        if j >= 0:
            indeg[j] += 1

    stack = []

    for i in range(n):
        if indeg[i] == 0:
            stack.append(i)

    while len(stack) > 0:
        i = stack.pop()
        j = flow_to[i]

        if j >= 0:
            acc[j] += acc[i]
            indeg[j] -= 1
            if indeg[j] == 0:
                stack.append(j)

    return acc

def fix_sinks(flow, dem):
    h, w = dem.shape
    flow = flow.copy()

    for y in range(1, h-1):
        for x in range(1, w-1):
            i = y * w + x

            if flow[i] != -1:
                continue

            z = dem[y, x]

            best_idx = -1
            best_dz = -1e9

            # find ANY lowest neighbor (even uphill slightly)
            for dy in [-1,0,1]:
                for dx in [-1,0,1]:
                    if dy == 0 and dx == 0:
                        continue

                    ny, nx = y+dy, x+dx
                    j = ny * w + nx

                    dz = z - dem[ny, nx]

                    if dz > best_dz:
                        best_dz = dz
                        best_idx = j

            flow[i] = best_idx

    return flow

# =========================================================
# TRACE RIVERS (FIXED)
# =========================================================
def trace_rivers_to_geojson(flow_to, acc, shape, min_flow, bounds, out_path):
    h, w = shape
    n = acc.shape[0]

    river_mask = acc >= min_flow

    upstream_count = np.zeros(n, dtype=np.uint16)

    for i in range(n):
        j = flow_to[i]
        if j >= 0 and river_mask[i]:
            upstream_count[j] += 1

    def px_to_ll(y, x):
        north, west = bounds[0]
        south, east = bounds[1]

        fx = x / (w - 1)
        fy = y / (h - 1)

        lon = west + fx * (east - west)
        lat = north + fy * (south - north)
        return [lon, lat]

    with open(out_path, "w") as f:
        f.write('{"type":"FeatureCollection","features":[\n')

        first = True

        for i in range(n):
            if not river_mask[i] or upstream_count[i] != 0:
                continue

            coords = []
            cur = i

            while True:
                if cur < 0 or cur >= n:
                    break

                if not river_mask[cur]:
                    break

                y, x = divmod(cur, w)
                coords.append(px_to_ll(y, x))

                nxt = flow_to[cur]
                if nxt < 0 or nxt == cur:
                    break

                cur = nxt

            if len(coords) < 20:
                continue

            if not first:
                f.write(",\n")
            first = False

            f.write(json.dumps({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                },
                "properties": {}
            }))

        f.write("\n]}")
# =========================================================
# GEOJSON
# =========================================================
def to_geojson(rivers, dem, bounds):
    h, w = dem.shape

    north, west = bounds[0]
    south, east = bounds[1]

    def px_to_ll(y, x):
        fx = x / (w - 1)
        fy = y / (h - 1)

        lon = west + fx * (east - west)
        lat = north + fy * (south - north)

        return [lon, lat]

    features = []

    for path in rivers:
        if len(path) < 2:
            continue

        coords = [px_to_ll(y, x) for (y, x) in path]

        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {"len": len(coords)}
        })

    return {"type": "FeatureCollection", "features": features}


# =========================================================
# PIPELINE
# =========================================================
def generate_rivers(path, out_path):
    t0 = time.time()

    dem = load_dem(path)

    log("[pipeline] pitfill")
    dem = fill_pits_priority(dem)

    flow = flow_d8(dem)
    flow = fix_sinks(flow, dem)

    acc = accumulation_d8(flow)
    acc = acc.reshape(dem.shape)

    log(f"[acc] max={acc.max():.2f}")

    min_flow = np.percentile(acc, 98)

    trace_rivers_to_geojson(
        flow,
        acc.ravel(),
        dem.shape,
        min_flow,
        [
            [BBOX["north"], BBOX["west"]],
            [BBOX["south"], BBOX["east"]]
        ],
        out_path
    )



# =========================================================
# RUN
# =========================================================
if __name__ == "__main__":
    IN = "./jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/height-eroded.png"
    OUT = "./jgantts-com/PUBLIC/assets/kovyalo/map/kovyalo/ziemund/rivers.geojson"

    BBOX = {
        "west": -36.6552,
        "east": -32.5872,
        "south": 9.084375,
        "north": 14.54625
    }

    bounds = [
        [BBOX["north"], BBOX["west"]],
        [BBOX["south"], BBOX["east"]]
    ]

    rivers, acc, dem = generate_rivers(IN, OUT)

    geo = to_geojson(rivers, dem, bounds)

    with open(OUT, "w") as f:
        json.dump(geo, f)

    print("rivers:", len(rivers))
