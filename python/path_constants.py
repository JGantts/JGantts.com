from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# input data
SRC_DIR = BASE_DIR / "../maps-sources"
WORLD_IMAGE_IN = SRC_DIR / "world"
WORLD_ERODED_IN = SRC_DIR / "world" / "height-grayscale.png"
REGIONS_JSON_IN = SRC_DIR / "geo-data/regions.json"

# outputs
OUTPUT_DIR_PROD = BASE_DIR / "../maps-rendered"
OUTPUT_DIR_DEV = BASE_DIR / "../jgantts-com/PUBLIC/assets/maps"
def OUTPUT_DIR(dev: bool) -> Path:
    base_dir = OUTPUT_DIR_DEV if dev else OUTPUT_DIR_PROD
    return base_dir
def WORLD_IMAGE_OUT(dev: bool) -> Path:
    base_dir = OUTPUT_DIR_DEV if dev else OUTPUT_DIR_PROD
    return base_dir / "world"
def REGIONS_JSON_OUT(dev: bool) -> Path:
    base_dir = OUTPUT_DIR_DEV if dev else OUTPUT_DIR_PROD
    return base_dir / "geo-data/regions.json"
