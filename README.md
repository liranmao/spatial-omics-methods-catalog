# Spatial Omics Methods Catalog

Searchable web version of Table 3 ("Summary of major computational methods in spatial omics")
from *Computational Landscape and Emerging Frontiers in Spatial Omics* (AOAS, in revision).

## Layout

| Path | What it is |
|---|---|
| `methods.csv` | **Source of truth.** One row per method. Edit this file to add or fix entries. |
| `docs/` | The website (GitHub Pages serves this folder). `docs/data/` is generated — don't edit it by hand. |
| `scripts/build_site.py` | `methods.csv` → `docs/data/methods.js` + `docs/data/methods.csv`. Derives filter tags. |
| `scripts/extract_table.py`, `scripts/make_methods_csv.py` | One-time scripts that built `methods.csv` from the manuscript's Table 3 (they need the manuscript source, which is not in this repo). |
| `CHANGES.md` | Every way the catalog differs from Table 3 in the manuscript. |

## Everyday workflow

```bash
# 1. edit methods.csv (Excel / Numbers is fine; keep it UTF-8 CSV)
# 2. rebuild the site data
python3 scripts/build_site.py
# 3. preview
python3 -m http.server 8765 --directory docs   # then open http://127.0.0.1:8765
```

`build_site.py` prints a warning if a method's "core_method" text doesn't match any model-family rule;
add a rule in `MODEL_RULES` (or reword the description) when that happens.

## Columns in methods.csv

`id, method, categories` (`;`-separated if more than one) `, subtype, task, input, language, core_method,
year, first_author, title, journal, doi, paper_url, code_url, code_source, bib_key, table3_no, notes`

## Deployment

The site is served by GitHub Pages from the `docs/` folder of the `main` branch:
https://liranmao.github.io/spatial-omics-methods-catalog/

After editing `methods.csv`, run `python3 scripts/build_site.py`, commit and push. `build_site.py` also bumps the
`?v=` stamp on the CSS/JS links so visitors get the new files instead of a cached copy.

## Suggesting a method

Open an issue with the method name, its task, required input data, language, core model and DOI.

## Disclaimer

This catalog is not exhaustive. It lists the methods discussed in our review; many other valuable methods are not
included. Inclusion is not an endorsement, and omission does not reflect on a method's quality. Entries summarize
each method as described in its own publication; some fields are derived automatically and may contain errors.

## Citation

Mao L\*, Li C\*, Jiang S, Li W, Jin K, Zhang NR, Li M†. Computational landscape and emerging frontiers in spatial omics.
*Annals of Applied Statistics*, in revision. (\*equal contribution, †corresponding author)

---

© Copyright Mingyao Li Lab, 2026.
