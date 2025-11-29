from pathlib import Path 
path = Path('src/App.tsx')
lines = path.read_text(encoding='utf-8').splitlines()
start = next(i for i,l in enumerate(lines) if l.startswith('type PurchaseRecord'))
end = next(i for i,l in enumerate(lines) if l.startswith('type SaleForm'))
