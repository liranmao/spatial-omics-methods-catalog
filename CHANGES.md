# How the online catalog differs from manuscript Table 3

Source: `main/08012026_AOAS_aoas.tex`, lines 312–450 (113 rows, 9 categories, 4 landscape pages).

## Content changes
1. **SpaGCN merged.** Rows #11 (SVG identification) and #81 (Integration) are now one entry listed under both
   categories. 113 rows → **112 methods**. The "also appears in Section 4 (Integration)" note was removed.
2. **SVG subtypes split out.** Cells like "Overall SVG; Tissue-wide SVG detection" became
   subtype = "Overall SVG", task = "Tissue-wide SVG detection".
3. **Category renamed: "Gene Expression Prediction from Histology" → "Spatial gene expression prediction".**
   Also, for clearer separation on the site: "Interpretable Models for Spatial Omics & Downstream Tasks" → "Cell communication & interpretable models", and "Related methods" is split into "Gene regulatory networks" (SCRIPro, SpaGRN, SCING) and "Trajectory inference" (moscot).
   Rows #58–70 (Seurat, LIGER, SpaGE, stPlus, ENGEP, PASTA, SpaOTsc, novoSpaRc, gimVI, VISTA, stDiff, SpaIM,
   spRefine) predict expression from an scRNA-seq reference, not from histology. Subtypes are now
   "From histology" (#30–57) and "From scRNA-seq reference (imputation)" (#58–70). This matches the manuscript
   section title "In- and out-of-sample prediction of spatial gene expression".
4. Category names changed to sentence case (e.g. "Cell-Type Deconvolution" → "Cell-type deconvolution").

## Added information (not in Table 3)
- First author, year, journal and title for 111 of 112 methods (all but SOMDE), and a DOI/paper link for 110
  (all but SOMDE and JADE), taken from `AoAS_review_paper.bib`.
  The 25 methods cited only inside grouped `\citep{...}` calls were matched by hand
  (see `MANUAL_KEYS` in `scripts/extract_table.py`).
- Code links for 18 methods, taken only from URLs printed in the paper's own abstract.
- Automatic filter tags: input data, model family, and paradigm (Statistical / classical ML, Deep learning, Hybrid).
