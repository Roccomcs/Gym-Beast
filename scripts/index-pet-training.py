"""Validate transparent training atlases and index their actual row boundaries.
Reads pixels for QA/metadata only; does not modify any illustration.
Run with Python + Pillow: python scripts/index-pet-training.py
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = {}
report = []
paths = sorted((root / 'public/pet-training').glob('*/*.png'))
human = root / 'public/exercise-poses/program-basics.png'
if human.exists():
    paths.append(human)
for path in paths:
    with Image.open(path) as image:
        image.load()
        if image.mode != 'RGBA':
            report.append({'file': str(path.relative_to(root)), 'error': 'Missing RGBA transparency'})
            continue
        alpha = image.getchannel('A')
        runs, start = [], None
        for y in range(image.height):
            visible = sum(value > 128 for value in alpha.crop((0, y, image.width, y + 1)).get_flattened_data()) > 6
            if visible and start is None:
                start = y
            if not visible and start is not None:
                runs.append([start, y])
                start = None
        if start is not None:
            runs.append([start, image.height])
        # Tiny internal gaps (between a raised bar and the head) belong to one row.
        merged = []
        for band in runs:
            if merged and band[0] - merged[-1][1] < 2:
                merged[-1][1] = band[1]
            else:
                merged.append(band)
        if len(merged) != 5:
            report.append({'file': str(path.relative_to(root)), 'error': 'Expected five isolated age rows', 'bands': merged})
            continue
        edges = [0] + [(merged[i - 1][1] + merged[i][0]) // 2 for i in range(1, 5)] + [image.height]
        poses = []
        columns = []
        for row in range(5):
            # Generators do not always place the column gap exactly at 50%.
            # Locate the actual transparent separator without altering the art.
            occupied = [any(value > 128 for value in alpha.crop((x, edges[row], x + 1, edges[row + 1])).get_flattened_data()) for x in range(image.width)]
            gaps, gap_start = [], None
            for x in range(image.width * 3 // 10, image.width * 7 // 10):
                if not occupied[x] and gap_start is None:
                    gap_start = x
                if occupied[x] and gap_start is not None:
                    if x - gap_start >= 3:
                        gaps.append([gap_start, x])
                    gap_start = None
            if gap_start is not None:
                gaps.append([gap_start, image.width * 7 // 10])
            separator = min(gaps, key=lambda gap: abs((gap[0] + gap[1]) / 2 - image.width / 2)) if gaps else None
            cut = sum(separator) // 2 if separator else image.width // 2
            columns.append([[0, cut], [cut, image.width]])
            for column in range(2):
                left, right = columns[-1][column]
                box = (left, edges[row], right, edges[row + 1])
                crop = alpha.crop(box)
                bounds = crop.point(lambda value: 255 if value > 128 else 0).getbbox()
                poses.append({'age': row + 1, 'pose': column, 'bounds': bounds,
                              'touchesEdge': bool(bounds and (bounds[0] <= 1 or bounds[1] <= 1 or bounds[2] >= crop.width - 1 or bounds[3] >= crop.height - 1))})
        corners = [alpha.getpixel(point) for point in [(0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1)]]
        url = '/' + path.relative_to(root / 'public').as_posix()
        manifest[url] = {'width': image.width, 'height': image.height,
                         'rows': [[edges[i], edges[i + 1]] for i in range(5)], 'columns': columns,
                         'revision': hashlib.sha256(path.read_bytes()).hexdigest()[:12]}
        report.append({'file': str(path.relative_to(root)), 'cornersAlpha': corners, 'poses': poses})
(root / 'src/pet-training-atlases.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
folder = root / 'docs/qa/etapa-5'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'atlas-audit.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
errors = [entry for entry in report if 'error' in entry]
print(json.dumps({'indexed': len(manifest), 'errors': errors, 'edgeWarnings': [entry['file'] for entry in report if any(pose['touchesEdge'] for pose in entry.get('poses', []))]}, ensure_ascii=False))
