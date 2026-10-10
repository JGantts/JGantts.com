"""Verify the real source artwork, including reviewed joins and outlet semantics."""
from pathlib import Path
import json
import tempfile
import unittest

import numpy as np
from PIL import Image
from scipy import ndimage
from river_network import generate_rivers


class RiverArtworkTest(unittest.TestCase):
    def test_ziemund_network_preserves_paths_and_drains_to_existing_lake(self):
        source = Path(__file__).resolve().parent.parent / 'maps-sources/kovyalo/ziemund'
        bounds = [-36.6552, 9.084375, -32.5872, 14.54625]
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'rivers.geojson'
            audit = generate_rivers(source / 'rivers.png', source / 'base.png', source / 'height.png',
                                    source / 'rivers-network.json', output, bounds)
            data = json.loads(output.read_text())
        self.assertEqual(audit['networkComponents'], 1)
        self.assertEqual(audit['outletType'], 'lake')
        self.assertEqual(audit['unassignedLandCells'], 0)
        self.assertEqual(len(audit['repairs']), 8)
        self.assertAlmostEqual(audit['outletAccumulationKm2'], audit['contributingAreaKm2'], places=6)
        self.assertGreater(audit['clippedUnexploredSkeletonPixels'], 0)
        base = np.array(Image.open(source / 'base.png').convert('RGBA'))
        rivers = np.array(Image.open(source / 'rivers.png').convert('RGBA'))
        height, width = base.shape[:2]
        river_distance = ndimage.distance_transform_edt(rivers[..., 3] < 32)
        black_distance = ndimage.distance_transform_edt(base[..., 3] < 128)
        raw_areas = []
        for feature in data['features']:
            coordinates = np.array(feature['geometry']['coordinates'])
            xy = (coordinates - [bounds[0], bounds[3]]) / [bounds[2] - bounds[0], bounds[1] - bounds[3]] * [width, height]
            # Inspect entire segments, including the reviewed gap bridges.
            samples = np.concatenate([np.linspace(a, b, max(2, int(np.linalg.norm(a - b) * 2))) for a, b in zip(xy[:-1], xy[1:])])
            pixels = np.floor(samples).astype(int)
            self.assertTrue(np.all(black_distance[pixels[:, 1], pixels[:, 0]] <= 1), 'A river was extended into black territory')
            self.assertTrue(np.all(river_distance[pixels[:, 1], pixels[:, 0]] <= 8), 'A rendered path left the artwork/short repair band')
            raw_areas.append(feature['properties']['flowAreaKm2'])
        self.assertGreater(max(raw_areas), 1000 * np.percentile(raw_areas, 10))
        ox, oy = audit['outletPixel']
        red, green, blue, alpha = map(int, base[int(oy), int(ox)])
        self.assertEqual(alpha, 255)
        self.assertGreater(blue, green)
        self.assertGreater(green, red)


if __name__ == '__main__':
    unittest.main()
