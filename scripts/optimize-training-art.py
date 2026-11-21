"""Lossless encoding only: preserve every RGBA pixel and the original QA PNGs."""
from pathlib import Path
from PIL import Image
import hashlib, json

root = Path(__file__).resolve().parents[1]
sources = sorted((root / 'public/pet-training').rglob('*.png')) + [root / 'public/exercise-poses' / name for name in ['program-basics.png','french-press-lying.png']]
entries = []
for index, source in enumerate(sources):
    target = source.with_suffix('.webp')
    with Image.open(source) as image:
        rgba = image.convert('RGBA')
        rgba.save(target, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(target) as decoded:
            assert rgba.tobytes() == decoded.convert('RGBA').tobytes(), f'Pixels changed: {source}'
    entries.append({'source':str(source.relative_to(root)).replace('\\','/'),'output':str(target.relative_to(root)).replace('\\','/'),
        'sourceBytes':source.stat().st_size,'outputBytes':target.stat().st_size,
        'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    if (index+1)%10==0: print(f'{index+1}/{len(sources)} lossless assets verified',flush=True)
report={'format':'WebP lossless, exact RGBA equality','sourceBytes':sum(e['sourceBytes'] for e in entries),
    'outputBytes':sum(e['outputBytes'] for e in entries),'entries':entries}
destination=root/'docs/qa/etapa-10/art-optimization.json'
destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({key:value for key,value in report.items() if key!='entries'}),flush=True)
