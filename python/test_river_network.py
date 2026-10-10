import unittest
import numpy as np
from river_network import (artwork_graph, repair_graph, accumulate, display_areas,
                           local_catchments, line_chunks)


class RiverNetworkTest(unittest.TestCase):
    def test_confluences_accumulate_and_braids_conserve_area(self):
        # Two tributaries merge, split around an island, and meet at the lake.
        xy = np.array([[0, 0], [4, 0], [2, 2], [1, 4], [3, 4], [2, 6]], dtype=float)
        edges = [(0, 2), (1, 2), (2, 3), (2, 4), (3, 5), (4, 5)]
        local = np.array([10, 20, 5, 0, 0, 0], dtype=float)
        directed, area, flux, graph = accumulate(xy, edges, 5, local)
        self.assertEqual(area[2], 35)
        self.assertAlmostEqual(area[5], local.sum())
        self.assertAlmostEqual(flux[2] + flux[3], 35)
        self.assertAlmostEqual(flux[4] + flux[5], 35)
        self.assertTrue(np.all(flux > 0))
        smoothed = display_areas(edges, flux, graph)
        self.assertTrue(np.all(np.isfinite(smoothed)))
        self.assertGreater(smoothed.min(), 0)
        self.assertLessEqual(smoothed.max(), flux.max())
        self.assertEqual(sum(len(ids) for _, ids in line_chunks(xy, edges)), len(edges))

    def test_unreviewed_gaps_are_not_automatically_extended(self):
        xy = np.array([[0, 0], [1, 0], [3, 0], [4, 0]], dtype=float)
        with self.assertRaisesRegex(ValueError, 'disconnected'):
            accumulate(xy, [(0, 1), (2, 3)], 3, np.ones(4))

    def test_reviewed_repairs_cannot_cross_black_territory_or_stale_locations(self):
        xy = np.array([[1, 2], [5, 2]], dtype=float)
        terrain = np.full((8, 8, 4), 255, dtype=np.uint8)
        guide = {'outletPixel': [5, 2], 'junctionRepairs': [[[1, 2], [5, 2]]]}
        edges, outlet, repairs = repair_graph(xy, [], guide, terrain)
        self.assertEqual(edges, [(0, 1)])
        self.assertEqual(outlet, 1)
        self.assertEqual(repairs[0]['pixels'], 4)
        terrain[2, 3, 3] = 0
        with self.assertRaisesRegex(ValueError, 'unexplored'):
            repair_graph(xy, [], guide, terrain)
        guide['junctionRepairs'] = [[[1, 6], [5, 6]]]
        with self.assertRaisesRegex(ValueError, 'no longer matches'):
            repair_graph(xy, [], guide, terrain)

    def test_source_footprint_is_preserved_and_black_headwater_tails_are_clipped(self):
        river = np.zeros((12, 12, 4), dtype=np.uint8)
        river[1:11, 6, 3] = 255
        terrain = np.full_like(river, 255)
        terrain[:4, :, 3] = 0
        xy, edges, clipped = artwork_graph(river, terrain)
        self.assertEqual(clipped, 3)
        self.assertTrue(np.all(xy[:, 1] >= 4))
        self.assertTrue(np.all(river[xy[:, 1].astype(int), xy[:, 0].astype(int), 3] == 255))
        self.assertEqual(len(edges), len(xy) - 1)

    def test_catchments_conserve_land_area_and_respect_a_topographic_divide(self):
        terrain = np.zeros((20, 20, 4), dtype=np.uint8)
        terrain[..., :] = [60, 150, 65, 255]
        # A central high ridge separates two river valleys.
        elevation = np.tile(np.array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
                                      100, 90, 80, 70, 60, 50, 40, 30, 20, 10], dtype=np.uint8), (20, 1))
        xy = np.array([[0, 10], [19, 10]], dtype=float)
        local, audit = local_catchments(xy, elevation, terrain, [0, 0, 1, 1], scale=1)
        self.assertEqual(audit['unassignedLandCells'], 0)
        self.assertAlmostEqual(local[0], local[1], places=8)
        self.assertAlmostEqual(local.sum(), audit['contributingAreaKm2'])
        self.assertTrue(12300 < local.sum() < 12400)


if __name__ == '__main__':
    unittest.main()
