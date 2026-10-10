"""Derive display linework from existing political artwork; never edit source PNGs.

The guide's alpha defines the inhabited country footprint, its distinct hues
identify provinces, and the remaining drawn border strokes identify counties.
All extraction/simplification tolerances are in source pixels, not degrees.
"""
from pathlib import Path
import json
import math

import numpy as np
from PIL import Image
from scipy import ndimage
from rasterio.features import shapes
from shapely.geometry import shape, LineString, Point
from shapely.ops import unary_union, nearest_points, linemerge
from skimage.morphology import skeletonize

VERSION = 1
SIMPLIFY_PIXELS = 0.6
JUNCTION_PIXELS = 4


def classify_provinces(rgba, count):
    """Cluster hue (independent of relief brightness), preserving the alpha mask."""
    rgb = rgba[..., :3].astype(np.float32)
    hue = np.arctan2(math.sqrt(3) * (rgb[..., 1] - rgb[..., 2]),
                     2 * rgb[..., 0] - rgb[..., 1] - rgb[..., 2])
    land = rgba[..., 3] >= 128
    sample = hue[::8, ::8][land[::8, ::8]]
    if sample.size < count:
        raise ValueError('Political guide has too few opaque pixels')
    bins, edges = np.histogram(sample, bins=360, range=(-math.pi, math.pi))
    angles = (edges[:-1] + edges[1:]) / 2
    centers = []
    remaining = bins.copy()
    for _ in range(count):
        center = angles[remaining.argmax()]
        if remaining.max() == 0:
            raise ValueError('Political guide has fewer distinct hues than provinceCount')
        centers.append(center)
        distance = np.abs(np.angle(np.exp(1j * (angles - center))))
        remaining[distance < math.radians(20)] = 0
    centers = np.array(centers)
    for _ in range(8):
        distance = np.abs(np.angle(np.exp(1j * (sample[:, None] - centers))))
        memberships = distance.argmin(axis=1)
        centers = np.array([math.atan2(np.sin(sample[memberships == i]).mean(),
                                     np.cos(sample[memberships == i]).mean()) for i in range(count)])
    labels = np.zeros(land.shape, dtype=np.uint8)
    # Process rows to bound temporary memory on the full-resolution source.
    for y in range(0, land.shape[0], 128):
        block = hue[y:y + 128]
        distance = np.abs(np.angle(np.exp(1j * (block[..., None] - centers))))
        labels[y:y + 128] = np.where(land[y:y + 128], distance.argmin(axis=-1) + 1, 0)
    return labels


def line_parts(geometry):
    if geometry.is_empty:
        return
    if geometry.geom_type in ('LineString', 'LinearRing'):
        yield LineString(geometry.coords)
    elif hasattr(geometry, 'geoms'):
        for part in geometry.geoms:
            yield from line_parts(part)


def skeleton_lines(mask):
    """Trace each undirected skeleton edge once, including closed county loops."""
    thin = skeletonize(mask)
    height, width = thin.shape
    pixels = set(np.flatnonzero(thin).tolist())

    def neighbors(index):
        y, x = divmod(index, width)
        result = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if not (dx or dy) or not (0 <= x + dx < width and 0 <= y + dy < height):
                    continue
                other = index + dy * width + dx
                if other not in pixels:
                    continue
                # Avoid triangular graph edges where an orthogonal connection exists.
                if dx and dy and (index + dx in pixels or index + dy * width in pixels):
                    continue
                result.append(other)
        return result

    adjacency = {index: neighbors(index) for index in pixels}
    visited = set()
    starts = sorted(pixels, key=lambda index: (len(adjacency[index]) == 2, index))
    for start in starts:
        for following in adjacency[start]:
            edge = tuple(sorted((start, following)))
            if edge in visited:
                continue
            path = [start]
            previous, current = start, following
            visited.add(edge)
            while True:
                path.append(current)
                if current == start or len(adjacency[current]) != 2:
                    break
                candidates = [p for p in adjacency[current] if p != previous]
                nxt = candidates[0]
                edge = tuple(sorted((current, nxt)))
                if edge in visited:
                    break
                visited.add(edge)
                previous, current = current, nxt
            if len(path) >= 2:
                yield LineString([(p % width + 0.5, p // width + 0.5) for p in path])


def derive_boundaries(guide, border, province_count):
    if guide.shape != border.shape:
        raise ValueError('Political guide and border raster must have matching dimensions')
    labels = classify_provinces(guide, province_count)
    land = labels != 0
    country = unary_union([shape(geometry) for geometry, value in shapes(land.astype(np.uint8), mask=land) if value])
    provinces = []
    for value in range(1, province_count + 1):
        mask = labels == value
        provinces.append(unary_union([shape(geometry) for geometry, _ in shapes(mask.astype(np.uint8), mask=mask)]))
    national = country.boundary
    provincial = unary_union([provinces[i].boundary.intersection(provinces[j].boundary)
                              for i in range(province_count) for j in range(i + 1, province_count)])
    # Pairwise intersections can also contain isolated point contacts. Extract
    # only the lines before merging their degree-two vertices into whole paths.
    provincial = linemerge(list(line_parts(provincial)))

    # Remove strokes that already belong to the national/provincial boundary.
    # This is classification, not a new interpretation of the boundary's path.
    maximum = ndimage.maximum_filter(labels, size=JUNCTION_PIXELS * 2 + 1)
    minimum = ndimage.minimum_filter(labels, size=JUNCTION_PIXELS * 2 + 1)
    near_boundary = maximum != minimum
    county_mask = (border[..., 3] >= 80) & land & ~near_boundary
    parent_lines = unary_union([national, provincial])
    counties = []
    for line in skeleton_lines(county_mask):
        if line.length < 2:
            continue
        coordinates = list(line.coords)
        # Restore junctions trimmed by the classification band, terminating
        # exactly on their existing parent boundary rather than leaving gaps.
        for index in (0, -1):
            endpoint = Point(coordinates[index])
            if endpoint.distance(parent_lines) <= JUNCTION_PIXELS + 2:
                coordinates[index] = nearest_points(endpoint, parent_lines)[1].coords[0]
        counties.append(LineString(coordinates))
    return {'national': list(line_parts(national)), 'provincial': list(line_parts(provincial)), 'county': counties}


def generate_boundaries(guide_path, border_path, output_path, bounds, province_count=4):
    guide = np.array(Image.open(guide_path).convert('RGBA'))
    border = np.array(Image.open(border_path).convert('RGBA'))
    height, width = guide.shape[:2]
    west, south, east, north = bounds
    features = []
    for kind, lines in derive_boundaries(guide, border, province_count).items():
        for line in lines:
            simplified = line.simplify(SIMPLIFY_PIXELS, preserve_topology=True)
            coordinates = [[west + x / width * (east - west), north + y / height * (south - north)]
                           for x, y in simplified.coords]
            features.append({'type': 'Feature', 'properties': {'boundaryType': kind},
                             'geometry': {'type': 'LineString', 'coordinates': coordinates}})
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')) + '\n')
    return {kind: sum(feature['properties']['boundaryType'] == kind for feature in features)
            for kind in ('national', 'provincial', 'county')}
