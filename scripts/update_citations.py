#!/usr/bin/env python3
"""Refresh the "citations" column of methods.csv.

Source: Semantic Scholar citationCount (covers journals and bioRxiv/arXiv preprints).
When Semantic Scholar has no record or reports 0, the Crossref "is-referenced-by-count"
is used if it is larger. The date of the refresh goes into citations_as_of.txt.

  python3 scripts/update_citations.py && python3 scripts/build_site.py
"""
import csv
import json
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "spatial-omics-methods-catalog/1.0", "Content-Type": "application/json"}


def get(url, data=None, tries=4):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            time.sleep(3 * (k + 1))
    return None


def s2_key(doi):
    return "ARXIV:" + doi[len("10.48550/arxiv."):] if doi.startswith("10.48550/arxiv.") else "DOI:" + doi


def crossref_count(doi):
    j = get("https://api.crossref.org/works/" + urllib.parse.quote(doi))
    return (j or {}).get("message", {}).get("is-referenced-by-count")


def main():
    path = ROOT / "methods.csv"
    reader = csv.DictReader(open(path, encoding="utf-8"))
    fields = list(reader.fieldnames)
    rows = list(reader)
    if "citations" not in fields:
        fields.insert(fields.index("code_url"), "citations")
    with_doi = [r for r in rows if r["doi"]]
    s2 = []
    for i in range(0, len(with_doi), 400):
        chunk = with_doi[i:i + 400]
        body = json.dumps({"ids": [s2_key(r["doi"].lower()) for r in chunk]}).encode()
        s2 += get("https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount", body) or [None] * len(chunk)
    for r, hit in zip(with_doi, s2):
        n = hit.get("citationCount") if hit else None
        if not n:
            c = crossref_count(r["doi"].lower())
            n = max(x for x in (n, c, 0) if x is not None)
        r["citations"] = str(n)
    for r in rows:
        r.setdefault("citations", "")
        if not r["doi"]:
            r["citations"] = ""
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    (ROOT / "citations_as_of.txt").write_text(date.today().isoformat() + "\n")
    print(f"citations updated for {len(with_doi)} methods")


if __name__ == "__main__":
    main()
