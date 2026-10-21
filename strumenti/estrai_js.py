# Estrae il JavaScript dell'app (unico <script> senza attributi) in .work/app.js, per grep, node --check e test.
import os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(R, 'app', 'index.html'), encoding='utf-8').read()
os.makedirs(os.path.join(R, '.work'), exist_ok=True)
open(os.path.join(R, '.work', 'app.js'), 'w', encoding='utf-8').write(re.search(r'<script>\n(.*)</script>', s, re.S).group(1))
