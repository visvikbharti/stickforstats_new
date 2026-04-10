"""
Generate CRISPR genome editing strategy comparison dataset.

Based on CRISPRArchitect v3 scoring framework (Bharti & Chakraborty, 2026).
Produces multi-criteria TOPSIS scores for 30 pathogenic variants across
three editing modalities: Base Editing (BE), Prime Editing (PE), and HDR.

Scoring dimensions (0-1 scale):
  - Safety: DSB-free = higher (BE > PE >> HDR)
  - Feasibility: PAM availability, editing window, guide quality
  - Complexity: number of components, delivery burden
  - Risk: off-target potential, large deletion risk
  - Confidence: evidence tier (measured > derived > assumed)
  - Consequence: functional impact of intended edit

These scores reflect known biological properties:
  - BE has highest safety (no DSBs) but limited to transition mutations
  - PE is versatile but complex (pegRNA + nick guide)
  - HDR requires DSBs, donor templates, and has low efficiency in iPSCs

Reference: CRISPRArchitect v3 — Multi-nuclease, consequence-guided decision
support for genome editing strategy design.
"""

import numpy as np
import pandas as pd

np.random.seed(42)  # Reproducibility

# 30 pathogenic variants from CRISPRArchitect benchmark set
variant_ids = [
    "BE_NF1_001", "BE_NF1_002", "BE_BRCA1_001", "BE_TP53_001", "BE_CFTR_001",
    "PE_DMD_001", "PE_HTT_001", "PE_HEXA_001", "PE_GBA_001", "PE_FANCA_001",
    "HDR_SCN1A_001", "HDR_LMNA_001", "HDR_COL7A1_001", "HDR_DYSF_001", "HDR_PAH_001",
    "MIX_ABCA4_001", "MIX_USH2A_001", "MIX_RPGR_001", "MIX_CFTR_002", "MIX_SMN1_001",
    "MIX_PKD1_001", "MIX_FBN1_001", "MIX_TSC1_001", "MIX_RB1_001", "MIX_APC_001",
    "MIX_PTEN_001", "MIX_VHL_001", "MIX_WT1_001", "MIX_NF2_001", "MIX_MEN1_001",
]

categories = (
    ["clean_base_editable"] * 5 +
    ["pe_preferred"] * 5 +
    ["hdr_required"] * 5 +
    ["mixed_feasibility"] * 15
)

genes = [v.split("_")[1] for v in variant_ids]

records = []

for i, (vid, cat, gene) in enumerate(zip(variant_ids, categories, genes)):
    for modality in ["BE", "PE", "HDR"]:
        # Base scoring profiles reflecting biological reality
        if modality == "BE":
            # High safety (no DSBs), variable feasibility (depends on editing window)
            safety = np.clip(np.random.normal(0.92, 0.05), 0, 1)
            feasibility = np.clip(np.random.normal(
                0.85 if cat == "clean_base_editable" else
                0.40 if cat == "pe_preferred" else
                0.20 if cat == "hdr_required" else 0.55, 0.12), 0, 1)
            complexity = np.clip(np.random.normal(0.15, 0.06), 0, 1)  # Low complexity
            risk = np.clip(np.random.normal(0.12, 0.05), 0, 1)  # Low risk
            confidence = np.clip(np.random.normal(0.82, 0.08), 0, 1)
            consequence = np.clip(np.random.normal(0.75, 0.10), 0, 1)

        elif modality == "PE":
            # Moderate safety, high feasibility for most variants
            safety = np.clip(np.random.normal(0.78, 0.07), 0, 1)
            feasibility = np.clip(np.random.normal(
                0.75 if cat == "clean_base_editable" else
                0.88 if cat == "pe_preferred" else
                0.65 if cat == "hdr_required" else 0.78, 0.10), 0, 1)
            complexity = np.clip(np.random.normal(0.45, 0.10), 0, 1)  # Moderate
            risk = np.clip(np.random.normal(0.25, 0.08), 0, 1)
            confidence = np.clip(np.random.normal(0.75, 0.10), 0, 1)
            consequence = np.clip(np.random.normal(0.82, 0.08), 0, 1)

        else:  # HDR
            # Low safety (DSBs), high feasibility for complex edits
            safety = np.clip(np.random.normal(0.35, 0.10), 0, 1)
            feasibility = np.clip(np.random.normal(
                0.60 if cat == "clean_base_editable" else
                0.70 if cat == "pe_preferred" else
                0.85 if cat == "hdr_required" else 0.72, 0.12), 0, 1)
            complexity = np.clip(np.random.normal(0.72, 0.12), 0, 1)  # High
            risk = np.clip(np.random.normal(0.55, 0.12), 0, 1)  # High risk
            confidence = np.clip(np.random.normal(0.60, 0.12), 0, 1)
            consequence = np.clip(np.random.normal(0.80, 0.10), 0, 1)

        # TOPSIS composite score (simplified: benefit criteria - cost criteria)
        # Weights from CRISPRArchitect v3: safety=0.30, feasibility=0.25,
        # complexity=0.15 (cost), risk=0.15 (cost), confidence=0.10, consequence=0.05
        topsis = (0.30 * safety + 0.25 * feasibility - 0.15 * complexity
                  - 0.15 * risk + 0.10 * confidence + 0.05 * consequence)

        records.append({
            "variant_id": vid,
            "gene": gene,
            "category": cat,
            "modality": modality,
            "safety_score": round(safety, 4),
            "feasibility_score": round(feasibility, 4),
            "complexity_score": round(complexity, 4),
            "risk_score": round(risk, 4),
            "confidence_score": round(confidence, 4),
            "consequence_score": round(consequence, 4),
            "topsis_composite": round(topsis, 4),
        })

df = pd.DataFrame(records)
df.to_csv("topsis_scores.csv", index=False)

print(f"Generated {len(df)} records ({len(df)//3} variants x 3 modalities)")
print(f"\nModality summary (TOPSIS composite):")
print(df.groupby("modality")["topsis_composite"].describe().round(4))
print(f"\nSaved to topsis_scores.csv")

# Also generate Monte Carlo rank stability data
mc_records = []
for vid in variant_ids:
    for perm_id in range(1000):
        # Simulate Dirichlet-sampled weight permutations
        weights = np.random.dirichlet([3, 2.5, 1.5, 1.5, 1, 0.5])
        scores = {}
        for mod in ["BE", "PE", "HDR"]:
            row = df[(df["variant_id"] == vid) & (df["modality"] == mod)].iloc[0]
            dims = [row.safety_score, row.feasibility_score, -row.complexity_score,
                    -row.risk_score, row.confidence_score, row.consequence_score]
            scores[mod] = sum(w * d for w, d in zip(weights, dims))

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        mc_records.append({
            "variant_id": vid,
            "permutation_id": perm_id,
            "rank_1": ranked[0][0],
            "rank_2": ranked[1][0],
            "rank_3": ranked[2][0],
        })

mc_df = pd.DataFrame(mc_records)
mc_df.to_csv("monte_carlo_ranks.csv", index=False)
print(f"\nGenerated {len(mc_df)} Monte Carlo records (30 variants x 1000 permutations)")
print(f"Saved to monte_carlo_ranks.csv")

# Rank stability summary
stability = mc_df.groupby("variant_id")["rank_1"].apply(
    lambda x: x.value_counts().max() / len(x)
).reset_index()
stability.columns = ["variant_id", "rank_stability"]
stability.to_csv("rank_stability.csv", index=False)
print(f"\nRank stability saved to rank_stability.csv")
print(stability.describe().round(4))
