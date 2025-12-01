from pathlib import Path
text = Path('src/pages/ComprasPage.tsx').read_text().splitlines()
for i,line in enumerate(text,1):
    if 330 <= i <= 380:
        print(f'{i:04}: {line}')
