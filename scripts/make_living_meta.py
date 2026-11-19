#!/usr/bin/env python3
"""Used by the Pages workflow: give the living edition (/dev/) its own canonical URL, title and
description, so search results and link previews name the right edition.

Usage: python3 scripts/make_living_meta.py path/to/dev/index.html
"""
import re
import sys

path = sys.argv[1]
html = open(path, encoding="utf-8").read()
subs = [
    (r'(<link rel="canonical" href="[^"]*/)">', r'\1dev/">'),
    (r'(<meta property="og:url" content="[^"]*/)">', r'\1dev/">'),
    (r"<title>Spatial Omics Methods Catalog</title>", "<title>Spatial Omics Methods Catalog · Living edition</title>"),
    (r'(<meta (?:property="og|name="twitter):title" content="Spatial Omics Methods Catalog)">', r'\1 · Living edition">'),
    (r"A curated catalog of \d+ spatial omics computational methods from our Annals of Applied Statistics review \(paper edition\)",
     "The living edition of the Spatial Omics Methods Catalog: all methods from our Annals of Applied Statistics review plus new ones, updated continuously"),
]
for pat, rep in subs:
    html, n = re.subn(pat, rep, html)
    if not n:
        sys.exit(f"make_living_meta: pattern not found: {pat}")
open(path, "w", encoding="utf-8").write(html)
print("living-edition meta written to", path)
