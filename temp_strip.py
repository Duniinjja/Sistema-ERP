from pathlib import Path
path = Path('src/App.tsx')
text = path.read_text()
start = text.index('function RelatoriosPage() {')
end = text.index('function ConfiguracoesPage(', start)
path.write_text(text[:start] + text[end:])
