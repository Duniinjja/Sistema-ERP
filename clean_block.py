from pathlib import Path
path = Path('src/App.tsx')
lines = path.read_text(encoding='utf-8').splitlines()
del lines[103:121]
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
