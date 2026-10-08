"""Generate a separate town list from the current Latin romanization chart."""

import argparse
import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONSONANTS = {
    'm': 'ㅁ', 'n': 'ㄴ', 'ng': 'ㅇ',
    'p': 'ㅂ', 'b': 'ㅃ', 't': 'ㄷ', 'd': 'ㄸ',
    'tc': 'ㅈ', 'dc': 'ㅉ', 'k': 'ㄱ', 'g': 'ㄲ', 'tt': 'ㅍ',
    'f': 'ㅍ', 'q': 'ㅌ', 's': 'ㅅ', 'c': 'ㅆ',
    'h': 'ㅋ', 'r': 'ㄹ', 'l': 'ㅊ',
}
VOWELS = {
    'em': 'ㅡ',  # This spelling includes the ㅁ coda; e alone is invalid.
    'i': 'ㅓ', 'a': 'ㅏ', 'u': 'ㅜ', 'ie': 'ㅔ', 'ae': 'ㅐ', 'oe': 'ㅗ',
    'wi': 'ㅝ', 'wa': 'ㅘ', 'wie': 'ㅞ', 'wae': 'ㅙ', 'woe': 'ㅚ',
    'ja': 'ㅑ', 'ju': 'ㅠ', 'jie': 'ㅖ', 'jae': 'ㅒ', 'joe': 'ㅛ',
}
ONSETS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
NUCLEI = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
CODAS = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
SPELLINGS = sorted(CONSONANTS.keys() | VOWELS.keys(), key=lambda s: (-len(s), s))


def compose(onset, vowel, coda=' '):
    return chr(0xAC00 + (ONSETS.index(onset) * 21 + NUCLEI.index(vowel)) * 28
               + CODAS.index(coda))


def convert_segment(segment):
    letters = []
    accented_positions = set()
    for character in unicodedata.normalize('NFD', segment):
        if character == '\u0301':
            if not letters or letters[-1] not in 'aeiou':
                raise ValueError(f"Acute accent must follow a vowel in {segment!r}")
            accented_positions.add(len(letters) - 1)
        else:
            letters.append(character)
    spelling_text = ''.join(letters)
    tokens = []
    accents = []
    offset = 0
    while offset < len(spelling_text):
        spelling = next((s for s in SPELLINGS if spelling_text.startswith(s, offset)), None)
        if spelling is None:
            raise ValueError(f"Unsupported spelling at {spelling_text[offset:]!r} in {segment!r}")
        tokens.append(spelling)
        accents.append(any(position in accented_positions
                           for position in range(offset, offset + len(spelling))))
        offset += len(spelling)

    result = []
    index = 0
    while index < len(tokens):
        onset = 'ㅇ'
        if tokens[index] in CONSONANTS:
            onset = CONSONANTS[tokens[index]]
            index += 1
        vowel = 'ㅡ'
        accent = ''
        coda = ' '
        if index < len(tokens) and tokens[index] in VOWELS:
            vowel = VOWELS[tokens[index]]
            accent = '\u0301' if accents[index] else ''
            if tokens[index] == 'em':
                coda = 'ㅁ'
            index += 1
        if coda == ' ' and index < len(tokens) and tokens[index] in CONSONANTS:
            candidate = CONSONANTS[tokens[index]]
            # A consonant followed by a vowel belongs to the next syllable.
            followed_by_vowel = index + 1 < len(tokens) and tokens[index + 1] in VOWELS
            if not followed_by_vowel and candidate in CODAS:
                coda = candidate
                index += 1
        result.append(compose(onset, vowel, coda) + accent)
    return ''.join(result)


def latin_to_hangul(latin):
    """Convert explicit Latin spelling; never infer spelling from an old reading."""
    result = []
    for word in re.split(r'(\s+)', latin.strip().lower()):
        if not word or word.isspace():
            result.append(word)
            continue
        segments = word.split("'")
        if any(not segment for segment in segments):
            raise ValueError(f"Empty syllable boundary in {word!r}")
        result.append(''.join(convert_segment(segment) for segment in segments))
    return ''.join(result)


def generate_towns(regions):
    """Keep all town fields except untrusted Hangul; include region provenance."""
    towns = []

    def visit(node):
        if isinstance(node, list):
            for child in node:
                visit(child)
        elif isinstance(node, dict):
            for source_index, source in enumerate(node.get('dataSources', [])):
                if source.get('kind') != 'towns':
                    continue
                for point_index, point in enumerate(source.get('points', [])):
                    data = {**point, 'hangul': None}
                    issue = None
                    latin = point.get('latin')
                    if not isinstance(latin, str) or not latin.strip():
                        issue = 'Missing latin field'
                    else:
                        try:
                            data['hangul'] = latin_to_hangul(latin)
                        except ValueError as error:
                            issue = str(error)
                    towns.append({
                        'regionId': node.get('id'),
                        'dataSourceIndex': source_index,
                        'pointIndex': point_index,
                        'town': data,
                        'issue': issue,
                    })
            for key, child in node.items():
                if key != 'dataSources':
                    visit(child)

    visit(regions)
    return towns


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'maps-sources/geo-data/regions.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'maps-sources/geo-data/towns-hangul.generated.json')
    args = parser.parse_args()
    towns = generate_towns(json.loads(args.source.read_text(encoding='utf-8')))
    if args.source.resolve() == args.output.resolve():
        parser.error('Output must be separate from the source town data')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(towns, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    converted = sum(town['issue'] is None for town in towns)
    print(f'Generated {args.output}: {converted}/{len(towns)} converted; '
          f'{len(towns) - converted} need Latin spelling updates.')


if __name__ == '__main__':
    main()
