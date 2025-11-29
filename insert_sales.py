from pathlib import Path
path = Path('src/App.tsx')
lines = path.read_text(encoding='utf-8').splitlines()
idx = next(i for i, line in enumerate(lines) if 'V001' in line)
lines.insert(idx, 'const sampleSales: SaleRecord[] = [')
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
