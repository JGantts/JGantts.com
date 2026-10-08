import copy
import unittest
import unicodedata
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from generate_town_hangul import deployment_regions, generate_towns, latin_to_hangul


class RomanizationTests(unittest.TestCase):
    def test_deployment_outputs_feed_map_without_changing_source(self):
        source = {'world': {'id': 'world'}, 'regions': [{'id': 'example', 'dataSources': [
            {'kind': 'towns', 'points': [
                {'title': {'native': '日그', 'latin': "lóega'k", 'hangul': 'old'},
                 'coordinates': [1, 2], 'population': 8},
            ]},
        ]}]}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_path = root / 'source.json'
            source_path.write_text(json.dumps(source))
            original = source_path.read_bytes()
            command = [sys.executable, str(Path(__file__).with_name('generate_town_hangul.py')),
                       '--source', str(source_path), '--output', str(root / 'towns.json'),
                       '--regions-output', str(root / 'regions.json')]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            deployed = json.loads((root / 'regions.json').read_text())
            source['regions'][0]['dataSources'][0]['points'][0]['title']['hangul'] = '초\u0301까그'
            self.assertEqual(deployed, source)
            self.assertEqual(source_path.read_bytes(), original)
            rows = json.loads((root / 'towns.json').read_text())
            self.assertEqual(rows[0]['town'], deployed['regions'][0]['dataSources'][0]['points'][0])
            # Invalid source must fail before overwriting the last good artifact.
            source['regions'][0]['dataSources'][0]['points'][0]['title']['latin'] = 'invalid!'
            source_path.write_text(json.dumps(source))
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Cannot deploy invalid town readings', result.stderr)
            self.assertEqual(json.loads((root / 'regions.json').read_text()), deployed)

    def test_region_titles_are_compiled_without_modifying_source(self):
        source = {'world': {'title': 'World'}, 'regions': [
            {'id': 'ziemund', 'title': {'native': 'Ziemúnd', 'latin': 'siemund'}},
        ]}
        original = copy.deepcopy(source)
        compiled = deployment_regions(source, generate_towns(source))
        self.assertEqual(compiled['regions'][0]['title']['hangul'], '세문뜨')
        self.assertEqual(source, original)

    def test_deployment_rejects_missing_latin(self):
        source = {'id': 'region', 'dataSources': [{'kind': 'towns', 'points': [{'title': {'native': 'x'}}]}]}
        with self.assertRaisesRegex(ValueError, 'Missing latin field'):
            deployment_regions(source, generate_towns(source))

    def test_confirmed_example_and_explicit_boundary(self):
        self.assertEqual(latin_to_hangul("loega'k"), '초까그')
        self.assertEqual(latin_to_hangul('loegak'), '초깍')
        self.assertEqual(latin_to_hangul("an'ga"), '안까')
        self.assertEqual(latin_to_hangul('anga'), '아아')

    def test_consonant_chart(self):
        self.assertEqual(
            latin_to_hangul('ma na nga pa ba ta da tca dca ka ga tta fa qa sa ca ha ra la'),
            '마 나 아 바 빠 다 따 자 짜 가 까 카 파 타 사 싸 하 라 차',
        )

    def test_vowel_and_glide_chart(self):
        self.assertEqual(
            latin_to_hangul('i a u ie ae oe wi wa wie wae woe ja ju jie jae joe'),
            '어 아 우 에 애 오 워 와 웨 왜 외 야 유 예 얘 요',
        )

    def test_syllable_defaults(self):
        self.assertEqual(latin_to_hangul('aka akta k b adua'), '아가 악다 그 쁘 아뚜아')
        self.assertEqual(latin_to_hangul('LA\tMA'), '차\t마')

    def test_em_spelling(self):
        self.assertEqual(latin_to_hangul('kem em'), '금 음')
        self.assertEqual(latin_to_hangul('kém ém'), '금\u0301 음\u0301')
        self.assertEqual(latin_to_hangul('kémbwa'), '금\u0301뽜')
        self.assertEqual(latin_to_hangul('ie ae oe'), '에 애 오')

    def test_unmapped_spellings_are_not_guessed(self):
        for value in ['e', 'ke', 'é', 'ké', 'en', 'o', 'z', 'w', 'j', 'wu', 'ji', "'ka", "ka'", "ka''la",
                      '\u0301a', 'ḿa', 'à', 'ó']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                latin_to_hangul(value)

    def test_acute_follows_complete_syllable(self):
        self.assertEqual(latin_to_hangul("lóega'k"), '초\u0301까그')
        self.assertEqual(latin_to_hangul('ákta'), '악\u0301다')
        self.assertEqual(latin_to_hangul('aká'), '아가\u0301')
        self.assertEqual(latin_to_hangul('Á Í Ú'), '아\u0301 어\u0301 우\u0301')

    def test_acute_preserves_digraphs_and_glides(self):
        for latin in ['áe', 'aé', 'áé']:
            self.assertEqual(latin_to_hangul(latin), '애\u0301')
        self.assertEqual(latin_to_hangul('wíe wóe jié'),
                         '웨\u0301 외\u0301 예\u0301')

    def test_precomposed_and_decomposed_accents_match(self):
        latin = "dúkwa lóega'k háttda"
        expected = '뚜\u0301과 초\u0301까그 핰\u0301따'
        self.assertEqual(latin_to_hangul(latin), expected)
        self.assertEqual(latin_to_hangul(unicodedata.normalize('NFD', latin)), expected)

    def test_town_data_is_preserved_without_reusing_old_readings(self):
        source = {'regions': [{'id': 'example', 'dataSources': [{'kind': 'towns', 'points': [
            {'title': {'native': '日그', 'latin': "loega'k", 'hangul': 'wrong'}, 'population': 8},
            {'title': {'native': 'No Latin', 'hangul': 'wrong'}},
            {'title': {'native': 'Old spelling', 'latin': 'zo', 'hangul': 'wrong'}},
        ]}]}]}
        original = copy.deepcopy(source)
        result = generate_towns(source)
        self.assertEqual(source, original)
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0]['town']['title']['hangul'], '초까그')
        self.assertEqual(result[0]['town']['population'], 8)
        self.assertEqual(result[0]['regionId'], 'example')
        self.assertIsNone(result[0]['issue'])
        for entry in result[1:]:
            self.assertIsNone(entry['town']['title']['hangul'])
            self.assertTrue(entry['issue'])


if __name__ == '__main__':
    unittest.main()
