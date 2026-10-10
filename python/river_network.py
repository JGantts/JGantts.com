"""Display hydrology constrained to existing river artwork and reviewed repairs.

Contributing area is estimated by marker-controlled watershed of the existing
height raster, then accumulated through the mapped network toward its supplied
outlet. It is a cartographic runoff proxy, not measured discharge. No new river
courses or terrain are generated. Coordinates in the guide are source pixels.
"""
from pathlib import Path
import json
import math

import numpy as np
from PIL import Image
from scipy import ndimage, sparse
from scipy.sparse.csgraph import connected_components, dijkstra
from scipy.spatial import cKDTree
from shapely.geometry import LineString
from skimage.morphology import skeletonize
from skimage.segmentation import watershed


def artwork_graph(river, terrain):
    original = skeletonize(river[..., 3] >= 32)
    mask = original & (terrain[..., 3] >= 128)
    yx = np.argwhere(mask)
    lookup = {tuple(point): i for i, point in enumerate(yx)}
    edges = []
    for i, (y, x) in enumerate(yx):
        for dy, dx in ((0, 1), (1, -1), (1, 0), (1, 1)):
            j = lookup.get((y + dy, x + dx))
            if j is None:
                continue
            if dx and dy and ((y, x + dx) in lookup or (y + dy, x) in lookup):
                continue
            edges.append((i, j))
    return yx[:, ::-1].astype(float), edges, int(original.sum() - mask.sum())


def repair_graph(xy, edges, guide, terrain):
    """Apply only individually reviewed gap repairs; never infer new connections."""
    tree = cKDTree(xy)
    result = list(edges)
    repairs = []
    for pair in guide.get('junctionRepairs', []):
        distance, indices = tree.query(pair)
        if np.max(distance) > 2:
            raise ValueError(f'River repair no longer matches source artwork: {pair}')
        a, b = map(int, indices)
        length = float(np.linalg.norm(xy[a] - xy[b]))
        if length > guide.get('maximumRepairPixels', 18):
            raise ValueError(f'River repair exceeds reviewed gap tolerance: {pair}')
        samples = np.rint(np.linspace(xy[a], xy[b], max(2, math.ceil(length * 2)))).astype(int)
        if not np.all(terrain[samples[:, 1], samples[:, 0], 3] >= 128):
            raise ValueError(f'River repair crosses unexplored territory: {pair}')
        result.append((a, b))
        repairs.append({'from': xy[a].tolist(), 'to': xy[b].tolist(), 'pixels': length})
    distance, outlet = tree.query(guide['outletPixel'])
    if distance > 2:
        raise ValueError('River outlet no longer matches source artwork')
    return list(dict.fromkeys(tuple(sorted(edge)) for edge in result)), int(outlet), repairs


def graph_matrix(xy, edges):
    pairs = np.array(edges, dtype=int)
    lengths = np.linalg.norm(xy[pairs[:, 0]] - xy[pairs[:, 1]], axis=1)
    return sparse.csr_matrix((np.r_[lengths, lengths],
        (np.r_[pairs[:, 0], pairs[:, 1]], np.r_[pairs[:, 1], pairs[:, 0]])), shape=(len(xy), len(xy)))


def subdivide_repairs(xy, edges):
    """Give reviewed bridges the same spatial sampling as original pixel paths."""
    points = xy.tolist()
    result = []
    for a, b in edges:
        length = float(np.linalg.norm(xy[a] - xy[b]))
        steps = math.ceil(length) if length > 1.5 else 1
        previous = a
        for step in range(1, steps):
            current = len(points)
            points.append((xy[a] + (xy[b] - xy[a]) * step / steps).tolist())
            result.append((previous, current)); previous = current
        result.append((previous, b))
    return np.array(points), result


def local_catchments(xy, elevation, terrain, bounds, scale=4):
    """Partition existing terrain into catchments draining to mapped stream cells.

    The marker-controlled flood conditions local pits to the known river network.
    It does not edit the source DEM. Coarse-cell areas account for latitude.
    """
    height, width = elevation.shape
    rows, cols = math.ceil(height / scale), math.ceil(width / scale)
    dem = np.array(Image.fromarray(elevation).resize((cols, rows), Image.Resampling.BOX), dtype=float)
    land = np.array(Image.fromarray(terrain[..., 3]).resize((cols, rows), Image.Resampling.NEAREST)) >= 128
    markers = np.zeros((rows, cols), dtype=np.int32)
    cells = np.floor((xy + 0.5) * [cols / width, rows / height]).astype(int)
    cells[:, 0] = np.clip(cells[:, 0], 0, cols - 1)
    cells[:, 1] = np.clip(cells[:, 1], 0, rows - 1)
    markers[cells[:, 1], cells[:, 0]] = np.arange(1, len(xy) + 1)
    land[cells[:, 1], cells[:, 0]] = True
    catchments = watershed(dem, markers, connectivity=2, mask=land)
    west, south, east, north = bounds
    latitude = np.radians(north + (np.arange(rows) + 0.5) / rows * (south - north))
    row_area = (6371.0088 ** 2 * abs(math.radians(east - west) / cols)
                * abs(math.radians(north - south) / rows) * np.cos(latitude))
    area = np.broadcast_to(row_area[:, None], (rows, cols)).copy()
    # The blue lake receives runoff but does not contribute terrestrial area.
    colors = np.array(Image.fromarray(terrain).resize((cols, rows), Image.Resampling.NEAREST)).astype(int)
    water = (colors[..., 2] > colors[..., 1] + 5) & (colors[..., 1] > colors[..., 0] + 10)
    area[water | ~land] = 0
    local = np.bincount(catchments.ravel(), weights=area.ravel(), minlength=len(xy) + 1)[1:]
    return local, {'contributingAreaKm2': float(local.sum()), 'catchmentGrid': [cols, rows],
                   'unassignedLandCells': int(np.count_nonzero(land & (catchments == 0)))}


def accumulate(xy, edges, outlet, local):
    graph = graph_matrix(xy, edges)
    count, _ = connected_components(graph, directed=False)
    if count != 1:
        raise ValueError(f'River network has {count} disconnected components; review source gaps before rendering')
    distance = dijkstra(graph, directed=False, indices=outlet)
    # A strict potential orders every edge, including equal-distance braid nodes.
    order = np.lexsort((np.arange(len(xy)), distance))
    rank = np.empty(len(xy), dtype=int); rank[order] = np.arange(len(xy))
    outgoing = [[] for _ in xy]
    directed = []
    for i, (a, b) in enumerate(edges):
        if rank[a] < rank[b]:
            a, b = b, a
        outgoing[a].append((b, i))
        directed.append((a, b))
    area = local.copy()
    flow = np.zeros(len(edges))
    for a in order[::-1]:
        targets = outgoing[a]
        if not targets:
            if a != outlet:
                raise ValueError('River orientation produced an inland terminal')
            continue
        # Braid branches split flux; downstream confluences add it again.
        weights = np.array([max(1e-6, (distance[a] - distance[b]) / np.linalg.norm(xy[a] - xy[b])) for b, _ in targets])
        weights /= weights.sum()
        for (b, i), weight in zip(targets, weights):
            flow[i] = area[a] * weight
            area[b] += flow[i]
    return directed, area, flow, graph


def display_areas(edges, flow, graph, iterations=120):
    """Smooth only the display proxy over short distances; keep raw flux intact."""
    values = np.zeros(graph.shape[0])
    for (a, b), amount in zip(edges, flow):
        values[a] = max(values[a], amount)
        values[b] = max(values[b], amount)
    values = np.log1p(values)
    adjacency = graph.copy()
    adjacency.data = 1 / adjacency.data
    average = sparse.diags(1 / np.asarray(adjacency.sum(axis=1)).ravel()) @ adjacency
    for _ in range(iterations):
        values = 0.5 * values + 0.5 * (average @ values)
    return np.expm1(values)


def line_chunks(xy, edges, maximum_length=8):
    adjacency = [[] for _ in xy]
    for i, (a, b) in enumerate(edges):
        adjacency[a].append((b, i)); adjacency[b].append((a, i))
    visited = set()
    for start in sorted(range(len(xy)), key=lambda i: (len(adjacency[i]) == 2, i)):
        for following, edge in adjacency[start]:
            if edge in visited:
                continue
            nodes, edge_ids, length = [start], [], 0.0
            previous, current, current_edge = start, following, edge
            while True:
                visited.add(current_edge)
                nodes.append(current); edge_ids.append(current_edge)
                length += float(np.linalg.norm(xy[previous] - xy[current]))
                terminal = current == start or len(adjacency[current]) != 2
                if terminal or length >= maximum_length:
                    yield nodes, edge_ids
                    nodes, edge_ids, length = [current], [], 0.0
                if terminal:
                    break
                nxt, nxt_edge = next((p, e) for p, e in adjacency[current] if p != previous)
                if nxt_edge in visited:
                    break
                previous, current, current_edge = current, nxt, nxt_edge


def generate_rivers(river_path, terrain_path, height_path, guide_path, output_path, bounds):
    river = np.array(Image.open(river_path).convert('RGBA'))
    terrain = np.array(Image.open(terrain_path).convert('RGBA'))
    elevation = np.array(Image.open(height_path).convert('L'))
    if river.shape != terrain.shape or river.shape[:2] != elevation.shape:
        raise ValueError('River, terrain, and height artwork must have matching dimensions')
    guide = json.loads(Path(guide_path).read_text())
    xy, edges, clipped = artwork_graph(river, terrain)
    edges, outlet, repairs = repair_graph(xy, edges, guide, terrain)
    xy, edges = subdivide_repairs(xy, edges)
    ox, oy = xy[outlet].astype(int)
    red, green, blue, alpha = map(int, terrain[oy, ox])
    if guide['outletType'] != 'lake' or not (alpha >= 128 and blue > green + 5 and green > red + 10):
        raise ValueError('The reviewed river outlet must overlap the existing blue lake artwork')
    local, audit = local_catchments(xy, elevation, terrain, bounds, guide.get('catchmentScale', 4))
    directed, accumulated, flow, graph = accumulate(xy, edges, outlet, local)
    smooth = display_areas(edges, flow, graph, guide.get('smoothingIterations', 120))
    west, south, east, north = bounds
    height, width = elevation.shape
    features = []
    for nodes, edge_ids in line_chunks(xy, edges, guide.get('maximumSegmentPixels', 4)):
        line = LineString(xy[nodes] + 0.5).simplify(0.35)
        coordinates = [[round(west + x / width * (east - west), 8), round(north + y / height * (south - north), 8)] for x, y in line.coords]
        features.append({'type': 'Feature', 'properties': {
            'flowAreaKm2': round(float(np.mean(flow[edge_ids])), 4),
            'displayAreaKm2': round(float(np.mean(smooth[nodes])), 4)},
            'geometry': {'type': 'LineString', 'coordinates': coordinates}})
    endpoint_ids = np.flatnonzero(np.diff(graph.indptr) == 1)
    if outlet not in endpoint_ids:
        raise ValueError('The reviewed lake outlet must be an endpoint of the existing river')
    audit.update({'model': 'Height-raster catchments conditioned to mapped rivers; contributing area proxy, not measured discharge',
        'outletPixel': xy[outlet].tolist(), 'outletType': guide['outletType'],
        'outletAccumulationKm2': float(accumulated[outlet]), 'repairs': repairs,
        'clippedUnexploredSkeletonPixels': clipped, 'networkComponents': 1,
        'headwaters': int(len(endpoint_ids) - 1), 'edges': len(edges), 'features': len(features),
        'maximumDisplayAreaKm2': float(smooth.max())})
    output = Path(output_path); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'type': 'FeatureCollection', 'features': features, 'hydrology': audit}, separators=(',', ':')) + '\n')
    return audit
