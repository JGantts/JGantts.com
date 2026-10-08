"""Exercise incremental orchestration without invoking the external raster tools."""
import contextlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import make_all_tiles as tiles


class IncrementalBuildTest(unittest.TestCase):
    def setUp(self):
        self.contexts = contextlib.ExitStack()
        self.addCleanup(self.contexts.close)
        self.root = Path(self.contexts.enter_context(tempfile.TemporaryDirectory()))
        self.source = self.root / "source"
        (self.source / "world").mkdir(parents=True)
        (self.source / "world/base.png").write_bytes(b"source raster")
        self.regions = self.source / "regions.json"
        self.config = {
            "world": {
                "id": "world",
                "zoom": {"min": 0, "max": 1},
                "base": {"type": "tiled"},
            },
            "regions": [],
        }
        self.regions.write_text(json.dumps(self.config))
        self.output = self.root / "output"
        self.staging = []
        original_temporary_directory = tempfile.TemporaryDirectory

        def temporary_directory():
            directory = original_temporary_directory(dir=self.root)
            self.staging.append(Path(directory.name))
            return directory

        for name, value in {
            "SRC_DIR": self.source,
            "REGIONS_JSON_IN": self.regions,
            "REGIONS_JSON_OUT": lambda dev: self.output / "geo-data/regions.json",
            "OUTPUT_DIR": lambda dev: self.output,
            "TILER": Path(tiles.__file__),
        }.items():
            self.contexts.enter_context(patch.object(tiles, name, value))
        self.contexts.enter_context(patch.object(tiles, "need"))
        self.contexts.enter_context(patch.object(tiles.sys, "argv", ["make_all_tiles.py", "--dev"]))
        self.contexts.enter_context(patch.object(tiles.tempfile, "TemporaryDirectory", temporary_directory))
        self.contexts.enter_context(contextlib.redirect_stdout(io.StringIO()))

        def build(source, output, bounds, minzoom, maxzoom):
            self.assertTrue(self.staging[-1].is_dir())
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(source.read_bytes())

        self.build = self.contexts.enter_context(patch.object(tiles, "build", side_effect=build))

    def test_dirty_then_unchanged_build_preserves_assets_and_copies_configuration(self):
        tiles.main()
        self.assertEqual(self.build.call_count, 1)
        asset = self.output / "world/base.pmtiles"
        modified = asset.stat().st_mtime_ns
        hashes = (self.output / tiles.HASH_FILE).read_bytes()
        # Emulate a clean CI checkout followed by restoration of the map cache.
        cache = self.root / "cache"
        shutil.copytree(self.output, cache)
        shutil.rmtree(self.output)
        shutil.copytree(cache, self.output)
        self.config["world"]["label"] = "Updated metadata only"
        self.config["world"]["dataSources"] = [{"kind": "towns", "points": [{
            "title": {"native": "餉", "latin": "adua"},
            "coordinates": [10, 20], "population": 1300,
        }]}]
        self.config["world"]["zoom"] = {
            "data": {"min": 0, "max": 1}, "display": {"min": 2, "max": 10},
        }
        self.regions.write_text(json.dumps(self.config))
        tiles.main()
        self.assertEqual(self.build.call_count, 1)
        self.assertEqual(asset.read_bytes(), b"source raster")
        self.assertEqual(asset.stat().st_mtime_ns, modified)
        self.assertEqual((self.output / tiles.HASH_FILE).read_bytes(), hashes)
        compiled = json.loads((self.output / "geo-data/regions.json").read_text())
        self.assertEqual(compiled['world']['dataSources'][0]['points'][0]['title']['hangul'], '아뚜아')
        self.assertNotIn('hangul', json.loads(self.regions.read_text())['world']['dataSources'][0]['points'][0]['title'])
        self.assertTrue(all(not directory.exists() for directory in self.staging))

    def test_changed_render_parameters_only_rebuild_the_affected_layer(self):
        (self.source / "world/overlay.png").write_bytes(b"overlay raster")
        self.config["world"]["layers"] = [{"id": "overlay", "type": "tiled"}]
        self.regions.write_text(json.dumps(self.config))
        tiles.main()
        self.build.reset_mock()
        self.config["world"]["base"]["bounds"] = [[60, -100], [-60, 100]]
        self.config["world"]["base"]["zoom"] = {"min": 0, "max": 2}
        self.regions.write_text(json.dumps(self.config))
        tiles.main()
        self.build.assert_called_once()
        self.assertEqual(self.build.call_args.args[0].name, "base.png")
        self.assertEqual(self.build.call_args.args[2:], ((-100, -60, 100, 60), 0, 2))

    def test_missing_output_is_rebuilt_even_when_its_hash_matches(self):
        tiles.main()
        (self.output / "world/base.pmtiles").unlink()
        self.build.reset_mock()
        tiles.main()
        self.build.assert_called_once()
        self.assertEqual((self.output / "world/base.pmtiles").read_bytes(), b"source raster")

    def test_failed_build_cleans_staging_and_leaves_existing_release_intact(self):
        tiles.main()
        hashes = (self.output / "build_hashes.json").read_bytes()
        (self.source / "world/base.png").write_bytes(b"changed raster")
        self.build.side_effect = RuntimeError("Tiler failed")
        with self.assertRaisesRegex(RuntimeError, "Tiler failed"):
            tiles.main()
        self.assertEqual((self.output / "build_hashes.json").read_bytes(), hashes)
        self.assertEqual((self.output / "world/base.pmtiles").read_bytes(), b"source raster")
        self.assertTrue(all(not directory.exists() for directory in self.staging))


if __name__ == "__main__":
    unittest.main()
