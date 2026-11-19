#!/usr/bin/env python3
"""Extract Table 3 (longtable \\label{tab3}) from the AOAS manuscript into methods.csv,
and attach citation metadata (bib key, year, DOI, journal, title) from the .bib file.

Usage: python3 extract_table.py <manuscript.tex> <refs.bib> <out.csv>

Citation matching, in order:
  1. MANUAL_KEYS below (hand-checked overrides)
  2. "<Method>\\citep{key}" patterns in the manuscript text
  3. a .bib entry whose title/shorttitle contains the method name as a word
  4. author-year names ("Ospina et al. 2024") -> first-author surname + year
"""
import csv
import re
import sys

MANUAL_KEYS = {
    # method name -> bib key; hand-checked against grouped \citep{} calls in the text
    "SPARK": "sunStatisticalAnalysisSpatial2020",
    "MERINGUE": "millerCharacterizingSpatialGene2021",
    "CTSV": "yuIdentificationCelltypespecificSpatially2022",
    "Starfysh": "heStarfyshIntegratesSpatial2025",
    "PanoSpace": "heUnlockingSinglecellLevel2026",
    "Zhang et al. 2025": "zhangSystematicInferenceSuperresolution2025",
    "ST-net": "heIntegratingSpatialGene2020",
    "iStar": "zhangInferringSuperresolutionTissue2024",
    "iSCALE": "schroederScalingSpatialTranscriptomics2025",
    "TRIPLEX": "chungAccurateSpatialGene2024",
    "BLEEP": "xieSpatiallyResolvedGene2023",
    "mclSTExp": "minMultimodalContrastiveLearning2024",
    "Hist2ST": "zengSpatialTranscriptomicsPrediction2022",
    "EGGN": "yangSpatialTranscriptomicsAnalysis2024",
    "ErwaNet": "chenEdgerelationalWindowattentionalGraph2024",
    "Wang et al. 2024 (Cross-modal diffusion)": "wangCrossmodalDiffusionModelling2024",
    "STFlow": "huangScalableGenerationSpatial2025",
    "H&Enium": "glettigHampEniumApplyingFoundation2025",
    "SpatialEx+": "liuHighParameterSpatialMultiOmics2025",
    "UMPIRE": "hanUnifiedMoleculeEnhancedPathology2025",
    "HisToGene (Pang et al. 2021)": "pangLeveragingInformationSpatial2021",
    "Seurat (FindTransferAnchors)": "stuartComprehensiveIntegrationSingleCell2019",
    "NCEM": "fischerModelingIntercellularCommunication2023",
    "SPICE": "kouznetsovGraphConvolutionalNetworks2026",
    "DCell": "maUsingDeepLearning2018",
    # SOMDE: no .bib entry (named in text, line 86, but never cited) -> left blank
}

LATEX_SUBS = [
    (r"\&", "&"), (r"{\aa}", "å"), (r"\aa{}", "å"), (r"\aa", "å"),
    (r"{\'a}", "á"), (r"{\'e}", "é"), (r"{\"o}", "ö"), (r"{\"u}", "ü"),
    ("--", "–"), ("~", " "),
]


def delatex(s):
    for a, b in LATEX_SUBS:
        s = s.replace(a, b)
    s = re.sub(r"\\textbf\{([^}]*)\}|\\emph\{([^}]*)\}", lambda m: m.group(1) or m.group(2), s)
    s = s.replace("{", "").replace("}", "")
    return re.sub(r"\s+", " ", s).strip()


def parse_table(tex):
    body = tex.split(r"\label{tab3}", 1)[1]
    body = body.split(r"\endlastfoot", 1)[1].split(r"\end{longtable}", 1)[0]
    rows, category = [], ""
    for line in body.strip().split("\n"):
        line = line.strip()
        if not line.endswith(r"\\"):
            continue
        cells = [c.strip() for c in re.split(r"(?<!\\)&", line[:-2])]
        if len(cells) != 7:
            raise ValueError(f"expected 7 cells, got {len(cells)}: {line[:80]}")
        if cells[0]:
            category = delatex(cells[0])
        rows.append({
            "no": int(cells[1]),
            "category": category,
            "method": delatex(cells[2]),
            "task": delatex(cells[3]),
            "input": delatex(cells[4]),
            "language": delatex(cells[5]),
            "core_method": delatex(cells[6]),
        })
    return rows


def parse_bib(bib):
    entries = {}
    for m in re.finditer(r"@(\w+)\{([^,]+),(.*?)\n\}", bib, re.S):
        key, fields_txt = m.group(2).strip(), m.group(3)
        f = {}
        for fm in re.finditer(r"^\s*(\w+)\s*=\s*(.+?),?\s*$", fields_txt, re.M):
            f[fm.group(1).lower()] = fm.group(2).strip().strip(",")
        entries[key] = {k: delatex(v) for k, v in f.items()}
        entries[key]["_type"] = m.group(1).lower()
    return entries


def text_citations(tex):
    """Map method name -> first bib key cited directly after it in the text."""
    out = {}
    body = tex.split(r"\label{tab3}", 1)[0]
    for m in re.finditer(r"([A-Za-z0-9][A-Za-z0-9.+\-]*(?:\\&[A-Za-z]+)?)\s?\\citep\{([^}]+)\}", body):
        name, keys = delatex(m.group(1)), [k.strip() for k in m.group(2).split(",")]
        if len(keys) == 1:
            out.setdefault(name.lower(), keys[0])
    return out


def match(row, entries, cites):
    name = row["method"]
    if name in MANUAL_KEYS:
        return MANUAL_KEYS[name], "manual"
    base = re.split(r"\s*\(", name)[0].strip()  # "Seurat (FindTransferAnchors)" -> "Seurat"
    for cand in (name, base):
        k = cites.get(cand.lower())
        if k and k in entries:
            return k, "text"
    m = re.match(r"([A-Z][\wå\-]+) et al\.? (\d{4})", name)
    if m:
        sur, yr = m.group(1).lower(), m.group(2)
        hits = [k for k, e in entries.items()
                if e.get("year") == yr and e.get("author", "").lower().split(",")[0].strip() in (sur, sur.replace("å", "a"))]
        if len(hits) == 1:
            return hits[0], "author-year"
        if hits:
            return ";".join(hits), "AMBIGUOUS"
    pat = re.compile(r"(?<![\w-])" + re.escape(base) + r"(?![\w-])", re.I)
    hits = [k for k, e in entries.items() if pat.search(e.get("shorttitle", "") + " " + e.get("title", ""))]
    if len(hits) == 1:
        return hits[0], "title"
    if hits:
        return ";".join(hits), "AMBIGUOUS"
    return "", "UNMATCHED"


def main(tex_path, bib_path, out_path):
    tex = open(tex_path, encoding="utf-8").read()
    entries = parse_bib(open(bib_path, encoding="utf-8").read())
    cites = text_citations(tex)
    rows = parse_table(tex)
    for r in rows:
        key, how = match(r, entries, cites)
        e = entries.get(key, {})
        doi = e.get("doi", "")
        r.update({
            "bib_key": key, "match": how,
            "year": e.get("year", ""), "title": e.get("title", ""),
            "journal": e.get("journal", "") or e.get("booktitle", "") or e.get("publisher", ""),
            "doi": doi,
            "url": f"https://doi.org/{doi}" if doi else e.get("url", ""),
            "code_url": "",
        })
    cols = ["no", "category", "method", "task", "input", "language", "core_method",
            "year", "title", "journal", "doi", "url", "code_url", "bib_key", "match"]
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    from collections import Counter
    print(len(rows), "rows;", Counter(r["match"] for r in rows))
    for r in rows:
        if r["match"] in ("AMBIGUOUS", "UNMATCHED", "title", "author-year"):
            print(f'{r["no"]:>3} {r["match"]:<11} {r["method"]:<35} {r["bib_key"]}')


if __name__ == "__main__":
    main(*sys.argv[1:4])
