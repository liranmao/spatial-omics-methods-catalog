#!/usr/bin/env python3
"""Build the website data from methods.csv (the source of truth).

  methods.csv  ->  docs/data/methods.js   (window.METHODS = [...]; works from file:// too)
               ->  docs/data/methods.csv  (download link on the site)

The "source" column decides the edition: "review" rows form the paper edition (the methods
discussed in the review, frozen); any other value, or blank, marks a method added later and
shown only in the living catalog.

Filter tags (input data, model family, paradigm) are derived here from the free-text
columns, so you never edit them by hand. Re-run after every edit to methods.csv:

  python3 scripts/build_site.py
"""
import csv
import json
import re
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

INPUT_RULES = [  # (tag, regex on the "input" column)
    ("ST expression", r"\bST\b|count matri|Visium HD|Spatial omics matrix|MSI|Subcellular ST|Spatial proteomics"),
    ("Spatial coordinates / graph", r"spatial coords|spatial (neighborhood |proximity |adjacency )?graph|spatial cell context|3D stack"),
    ("H&E image", r"H&E"),
    ("scRNA-seq reference", r"scRNA-seq"),
    ("Multi-omics (ATAC / protein)", r"multi-omics|ATAC|proteomics|protein"),
    ("Multiple slices / samples", r"multiple (slices|samples)|different platforms|3D stack"),
    ("Annotations / covariates", r"proportions|domain labels|domain annotations|cell-type labels|covariates"),
    ("Clinical outcomes", r"clinical"),
    ("Expression / perturbation (non-spatial)", r"perturbation"),
]

MODEL_RULES = [  # (tag, paradigm, regex on the "core_method" column)
    ("Gaussian process", "stat", r"Gaussian process|\bGP\b|NNGP"),
    ("Regression / GLM / mixed model", "stat", r"regression|GLM|generalized linear|mixed model|LMM|least squares|NNLS|Poisson model|fixed-effect|spatially varying coefficients"),
    ("Bayesian / probabilistic model", "stat", r"Bayesian|probabilistic|Poisson-gamma|negative binomial|zero-inflated|mixture model|Hidden Markov|HMRF|maximum likelihood|horseshoe|Tweedie|Potts|Markov random field|weighted likelihood|topic model|point process|variance component"),
    ("Spatial autocorrelation / kernel test", "stat", r"autocorrelation|Moran|covariance test|spatial kernels|score-based|likelihood ratio|hypothesis test|statistical test|permutation test|permutation-based|statistical permutation|non-parametric|distribution-free|spatial covariance|mutual information|test-based"),
    ("Matrix factorization / factor analysis", "stat", r"factorization|NMF|factor analysis|\bCCA\b|tensor (completion|decomposition)|latent space analysis"),
    ("Optimal transport", "stat", r"optimal transport|Wasserstein|Gromov"),
    ("Classical ML (k-NN, forests, SOM, ensembles)", "stat", r"k-NN|nearest neighbor|random forest|ensemble|self-organizing|SHAP|machine learning classifiers|Bootstrap|motif|machine learning framework|transfer learning|genetic algorithm|random walk|Gaussian smoothing|graph smoothing|topological|spectral simplicial"),
    ("Conformal prediction", "stat", r"conformal"),
    ("Optimization-based mapping", "stat", r"optimization-based|graph optimization|network optimization|multi-objective optimization|linear assignment|cost minimization|anchor optimization|Frank-Wolfe"),
    ("CNN", "dl", r"\bCNN|(?<!graph )convolutional (neural )?network|DenseNet|dynamic convolution"),
    ("Graph neural network", "dl", r"GNN|graph (convolutional|attention|neural)|GCN|GAT\b|hypergraph|Graph Infomax|Graph transformer|Graph-based transformer"),
    ("Transformer / ViT", "dl", r"transformer|\bViT\b|attention"),
    ("Contrastive learning", "dl", r"[Cc]ontrastive|CLIP"),
    ("VAE / autoencoder / generative", "dl", r"VAE|autoencoder|variational|generative|adversarial|WGAN"),
    ("Diffusion / flow matching", "dl", r"[Dd]iffusion|[Ff]low matching"),
    ("Foundation model / LLM", "dl", r"foundation model|\bFM\b|language model|\bLLM\b|pretrain|pre-trained genomic"),
    ("Other deep learning", "dl", r"deep learning|neural network|DeepSet|multi-task|style transfer|\bVNN\b|segmentation|detector"),
]


def tags(text, rules):
    return [r[0] for r in rules if re.search(r[-1], text, re.I)]


def build():
    rows = list(csv.DictReader(open(ROOT / "methods.csv", encoding="utf-8")))
    paradigm_of = {r[0]: r[1] for r in MODEL_RULES}
    out = []
    for r in rows:
        model_tags = tags(r["core_method"], MODEL_RULES)
        kinds = {paradigm_of[t] for t in model_tags}
        if "Other deep learning" in model_tags and len([t for t in model_tags if paradigm_of[t] == "dl"]) > 1:
            model_tags.remove("Other deep learning")
        paradigm = ("Hybrid" if kinds == {"stat", "dl"} else
                    "Deep learning" if kinds == {"dl"} else
                    "Statistical / classical ML" if kinds == {"stat"} else "Other")
        out.append({
            **{k: v for k, v in r.items() if k not in ("bib_key", "notes")},
            "categories": [c.strip() for c in r["categories"].split(";")],
            "languages": [x.strip() for x in r["language"].split("/")],
            "input_tags": tags(r["input"], INPUT_RULES),
            "model_tags": model_tags,
            "paradigm": paradigm,
            "year": int(r["year"]) if r["year"] else None,
            "citations": int(r["citations"]) if r.get("citations", "").strip() else None,
            # "review" = discussed in the AOAS review (paper edition); anything else = added later.
            "source": "review" if r.get("source", "").strip().lower() == "review" else "added",
        })
    untagged = [o["method"] for o in out if o["paradigm"] == "Other"]
    if untagged:
        print("WARNING: no model-family tag for:", ", ".join(untagged))

    data_dir = ROOT / "docs" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    asof = ROOT / "citations_as_of.txt"
    payload = {"updated": date.today().isoformat(),
               "citations_as_of": asof.read_text().strip() if asof.exists() else "", "methods": out}
    (data_dir / "methods.js").write_text(
        "// Generated by scripts/build_site.py from methods.csv - do not edit by hand.\n"
        "window.CATALOG = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8")
    shutil.copy(ROOT / "methods.csv", data_dir / "methods.csv")
    # Bump the ?v= stamp on CSS/JS links so browsers fetch the new files instead of a cached copy.
    from datetime import datetime
    idx = ROOT / "docs" / "index.html"
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    html = re.sub(r'((?:href|src)="(?:assets|data)/[\w.-]+\.(?:css|js))(?:\?v=\d+)?"', rf'\1?v={stamp}"', idx.read_text(encoding="utf-8"))
    idx.write_text(html, encoding="utf-8")
    from collections import Counter
    print(f"{len(out)} methods -> {data_dir/'methods.js'}")
    print("paradigm:", dict(Counter(o["paradigm"] for o in out)))
    print("source:", dict(Counter(o["source"] for o in out)))


if __name__ == "__main__":
    build()
