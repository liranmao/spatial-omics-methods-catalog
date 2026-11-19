#!/usr/bin/env python3
"""ONE-TIME: turn data_raw.csv (straight from Table 3) into methods.csv, the curated,
hand-editable source of truth for the website. After this, edit methods.csv directly.

Curation applied (all logged in CHANGES.md):
  * SpaGCN (#11 and #81) merged into one entry with two categories
  * "Subtype; task" cells in the SVG block split into subtype + task
  * Gene-expression-prediction block: rows 58-70 are scRNA-seq-reference imputation,
    not histology-based, so the category is renamed and a subtype added
  * first author, year, journal, DOI pulled from the .bib; code links pulled only
    from GitHub/GitLab URLs that appear in the paper's own abstract

Usage: python3 make_methods_csv.py data_raw.csv refs.bib methods.csv
"""
import csv
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from extract_table import parse_bib  # noqa: E402

CATEGORY_RENAME = {
    "Spatially Variable Gene (SVG) Identification": "Spatially variable gene identification",
    "Cell-Type Deconvolution": "Cell-type deconvolution",
    "Gene Expression Prediction from Histology": "Spatial gene expression prediction",
    "Spatial Alignment": "Spatial alignment",
    "Multi-Sample and Multi-Modal Integration": "Multi-sample & multi-modal integration",
    "Foundation Models for Spatial Omics": "Foundation models",
    "Uncertainty Quantification": "Uncertainty quantification",
    "Interpretable Models for Spatial Omics & Downstream Tasks": "Cell communication & interpretable models",
    "Related methods": "Gene regulatory networks",
}
# "Related methods" mixes GRN tools and one trajectory tool; split them on the site.
METHOD_CATEGORY = {"moscot": "Trajectory inference"}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def first_author(author_field):
    if not author_field:
        return ""
    first = author_field.split(" and ")[0]
    sur = first.split(",")[0].strip()
    n = author_field.count(" and ") + 1
    return sur if n == 1 else (f"{sur} and {author_field.split(' and ')[1].split(',')[0].strip()}" if n == 2 else f"{sur} et al.")


def main(raw_path, bib_path, out_path):
    bib = parse_bib(open(bib_path, encoding="utf-8").read())
    raw = list(csv.DictReader(open(raw_path, encoding="utf-8")))
    out, by_method = [], {}
    for r in raw:
        no = int(r["no"])
        cat = METHOD_CATEGORY.get(r["method"], CATEGORY_RENAME[r["category"]])
        task, subtype = r["task"], ""
        if r["category"].startswith("Spatially Variable Gene") and ";" in task:
            subtype, task = [x.strip() for x in task.split(";", 1)]
        if r["category"] == "Gene Expression Prediction from Histology":
            subtype = "From histology" if no <= 57 else "From scRNA-seq reference (imputation)"
        core = re.sub(r";\s*also appears in Section 4 \(Integration\)", "", r["core_method"])

        if r["method"] in by_method:  # duplicate (SpaGCN): merge into first entry
            prev = by_method[r["method"]]
            prev["categories"] += "; " + cat
            prev["task"] = task if len(task) > len(prev["task"]) else prev["task"]
            prev["table3_no"] += f"; {no}"
            continue

        b = bib.get(r["bib_key"], {})
        txt = " ".join(b.get(f, "") for f in ("abstract", "url", "note"))
        code = re.findall(r"https?://(?:www\.)?(?:github\.com|gitlab\.com)/[\w.\-]+/[\w.\-]+", txt)
        row = {
            "id": slug(r["method"]),
            "method": r["method"],
            "categories": cat,
            "subtype": subtype,
            "task": task,
            "input": r["input"],
            "language": r["language"],
            "core_method": core,
            "year": r["year"],
            "first_author": first_author(b.get("author", "")),
            "title": r["title"].replace("&amp;", "&"),
            "journal": r["journal"],
            "doi": r["doi"],
            "paper_url": r["url"],
            "code_url": code[0].rstrip(".").replace("http://", "https://") if code else "",
            "code_source": "paper abstract" if code else "",
            "bib_key": r["bib_key"],
            "table3_no": str(no),
            "notes": "" if r["bib_key"] else "No .bib entry - citation missing in manuscript",
        }
        by_method[r["method"]] = row
        out.append(row)

    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} methods written to {out_path}; "
          f"{sum(1 for r in out if r['doi'])} with DOI, {sum(1 for r in out if r['code_url'])} with code link")


if __name__ == "__main__":
    main(*sys.argv[1:4])
