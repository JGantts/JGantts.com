import unittest
import numpy as np
from shapely.geometry import Point, LineString
from shapely.ops import unary_union
from classify_boundaries import classify_provinces, derive_boundaries, skeleton_lines


class BoundaryClassificationTest(unittest.TestCase):
    def artwork(self):
        guide = np.zeros((64, 64, 4), dtype=np.uint8)
        colors = [(250, 150, 45), (90, 180, 245), (210, 130, 250), (245, 130, 140)]
        for index, (ys, xs) in enumerate([(slice(8, 32), slice(8, 32)), (slice(8, 32), slice(32, 56)),
                                         (slice(32, 56), slice(8, 32)), (slice(32, 56), slice(32, 56))]):
            guide[ys, xs, :3] = colors[index]
            guide[ys, xs, 3] = 255
        # Relief changes brightness inside each province without changing its hue.
        gradient = np.linspace(0.25, 1, 64)[None, :, None]
        guide[..., :3] = (guide[..., :3] * gradient).astype(np.uint8)
        border = np.zeros_like(guide)
        border[23:26, 6:59, 3] = 255
        border[39:42, 6:59, 3] = 255
        return guide, border

    def test_four_provinces_ignore_relief_and_keep_country_footprint(self):
        guide, _ = self.artwork()
        labels = classify_provinces(guide, 4)
        np.testing.assert_array_equal(labels > 0, guide[..., 3] >= 128)
        self.assertEqual(len(set(labels[y, x] for y, x in [(16, 16), (16, 48), (48, 16), (48, 48)])), 4)
        for ys, xs in [(slice(8, 32), slice(8, 32)), (slice(8, 32), slice(32, 56)),
                       (slice(32, 56), slice(8, 32)), (slice(32, 56), slice(32, 56))]:
            self.assertEqual(len(np.unique(labels[ys, xs])), 1)

    def test_country_province_and_county_geometry_preserves_artwork_and_junctions(self):
        guide, border = self.artwork()
        originals = guide.copy(), border.copy()
        result = derive_boundaries(guide, border, 4)
        country = unary_union(result['national'])
        provinces = unary_union(result['provincial'])
        self.assertEqual(country.bounds, (8, 8, 56, 56))
        for point in [(32, 16), (32, 48), (16, 32), (48, 32)]:
            self.assertEqual(provinces.distance(Point(point)), 0)
        self.assertEqual(len(result['county']), 4)
        parents = unary_union([country, provinces])
        for line in result['county']:
            self.assertTrue(all(23 <= y <= 26 or 39 <= y <= 42 for _, y in line.coords))
            self.assertEqual(parents.distance(Point(line.coords[0])), 0)
            self.assertEqual(parents.distance(Point(line.coords[-1])), 0)
            self.assertTrue(all(8 <= x <= 56 and 8 <= y <= 56 for x, y in line.coords))
        np.testing.assert_array_equal(guide, originals[0])
        np.testing.assert_array_equal(border, originals[1])

    def test_tracing_retains_closed_loops_without_duplicate_edges(self):
        mask = np.zeros((12, 12), dtype=bool)
        mask[2, 2:10] = mask[9, 2:10] = True
        mask[2:10, 2] = mask[2:10, 9] = True
        lines = list(skeleton_lines(mask))
        self.assertEqual(len(lines), 1)
        self.assertTrue(lines[0].is_ring)
        self.assertGreater(lines[0].length, 20)

    def test_mismatched_source_dimensions_fail_instead_of_reprojecting_geography(self):
        guide, border = self.artwork()
        with self.assertRaisesRegex(ValueError, 'matching dimensions'):
            derive_boundaries(guide, border[:32], 4)


if __name__ == '__main__':
    unittest.main()
