"""把 src/app.html 和 src/core.js 合併成 index.html（GitHub Pages 發布的就是 index.html）。
用法：python3 build.py
"""
import pathlib
root = pathlib.Path(__file__).parent
app = (root / 'src' / 'app.html').read_text(encoding='utf-8')
core = (root / 'src' / 'core.js').read_text(encoding='utf-8')
assert '/*@@CORE@@*/' in app, 'app.html 裡找不到 /*@@CORE@@*/ 佔位符'
(root / 'index.html').write_text(app.replace('/*@@CORE@@*/', core), encoding='utf-8')
print('已產生 index.html')
