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

## Living edition only (dev branch, 2026-11)
These changes apply to the living edition (`/dev/`). The paper edition keeps the categories above.
1. **"Multi-sample & multi-modal integration" → "Spatial domain detection & integration".** Most methods in this
   category learn a spatially aware embedding that serves both domain detection and integration, so single-sample
   domain-detection methods now belong here too. Subtypes: Single-sample domain detection / Multi-sample integration /
   Multi-modal integration.
2. **Four new categories:** Spatial niche identification; Cell segmentation (Image-based / Transcript-based / Joint);
   CNV inference; Preprocessing & quality control (Quality control / Normalization / Denoising & batch correction /
   Image processing & registration / Data formats & infrastructure).
   Five more categories (2026-11-21): Cell-type annotation (Reference-based / Reference-free / From histology;
   single-cell resolution — spot-level reference-based methods stay in Cell-type deconvolution); Spatial statistics &
   co-localization; Subcellular RNA localization; Simulation; AI agents & analysis assistants. Spatial pathway/gene-set
   activity methods are listed under SVG identification, and perturbation-response prediction under spatial gene
   expression prediction.
   "Spatial gene expression prediction" subtypes are now defined by input → output (2026-11-21): From histology: RNA;
   From histology: protein (virtual staining); Super-resolution & enhancement; Imputation within ST; Gene panel
   expansion from scRNA-seq; Slice interpolation & 3D reconstruction; Cross-modality translation; Perturbation response.
   They replace the three paper-edition subtypes (From histology / From ST alone / From scRNA-seq reference).
3. **`spatial_design` column.** `spatial-specific` = built for spatial omics data; `adapted` = a single-cell or general
   method with a dedicated spatial mode (shown with an "Adapted" badge and a filter). Single-cell methods with no
   spatial component are not included. Paper-edition rows are left blank.
4. Categories are listed in pipeline order (preprocessing → segmentation → … → uncertainty quantification).
