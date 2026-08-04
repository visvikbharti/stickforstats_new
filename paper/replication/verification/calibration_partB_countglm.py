#!/usr/bin/env python3
"""
Calibration benchmark, Part B — count data: Guardian cascade vs count-GLMs
=========================================================================

Directly addresses BGPT review point 4.3 ("Mann-Whitney rerouting does not
replicate modern RNA-seq DE models; it changes the estimand"): on simulated
negative-binomial COUNT data with a known ground truth, compare the FDR control
and power of

  1. naive_student -- Student t-test on log-CPM (the paper's naive baseline)
  2. guardian      -- the REAL production DifferentialExpressionService on log-CPM
                      (Shapiro + Levene -> t / Welch / Mann-Whitney)
  3. edgeR         -- QL F-test on raw counts (R; field standard)
  4. DESeq2        -- Wald test on raw counts (R; field standard)

This quantifies the manuscript's Group B framing and the calibration limitation:
the assumption-safe rank cascade is expected to CONTROL FDR but lose POWER to
count-GLMs that model the count distribution directly.

Reproducible (fixed seed). Writes calibration_partB_results.json.
Run (needs R with edgeR+DESeq2): .venv-django/bin/python paper/replication/verification/calibration_partB_countglm.py
"""
from __future__ import annotations

import csv
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests

REPO = Path(__file__).resolve().parents[3]
GENOMICS_FILE = REPO / "backend" / "core" / "services" / "genomics" / "differential_expression.py"
RSCRIPT = REPO / "paper" / "replication" / "verification" / "calibration_partB_rmethods.R"

SEED = 20260706
G = 1000
PI_DE = 0.10
R_DATASETS = 20        # fewer than Part A: each R call (DESeq2) is ~seconds
ALPHA = 0.05
LFC = 0.585            # DE genes: log2 fold change ~ +/- 0.585 (1.5x) -- discriminating regime
DISP = 0.2            # NB dispersion (variance = mu + DISP*mu^2)
SAMPLE_SIZES = [(55, 36), (20, 20)]


def load_service():
    spec = importlib.util.spec_from_file_location("calB_genomics", GENOMICS_FILE)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m.DifferentialExpressionService


def simulate_counts(rng, n1, n2, is_de):
    """Negative-binomial counts, genes x samples. DE genes get +/-LFC in group2."""
    n = n1 + n2
    # gene baseline mean expression (counts), broad realistic range
    base_mu = np.exp(rng.normal(4.0, 1.6, size=G))          # median ~ e^4 ~ 55 reads
    base_mu = np.clip(base_mu, 2, 5e4)
    # per-sample library-size factor
    lib = np.exp(rng.normal(0, 0.15, size=n))
    # group-2 fold change for DE genes (random sign)
    sign = rng.choice([-1, 1], size=G)
    lfc = np.where(is_de, sign * LFC, 0.0)
    mu = np.empty((G, n))
    mu[:, :n1] = base_mu[:, None] * lib[None, :n1]
    mu[:, n1:] = (base_mu * (2.0 ** lfc))[:, None] * lib[None, n1:]
    # NB via gamma-Poisson: shape r = 1/DISP, scale = mu*DISP
    r = 1.0 / DISP
    gam = rng.gamma(shape=r, scale=mu * DISP)
    counts = rng.poisson(gam).astype(np.int64)
    return counts, is_de


def log_cpm(counts):
    lib = counts.sum(axis=0)
    cpm = counts / (lib / 1e6)[None, :]
    return np.log2(cpm + 1.0)


def bh(p):
    p = np.asarray(p, float)
    ok = np.isfinite(p)
    adj = np.ones_like(p)
    if ok.sum():
        adj[ok] = multipletests(p[ok], alpha=ALPHA, method="fdr_bh")[1]
    return adj


def run_r_methods(counts, labels):
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        cfile, gfile, ofile = td / "c.csv", td / "g.csv", td / "o.csv"
        # counts.csv: gene id + sample columns
        with cfile.open("w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["gene"] + [f"s{j}" for j in range(counts.shape[1])])
            for i in range(counts.shape[0]):
                w.writerow([f"g{i}"] + counts[i].tolist())
        with gfile.open("w", newline="") as f:
            w = csv.writer(f); w.writerow(["group"])
            for lab in labels:
                w.writerow([lab])
        subprocess.run(["Rscript", str(RSCRIPT), str(cfile), str(gfile), str(ofile)],
                       check=True, capture_output=True, text=True)
        edger = np.ones(counts.shape[0]); deseq = np.ones(counts.shape[0])
        with ofile.open() as f:
            for k, row in enumerate(csv.DictReader(f)):
                edger[k] = float(row["edger_padj"]); deseq[k] = float(row["deseq_padj"])
    return edger, deseq


def metrics(adj_p, is_de):
    disc = adj_p < ALPHA
    n_disc = int(disc.sum())
    fdp = float(np.mean((~is_de)[disc])) if n_disc else 0.0
    power = float(np.mean(disc[is_de])) if is_de.any() else float("nan")
    return fdp, power, n_disc


def main():
    Service = load_service()
    service = Service(
        # REQUIRED since the fold-change fix: this script feeds log2-CPM
        # values, so the service must not exponentiate them. It does not read
        # log2_fold_change at all (the calibration measures Type I error, FDR
        # and power from p-values), so this argument does not affect any number
        # this script reports -- but it must still describe the data truthfully.
        input_scale="log2",
        alpha=ALPHA,
        normality_alpha=ALPHA,
    )
    rng = np.random.RandomState(SEED)
    n_de = int(round(G * PI_DE))
    tmpl = np.zeros(G, bool); tmpl[:n_de] = True

    results = {}
    for (n1, n2) in SAMPLE_SIZES:
        labels = ["A"] * n1 + ["B"] * n2
        acc = {p: {"fdr": [], "power": []}
               for p in ["naive_student", "guardian", "edgeR", "DESeq2"]}
        for d in range(R_DATASETS):
            is_de = tmpl[rng.permutation(G)]
            counts, is_de = simulate_counts(rng, n1, n2, is_de)
            lcpm = log_cpm(counts)

            # naive t on log-CPM
            _, p = stats.ttest_ind(lcpm[:, :n1], lcpm[:, n1:], axis=1, equal_var=True)
            p = np.where(np.isfinite(p), p, 1.0)
            fdp, pw, _ = metrics(bh(p), is_de)
            acc["naive_student"]["fdr"].append(fdp); acc["naive_student"]["power"].append(pw)

            # guardian on log-CPM (production service)
            res = service.analyze(expression_matrix=lcpm,
                                  gene_names=[f"g{i}" for i in range(G)],
                                  group_labels=labels, group1_name="A", group2_name="B")
            gadj = np.array([g.adjusted_p_value for g in res.gene_results], float)
            gadj = np.where(np.isfinite(gadj), gadj, 1.0)
            fdp, pw, _ = metrics(gadj, is_de)
            acc["guardian"]["fdr"].append(fdp); acc["guardian"]["power"].append(pw)

            # edgeR + DESeq2 on raw counts (R)
            edger, deseq = run_r_methods(counts, labels)
            fdp, pw, _ = metrics(edger, is_de)
            acc["edgeR"]["fdr"].append(fdp); acc["edgeR"]["power"].append(pw)
            fdp, pw, _ = metrics(deseq, is_de)
            acc["DESeq2"]["fdr"].append(fdp); acc["DESeq2"]["power"].append(pw)

            if d == 0 or (d + 1) % 5 == 0:
                print(f"  n{n1}v{n2} dataset {d+1}/{R_DATASETS} done")

        szkey = f"n{n1}v{n2}"
        results[szkey] = {p: {k: round(float(np.mean(v)), 4) for k, v in dd.items()}
                          for p, dd in acc.items()}
        g = results[szkey]
        print(f"[{szkey}] FDR  naive={g['naive_student']['fdr']:.3f} guardian={g['guardian']['fdr']:.3f} "
              f"edgeR={g['edgeR']['fdr']:.3f} DESeq2={g['DESeq2']['fdr']:.3f}")
        print(f"[{szkey}] Power naive={g['naive_student']['power']:.3f} guardian={g['guardian']['power']:.3f} "
              f"edgeR={g['edgeR']['power']:.3f} DESeq2={g['DESeq2']['power']:.3f}")

    out = {"meta": {"seed": SEED, "G": G, "pi_de": PI_DE, "R_datasets": R_DATASETS,
                    "alpha": ALPHA, "lfc_log2": LFC, "nb_dispersion": DISP,
                    "sample_sizes": SAMPLE_SIZES}, "results": results}
    outpath = Path(__file__).with_name("calibration_partB_results.json")
    outpath.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {outpath.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
