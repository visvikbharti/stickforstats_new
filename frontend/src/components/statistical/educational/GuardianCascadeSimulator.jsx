import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Replay as ResetIcon,
  Casino as NewDrawIcon,
  Verified as VerifiedIcon,
  Security as ShieldIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';

import guardianService from '../../../services/GuardianService';

/**
 * GuardianCascadeSimulator
 * ========================
 * An interactive "Why one t-test isn't enough" lecture demo.
 *
 * This is a *fast in-browser Monte-Carlo* that reproduces the manuscript's
 * Figure 8 calibration benchmark (scenarios S1-S6, n = 55 vs 36 unbalanced,
 * alpha = 0.05). It hands the same simulated experiment to two analysts:
 *   - a "naive" analyst who always runs a pooled Student's t-test, and
 *   - the Guardian cascade, which checks assumptions first
 *     (normality -> variance) and only then picks the test
 *     (Student's t / Welch / Mann-Whitney).
 *
 * HONEST LABELLING (project integrity brand):
 *   The animated meters are computed by a self-contained JavaScript simulation
 *   that *reproduces* the backend calibration benchmark within Monte-Carlo
 *   error. They are NOT the production engine analysing your data. To make the
 *   equivalence auditable, the "Run this exact draw through the production
 *   Guardian" button POSTs the currently displayed two-sample draw to the REAL
 *   Guardian endpoint (POST /api/guardian/check/) and shows that the production
 *   engine returns the SAME routing decision (t / Welch / Mann-Whitney) as the
 *   in-browser cascade.
 *
 * Design system: MUI + tokens from theme.js via useTheme(). No hard-coded hex.
 * Accessibility: aria-pressed controls, visible keyboard focus (theme focus
 * ring), and prefers-reduced-motion is respected (the sim runs to completion
 * instantly instead of animating).
 *
 * Numerics (all standard, verified closed forms):
 *   Box-Muller normals; two-sample Student & Welch t via the regularized
 *   incomplete beta; Mann-Whitney U with the normal approximation;
 *   Brown-Forsythe (median-centred Levene); Jarque-Bera normality.
 */

/* ------------------------------------------------------------------ */
/* Numerics — pure module-scope functions (no React, no theme)         */
/* ------------------------------------------------------------------ */

function erf(x) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}
function phi(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}
function gammln(xx) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = xx;
  let y = xx;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y++;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
function betacf(a, b, x) {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}
function tpval(t, df) {
  // two-sided p-value for a t statistic
  if (df <= 0 || !isFinite(t)) return 1;
  const x = df / (df + t * t);
  return betai(df / 2, 0.5, x);
}
function mean(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}
function vari(a, m) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - m;
    s += d * d;
  }
  return s / (a.length - 1);
}
function studentP(a, b) {
  const n1 = a.length;
  const n2 = b.length;
  const m1 = mean(a);
  const m2 = mean(b);
  const v1 = vari(a, m1);
  const v2 = vari(b, m2);
  const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
  const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
  if (se === 0) return 1;
  return tpval((m1 - m2) / se, n1 + n2 - 2);
}
function welchP(a, b) {
  const n1 = a.length;
  const n2 = b.length;
  const m1 = mean(a);
  const m2 = mean(b);
  const v1 = vari(a, m1);
  const v2 = vari(b, m2);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) return 1;
  const df =
    Math.pow(v1 / n1 + v2 / n2, 2) /
    ((v1 * v1) / (n1 * n1 * (n1 - 1)) + (v2 * v2) / (n2 * n2 * (n2 - 1)));
  return tpval((m1 - m2) / se, df);
}
function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  const n = s.length;
  const h = n >> 1;
  return n % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}
function leveneP(a, b) {
  // Brown-Forsythe (median-centred) reduces, for two groups, to a t-test on
  // the absolute deviations from each group's median.
  const ma = median(a);
  const mb = median(b);
  const da = new Array(a.length);
  const db = new Array(b.length);
  for (let i = 0; i < a.length; i++) da[i] = Math.abs(a[i] - ma);
  for (let i = 0; i < b.length; i++) db[i] = Math.abs(b[i] - mb);
  return studentP(da, db);
}
function mwuP(a, b) {
  const n1 = a.length;
  const n2 = b.length;
  const all = [];
  for (let i = 0; i < n1; i++) all.push({ v: a[i], g: 0 });
  for (let i = 0; i < n2; i++) all.push({ v: b[i], g: 1 });
  all.sort((x, y) => x.v - y.v);
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].v === all[i].v) j++;
    const r = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) all[k].rank = r;
    i = j + 1;
  }
  let R1 = 0;
  for (let k = 0; k < all.length; k++) if (all[k].g === 0) R1 += all[k].rank;
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const sd = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sd === 0) return 1;
  return 2 * (1 - phi(Math.abs((U1 - mu) / sd)));
}
function jbNormalP(a) {
  const n = a.length;
  const m = mean(a);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - m;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  if (m2 === 0) return 1;
  const S = m3 / Math.pow(m2, 1.5);
  const K = m4 / (m2 * m2);
  const JB = (n / 6) * (S * S + 0.25 * (K - 3) * (K - 3));
  return Math.exp(-JB / 2); // chi2(2) upper tail, closed form
}

// Route codes: 0 = Student's t, 1 = Welch, 2 = Mann-Whitney
function guardianRoute(a, b) {
  if (jbNormalP(a) < 0.05 || jbNormalP(b) < 0.05) return { route: 2, p: mwuP(a, b) };
  if (leveneP(a, b) < 0.05) return { route: 1, p: welchP(a, b) };
  return { route: 0, p: studentP(a, b) };
}

/* ---- RNG + scenario samplers ---- */
const SEED0 = 20260706 >>> 0;
const PREVIEW_SEED0 = 424242 >>> 0;

function makeRng(seedObj) {
  // mulberry32-style deterministic PRNG; mutates seedObj.s
  return function rng() {
    let s = seedObj.s | 0;
    s = (s + 0x6d2b79f5) | 0;
    seedObj.s = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function randt(df, rng) {
  let s = 0;
  for (let i = 0; i < df; i++) {
    const z = randn(rng);
    s += z * z;
  }
  return randn(rng) / Math.sqrt(s / df);
}
const LN_M = Math.exp(0.405);
const LN_S = Math.sqrt((Math.exp(0.81) - 1) * Math.exp(0.81)); // sigma = 0.9, standardized
function logn(rng) {
  return (Math.exp(randn(rng) * 0.9) - LN_M) / LN_S;
}
function outlier(rng) {
  return rng() < 0.05 ? randn(rng) * 6 : randn(rng);
}

const N1 = 55; // Group A
const N2 = 36; // Group B (smaller group)

// scenario index -> generators for A and B; `shift` adds a real effect (power mode)
function drawGroups(sc, shift, rng) {
  const a = new Array(N1);
  const b = new Array(N2);
  let i;
  if (sc === 0) {
    for (i = 0; i < N1; i++) a[i] = randn(rng);
    for (i = 0; i < N2; i++) b[i] = randn(rng) + shift;
  } else if (sc === 1) {
    for (i = 0; i < N1; i++) a[i] = randn(rng);
    for (i = 0; i < N2; i++) b[i] = randn(rng) * 3 + shift; // unequal var (small grp wider)
  } else if (sc === 2) {
    for (i = 0; i < N1; i++) a[i] = randt(3, rng);
    for (i = 0; i < N2; i++) b[i] = randt(3, rng) + shift; // heavy tail
  } else if (sc === 3) {
    for (i = 0; i < N1; i++) a[i] = logn(rng);
    for (i = 0; i < N2; i++) b[i] = logn(rng) + shift; // skewed
  } else if (sc === 4) {
    for (i = 0; i < N1; i++) a[i] = outlier(rng);
    for (i = 0; i < N2; i++) b[i] = outlier(rng) + shift; // outliers
  } else {
    for (i = 0; i < N1; i++) a[i] = randt(3, rng);
    for (i = 0; i < N2; i++) b[i] = randt(3, rng) * 3 + shift; // hetero + heavy
  }
  return { a, b };
}

/* ---- scenario metadata (mirrors the manuscript Fig 8, Part A) ---- */
const SCENARIOS = [
  {
    id: 0,
    label: 'S1 · clean',
    sub: 'normal, equal variance',
    badge: 'S1',
    limit: false,
    title: 'Assumptions hold — the gate stays out of the way.',
    text:
      'Normal, equal variance. The naive t-test is already valid, so Guardian mostly leaves it as Student’s t. Both sit near the 0.05 line: the gate does no harm when there is nothing to catch.',
    paperNaive: '0.049',
    paperGuard: '0.051',
    route: '86% Student',
    hint: 'Both groups are clean and equally spread — nothing for the gate to catch.',
  },
  {
    id: 1,
    label: 'S2 · unequal variance',
    sub: 'the RNA-seq case',
    badge: 'S2',
    limit: false,
    title: 'The headline: variance heterogeneity in an unbalanced design.',
    text:
      'The smaller group (n=36) is three times as spread. The pooled t-test’s false-positive rate roughly doubles to ~0.10 (FDR blows out ~3.6x) — the exact shape of the RNA-seq case study. Guardian’s Levene check catches it and routes ~90% to Welch, pulling control back to ~0.06.',
    paperNaive: '0.100',
    paperGuard: '0.058',
    route: '90% Welch',
    hint: 'Group B (n=36) is about 3x as spread as A — the variance gap the pooled t-test ignores.',
  },
  {
    id: 2,
    label: 'S3 · heavy tails',
    sub: 't₃ noise',
    badge: 'S3',
    limit: false,
    title: 'Heavy tails — here the payoff is power, not Type I.',
    text:
      'With t₃ noise, both tests keep false positives near nominal, so the meters look similar. The gate’s real value shows in Power mode: normality fails, Guardian routes to Mann-Whitney, and recovers sensitivity the t-test leaves on the table.',
    paperNaive: '0.046',
    paperGuard: '0.049',
    route: '84% Mann-Whitney',
    hint: 'Heavy tails: most points cluster tightly, but a few land far out.',
  },
  {
    id: 3,
    label: 'S4 · skewed',
    sub: 'log-normal',
    badge: 'S4',
    limit: false,
    title: 'Skewed (log-normal) — rerouted, still controlled.',
    text:
      'Normality fails on both groups, so Guardian sends essentially everything to Mann-Whitney. False positives stay controlled; switch to Power mode to see the sensitivity it buys.',
    paperNaive: '0.048',
    paperGuard: '0.052',
    route: '100% Mann-Whitney',
    hint: 'Skewed — a long tail on one side breaks the normality assumption.',
  },
  {
    id: 4,
    label: 'S5 · outliers',
    sub: '5% contamination',
    badge: 'S5',
    limit: false,
    title: 'Gross outliers — Guardian recovers lost power.',
    text:
      '5% of points are wild. Both control Type I, but the outliers quietly cost the t-test power. Guardian’s Mann-Whitney routing is robust to them — this is a power win, best seen in Power mode.',
    paperNaive: '0.046',
    paperGuard: '0.049',
    route: '86% Mann-Whitney',
    hint: 'Mostly tidy, but about 5% of points fly far from the rest.',
  },
  {
    id: 5,
    label: 'S6 · both',
    sub: 'hetero + heavy · the limit',
    badge: 'S6',
    limit: true,
    title: 'The honest limit — and why variance-aware routing is the fix.',
    text:
      'Data are heteroscedastic and heavy-tailed. Guardian routes on normality first, so it sends ~84% to Mann-Whitney — which is itself variance-sensitive — and only partly fixes the inflation (~0.09 -> ~0.08). A fixed always-Welch default would do better here. We report this rather than hide it: the benchmark names variance-aware routing as the fix.',
    paperNaive: '0.094',
    paperGuard: '0.080',
    route: '84% Mann-Whitney',
    hint: 'Wide and heavy-tailed at once — the hardest case, and the honest limit.',
  },
];

const ROUTE_LABELS = ["Student's t", 'Welch', 'Mann-Whitney'];

const TARGET = 4000;
const POWER_SHIFT = 0.55;
const DOTCAP = 600;
const BATCH = 8;

function freshSim() {
  return {
    expCount: 0,
    nNaiveSig: 0,
    nGuardSig: 0,
    route: [0, 0, 0],
    naiveDots: [],
    guardDots: [],
  };
}

function fmt3(x) {
  return (Math.round(x * 1000) / 1000).toFixed(3);
}

/* Map the production Guardian report -> the same cascade routing decision the
 * in-browser sim makes (normality first, then variance). This mirrors the
 * DifferentialExpressionService cascade (Shapiro -> Levene -> t/Welch/MWU). */
function deriveRouteFromGuardian(report) {
  const violated = new Set((report && report.violations ? report.violations : []).map((v) => v.assumption));
  let normalityP = null;
  let varianceP = null;
  (report && report.violations ? report.violations : []).forEach((v) => {
    if (v.assumption === 'normality' && v.p_value != null) normalityP = v.p_value;
    if (v.assumption === 'variance_homogeneity' && v.p_value != null) varianceP = v.p_value;
  });
  if (violated.has('normality')) return { route: 2, normalityP, varianceP };
  if (violated.has('variance_homogeneity')) return { route: 1, normalityP, varianceP };
  return { route: 0, normalityP, varianceP };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const GuardianCascadeSimulator = () => {
  const theme = useTheme();

  // Theme-mapped palette for the canvases (NO hard-coded hex).
  const pal = useMemo(
    () => ({
      accent: theme.palette.primary.main,
      error: theme.palette.error.main,
      success: theme.palette.success.main,
      warning: theme.palette.warning.main,
      student: theme.palette.text.secondary,
      welch: theme.palette.secondary.main,
      mwu: theme.palette.info.main,
      faint: theme.palette.text.disabled,
      divider: theme.palette.divider,
      subtle: theme.palette.background.subtle || theme.palette.background.default,
    }),
    [theme]
  );
  const routeColors = [pal.student, pal.welch, pal.mwu];

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }, []);

  /* ---- UI state ---- */
  const [scenario, setScenario] = useState(1); // default S2 (the headline)
  const [mode, setMode] = useState(0); // 0 = Type I (H0), 1 = Power
  const [running, setRunning] = useState(true);
  const [readout, setReadout] = useState({
    count: 0,
    naiveRate: 0,
    guardRate: 0,
    routePct: [0, 0, 0],
    status: 'running',
  });
  const [previewSimRoute, setPreviewSimRoute] = useState(null); // route on the displayed draw

  // Backend anchor state
  const [anchor, setAnchor] = useState({ status: 'idle' }); // idle|loading|done|error

  /* ---- mutable refs driving the imperative animation ---- */
  const simRef = useRef(freshSim());
  const scRef = useRef(scenario);
  const modeRef = useRef(mode);
  const runningRef = useRef(running);
  const rafRef = useRef(null);

  const seedObjRef = useRef({ s: SEED0 });
  const rngRef = useRef(null);
  if (!rngRef.current) rngRef.current = makeRng(seedObjRef.current);

  const previewSeedObjRef = useRef({ s: PREVIEW_SEED0 });
  const previewRngRef = useRef(null);
  if (!previewRngRef.current) previewRngRef.current = makeRng(previewSeedObjRef.current);
  const previewDrawRef = useRef({ a: [], b: [] });

  const naiveCanvasRef = useRef(null);
  const guardCanvasRef = useRef(null);
  const histCanvasRef = useRef(null);

  /* ---- canvas helpers ---- */
  const sizeCanvas = useCallback((c) => {
    if (!c || typeof c.getContext !== 'function') return null;
    const ctx = c.getContext('2d');
    if (!ctx) return null; // jsdom / unsupported
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    const w = c.clientWidth || 300;
    const h = c.clientHeight || 96;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }, []);

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawMatrix = useCallback(
    (canvas, dots, sigColor) => {
      const g = sizeCanvas(canvas);
      if (!g) return;
      const { ctx, w, h } = g;
      ctx.clearRect(0, 0, w, h);
      const cell = 8;
      const gap = 3;
      const step = cell + gap;
      const cols = Math.max(1, Math.floor((w + gap) / step));
      const rows = Math.max(1, Math.floor((h + gap) / step));
      const cap = cols * rows;
      const show = dots.length > cap ? dots.slice(dots.length - cap) : dots;
      for (let i = 0; i < show.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * step;
        const y = row * step;
        if (show[i]) {
          ctx.fillStyle = sigColor;
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = pal.faint;
          ctx.globalAlpha = 0.28;
        }
        roundRect(ctx, x, y, cell, cell, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    [pal.faint, sizeCanvas]
  );

  const quantile = (s, q) => {
    const pos = (s.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return s[lo];
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  };

  const renderHist = useCallback(
    (a, b) => {
      const canvas = histCanvasRef.current;
      const g = sizeCanvas(canvas);
      if (!g) return;
      const { ctx, w, h } = g;
      ctx.clearRect(0, 0, w, h);
      if (!a.length || !b.length) return;
      const comb = a.concat(b).sort((x, y) => x - y);
      let lo = quantile(comb, 0.01);
      let hi = quantile(comb, 0.99);
      if (hi - lo < 1e-9) {
        lo -= 1;
        hi += 1;
      }
      const pad = (hi - lo) * 0.06;
      lo -= pad;
      hi += pad;
      const NB = 34;
      const bw = (hi - lo) / NB;
      const ha = new Array(NB).fill(0);
      const hb = new Array(NB).fill(0);
      const bin = (arr, target) => {
        for (let i = 0; i < arr.length; i++) {
          let idx = Math.floor((arr[i] - lo) / bw);
          if (idx < 0) idx = 0;
          if (idx >= NB) idx = NB - 1;
          target[idx]++;
        }
      };
      bin(a, ha);
      bin(b, hb);
      const maxa = Math.max.apply(null, ha) || 1;
      const maxb = Math.max.apply(null, hb) || 1;
      const base = h - 2;
      const top = 6;
      const plotH = base - top;
      const cw = w / NB;
      ctx.strokeStyle = pal.divider;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, base + 0.5);
      ctx.lineTo(w, base + 0.5);
      ctx.stroke();
      const bars = (hist, mx, color) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.55;
        for (let k = 0; k < NB; k++) {
          const bh = (hist[k] / mx) * plotH;
          if (bh <= 0) continue;
          ctx.fillRect(k * cw + 0.5, base - bh, Math.max(1, cw - 1), bh);
        }
        ctx.globalAlpha = 1;
      };
      bars(hb, maxb, pal.welch);
      bars(ha, maxa, pal.accent);
    },
    [pal.accent, pal.divider, pal.welch, sizeCanvas]
  );

  /* ---- draw a fresh preview draw (a representative single experiment) ---- */
  const regeneratePreview = useCallback(() => {
    const shift = modeRef.current === 1 ? POWER_SHIFT : 0;
    const d = drawGroups(scRef.current, shift, previewRngRef.current);
    previewDrawRef.current = d;
    renderHist(d.a, d.b);
    setPreviewSimRoute(guardianRoute(d.a, d.b).route);
    setAnchor({ status: 'idle' }); // a new draw invalidates any prior backend verdict
  }, [renderHist]);

  /* ---- one Monte-Carlo experiment (mutates simRef) ---- */
  const oneExperiment = useCallback(() => {
    const sim = simRef.current;
    const shift = modeRef.current === 1 ? POWER_SHIFT : 0;
    const d = drawGroups(scRef.current, shift, rngRef.current);
    const pn = studentP(d.a, d.b);
    const g = guardianRoute(d.a, d.b);
    sim.route[g.route]++;
    const nSig = pn < 0.05;
    const gSig = g.p < 0.05;
    if (nSig) sim.nNaiveSig++;
    if (gSig) sim.nGuardSig++;
    sim.naiveDots.push(nSig);
    sim.guardDots.push(gSig);
    if (sim.naiveDots.length > DOTCAP) sim.naiveDots.shift();
    if (sim.guardDots.length > DOTCAP) sim.guardDots.shift();
    sim.expCount++;
  }, []);

  const pushReadout = useCallback(() => {
    const sim = simRef.current;
    const rn = sim.expCount ? sim.nNaiveSig / sim.expCount : 0;
    const rg = sim.expCount ? sim.nGuardSig / sim.expCount : 0;
    const tot = sim.route[0] + sim.route[1] + sim.route[2];
    const routePct = tot
      ? [sim.route[0] / tot, sim.route[1] / tot, sim.route[2] / tot]
      : [0, 0, 0];
    let status;
    if (sim.expCount >= TARGET) status = `converged (${TARGET.toLocaleString()} tests)`;
    else status = runningRef.current ? 'running' : 'paused';
    setReadout({ count: sim.expCount, naiveRate: rn, guardRate: rg, routePct, status });
  }, []);

  const paintDots = useCallback(() => {
    const sim = simRef.current;
    const sigColor = modeRef.current === 1 ? pal.success : pal.error;
    drawMatrix(naiveCanvasRef.current, sim.naiveDots, sigColor);
    drawMatrix(guardCanvasRef.current, sim.guardDots, sigColor);
  }, [drawMatrix, pal.error, pal.success]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = null;
  }, []);

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const sim = simRef.current;
    if (sim.expCount >= TARGET) {
      runningRef.current = false;
      setRunning(false);
      pushReadout();
      return;
    }
    for (let i = 0; i < BATCH && sim.expCount < TARGET; i++) oneExperiment();
    pushReadout();
    paintDots();
    if (typeof requestAnimationFrame !== 'undefined') {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [oneExperiment, paintDots, pushReadout]);

  const runToEndInstant = useCallback(() => {
    const sim = simRef.current;
    while (sim.expCount < TARGET) oneExperiment();
    runningRef.current = false;
    setRunning(false);
    pushReadout();
    paintDots();
  }, [oneExperiment, paintDots, pushReadout]);

  const startAnimation = useCallback(() => {
    stopLoop();
    if (prefersReducedMotion || typeof requestAnimationFrame === 'undefined') {
      runToEndInstant();
    } else {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [loop, prefersReducedMotion, runToEndInstant, stopLoop]);

  /* ---- reset + start on scenario / mode change ---- */
  const resetAndRun = useCallback(() => {
    stopLoop();
    simRef.current = freshSim();
    seedObjRef.current.s = SEED0;
    runningRef.current = true;
    setRunning(true);
    pushReadout();
    paintDots();
    regeneratePreview();
    startAnimation();
  }, [paintDots, pushReadout, regeneratePreview, startAnimation, stopLoop]);

  // Keep scenario/mode refs in sync, then reset the simulation.
  useEffect(() => {
    scRef.current = scenario;
    modeRef.current = mode;
    resetAndRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, mode]);

  // Repaint canvases when the theme palette changes (light/dark toggle).
  useEffect(() => {
    paintDots();
    if (previewDrawRef.current.a.length) {
      renderHist(previewDrawRef.current.a, previewDrawRef.current.b);
    }
  }, [paintDots, renderHist, pal]);

  // Repaint on resize.
  useEffect(() => {
    const onResize = () => {
      paintDots();
      if (previewDrawRef.current.a.length) {
        renderHist(previewDrawRef.current.a, previewDrawRef.current.b);
      }
    };
    if (typeof window !== 'undefined') window.addEventListener('resize', onResize);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
    };
  }, [paintDots, renderHist]);

  // Cleanup on unmount.
  useEffect(() => stopLoop, [stopLoop]);

  /* ---- control handlers ---- */
  const toggleRun = () => {
    const sim = simRef.current;
    if (running) {
      runningRef.current = false;
      setRunning(false);
      stopLoop();
      pushReadout();
    } else {
      if (sim.expCount >= TARGET) {
        // "Run again" -> reset
        simRef.current = freshSim();
        seedObjRef.current.s = SEED0;
      }
      runningRef.current = true;
      setRunning(true);
      startAnimation();
    }
  };

  const handleReset = () => {
    resetAndRun();
  };

  const handleScenario = (_e, val) => {
    if (val == null) return;
    setScenario(val);
  };
  const handleMode = (_e, val) => {
    if (val == null) return;
    setMode(val);
  };

  /* ---- backend anchor: send the displayed draw to the REAL Guardian ---- */
  const runBackendAnchor = useCallback(async () => {
    const draw = previewDrawRef.current;
    if (!draw.a.length || !draw.b.length) return;
    const simRoute = guardianRoute(draw.a, draw.b).route;
    setAnchor({ status: 'loading' });
    try {
      const report = await guardianService.checkAssumptions(
        { group1: draw.a, group2: draw.b },
        't_test',
        0.05
      );
      if (report && report.error) throw new Error(report.error);
      const backend = deriveRouteFromGuardian(report);
      setAnchor({
        status: 'done',
        backendRoute: backend.route,
        simRoute,
        match: backend.route === simRoute,
        normalityP: backend.normalityP,
        varianceP: backend.varianceP,
        confidence: report ? report.confidence_score : null,
      });
    } catch (err) {
      setAnchor({
        status: 'error',
        message:
          (err && err.message) ||
          'Could not reach the production Guardian endpoint (/api/guardian/check/).',
      });
    }
  }, []);

  /* ---- derived render values ---- */
  const sc = SCENARIOS[scenario];
  const isPower = mode === 1;
  const rateLabel = isPower ? 'power (true-positive rate)' : 'false-positive rate';
  const maxScale = 0.2;

  const guardRateColor = isPower
    ? pal.success
    : readout.guardRate <= 0.065
    ? pal.success
    : readout.guardRate <= 0.09
    ? pal.warning
    : pal.error;

  const canvasSx = { width: '100%', height: 96, display: 'block', borderRadius: 1, mt: 0.5 };

  const routeRows = [
    { name: "Student's t", color: pal.student, pct: readout.routePct[0] },
    { name: 'Welch', color: pal.welch, pct: readout.routePct[1] },
    { name: 'Mann-Whitney', color: pal.mwu, pct: readout.routePct[2] },
  ];

  const monoFont =
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}
      data-testid="guardian-cascade-simulator"
    >
      {/* Masthead */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ShieldIcon fontSize="small" color="primary" />
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', letterSpacing: '0.12em' }}
        >
          Interactive lecture — live Monte-Carlo
        </Typography>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 650, letterSpacing: '-0.01em' }}>
        Why one t-test isn&rsquo;t enough
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '64ch' }}>
        The same simulated experiment is handed to two analysts. One always runs the textbook
        pooled <b>Student&rsquo;s t-test</b>; the other runs the <b>Guardian cascade</b> — it checks
        the assumptions first, then chooses the test. Watch the false-positive rate as experiments
        pile up.
      </Typography>
      <Alert severity="info" icon={<BoltIcon fontSize="inherit" />} sx={{ mt: 1.5 }}>
        These meters are a <b>fast in-browser simulation that reproduces the backend calibration
        benchmark</b> (manuscript Fig 8) within Monte-Carlo error — not the production engine
        analysing your data. Use the button below to send the displayed draw through the{' '}
        <b>real</b> Guardian and verify the routing matches.
      </Alert>

      <Divider sx={{ my: 2.5 }} />

      {/* Controls */}
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.disabled', fontWeight: 600, mb: 0.5 }}
      >
        THE DATA VIOLATES AN ASSUMPTION — PICK WHICH ONE
      </Typography>
      <ToggleButtonGroup
        value={scenario}
        exclusive
        onChange={handleScenario}
        size="small"
        aria-label="scenario"
        sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { borderRadius: 1, m: 0 } }}
      >
        {SCENARIOS.map((s) => (
          <ToggleButton
            key={s.id}
            value={s.id}
            aria-label={s.label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textTransform: 'none',
              px: 1.25,
              py: 0.75,
              lineHeight: 1.2,
              ...(s.limit && {
                '&.Mui-selected': {
                  borderColor: 'warning.main',
                  boxShadow: `inset 0 0 0 1px ${theme.palette.warning.main}`,
                },
              }),
            }}
          >
            <Box sx={{ fontFamily: monoFont, fontWeight: 600, fontSize: 12 }}>{s.label}</Box>
            <Box sx={{ fontSize: 10.5, color: 'text.disabled' }}>{s.sub}</Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box
        sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.disabled', fontWeight: 600, mb: 0.5 }}
          >
            WHAT WE&rsquo;RE MEASURING
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleMode}
            size="small"
            aria-label="measurement mode"
          >
            <ToggleButton value={0} sx={{ textTransform: 'none' }}>
              False positives (H&#8320; true)
            </ToggleButton>
            <ToggleButton value={1} sx={{ textTransform: 'none' }}>
              Power (real effect)
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box
          sx={{
            ml: { sm: 'auto' },
            fontFamily: monoFont,
            fontSize: 12,
            color: 'text.secondary',
          }}
        >
          <b style={{ color: theme.palette.text.primary }}>
            {readout.count.toLocaleString()}
          </b>{' '}
          experiments &nbsp;·&nbsp; {readout.status}
        </Box>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={toggleRun}
          startIcon={running ? <PauseIcon /> : <PlayIcon />}
        >
          {running ? 'Pause' : readout.count >= TARGET ? 'Run again' : 'Run'}
        </Button>
        <Button variant="outlined" onClick={handleReset} startIcon={<ResetIcon />}>
          Reset
        </Button>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 14px',
            fontFamily: monoFont,
            fontSize: 11.5,
            color: 'text.disabled',
          }}
        >
          <span>
            <b>n</b> = 55 vs 36 (unbalanced)
          </span>
          <span>
            <b>&alpha;</b> = 0.05
          </span>
          <span>
            <b>H&#8320;</b>: no true difference
          </span>
        </Box>
      </Box>

      {running && !prefersReducedMotion && (
        <Box sx={{ mt: 1.5 }}>
          <LinearProgressLike value={Math.min(readout.count / TARGET, 1)} />
        </Box>
      )}

      {/* Data preview */}
      <Paper variant="outlined" sx={{ mt: 2.5, p: 1.75, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            mb: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontWeight: 600 }}
          >
            THE DATA BOTH ANALYSTS RECEIVE — ONE RANDOM DRAW
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, fontFamily: monoFont, fontSize: 11.5 }}>
            <LegendSwatch color={pal.accent} label="Group A · n=55" />
            <LegendSwatch color={pal.welch} label="Group B · n=36" />
          </Box>
        </Box>
        <canvas ref={histCanvasRef} style={{ width: '100%', height: 104, display: 'block' }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {sc.hint}
          {isPower ? ' Group B is also shifted right — a real effect to detect.' : ''}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Button size="small" variant="text" onClick={regeneratePreview} startIcon={<NewDrawIcon />}>
            New draw
          </Button>
        </Box>
      </Paper>

      {/* Bench: naive vs guardian */}
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        {/* Naive */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'error.main' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h6">Na&iuml;ve analyst</Typography>
            <Typography variant="caption" sx={{ fontFamily: monoFont, color: 'text.disabled' }}>
              ALWAYS STUDENT&rsquo;S T
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Runs one pooled t-test, no questions asked.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Box
              sx={{
                fontFamily: monoFont,
                fontSize: 34,
                fontWeight: 600,
                lineHeight: 1,
                color: isPower ? 'text.primary' : 'error.main',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt3(readout.naiveRate)}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {rateLabel}
            </Typography>
          </Box>
          <Meter value={readout.naiveRate} max={maxScale} color={pal.error} showTarget={!isPower} pal={pal} />
          <canvas ref={naiveCanvasRef} style={canvasSx} />
        </Paper>

        {/* Guardian */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h6">Guardian cascade</Typography>
            <Typography variant="caption" sx={{ fontFamily: monoFont, color: 'text.disabled' }}>
              ASSUMPTION-GATED
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Shapiro &rarr; Levene &rarr; picks t / Welch / Mann-Whitney.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Box
              sx={{
                fontFamily: monoFont,
                fontSize: 34,
                fontWeight: 600,
                lineHeight: 1,
                color: guardRateColor,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt3(readout.guardRate)}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {rateLabel}
            </Typography>
          </Box>
          <Meter value={readout.guardRate} max={maxScale} color={guardRateColor} showTarget={!isPower} pal={pal} />
          <canvas ref={guardCanvasRef} style={canvasSx} />

          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.disabled', fontWeight: 600, mt: 2, mb: 1 }}
          >
            WHERE GUARDIAN ROUTED EACH TEST
          </Typography>
          {routeRows.map((r) => (
            <Box key={r.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Box
                sx={{
                  width: 96,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  color: 'text.secondary',
                  fontSize: 12,
                }}
              >
                <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: r.color, flex: 'none' }} />
                {r.name}
              </Box>
              <Box sx={{ flex: 1, height: 7, borderRadius: '4px', bgcolor: pal.subtle, overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    borderRadius: '4px',
                    bgcolor: r.color,
                    width: `${r.pct * 100}%`,
                    transition: prefersReducedMotion ? 'none' : 'width 0.3s ease',
                  }}
                />
              </Box>
              <Box
                sx={{
                  width: 38,
                  textAlign: 'right',
                  fontFamily: monoFont,
                  fontSize: 11.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(r.pct * 100)}%
              </Box>
            </Box>
          ))}
        </Paper>
      </Box>

      {/* Verdict */}
      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          borderLeft: '3px solid',
          borderLeftColor: sc.limit ? 'warning.main' : 'primary.main',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            label={sc.badge}
            size="small"
            color={sc.limit ? 'warning' : 'primary'}
            variant={sc.limit ? 'outlined' : 'filled'}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
            {sc.title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '74ch' }}>
          {sc.text}
        </Typography>
      </Paper>

      {/* Published-benchmark strip (Type I mode only) */}
      {!isPower && (
        <Paper
          variant="outlined"
          sx={{
            mt: 1.5,
            p: 1.75,
            borderRadius: 2,
            borderStyle: 'dashed',
            bgcolor: 'background.subtle',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block', mb: 0.5 }}>
            COMPARED AGAINST THE PUBLISHED BENCHMARK (FIG 8, PART A)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 18px' }}>
            <BenchStat k="Naïve, reported:" v={sc.paperNaive} monoFont={monoFont} />
            <Box sx={{ color: 'text.disabled' }}>&rarr;</Box>
            <BenchStat k="Guardian, reported:" v={sc.paperGuard} monoFont={monoFont} />
            <BenchStat k="routed:" v={sc.route} monoFont={monoFont} sx={{ ml: { sm: 'auto' } }} />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.75 }}>
            Your live rates should settle near these. The Type I error of a two-sample null test is
            exactly what the benchmark&rsquo;s per-gene null measures — so the simulation reproduces
            the paper. Bharti &amp; Chakraborty, calibration benchmark, seed 20260706.
          </Typography>
        </Paper>
      )}

      {/* Backend anchor — the verification feature */}
      <Paper
        variant="outlined"
        sx={{ mt: 2, p: 2, borderRadius: 2, borderLeft: '3px solid', borderLeftColor: 'secondary.main' }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 650, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon fontSize="small" color="secondary" />
          Verify against the production Guardian
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: '74ch' }}>
          The in-browser cascade routes the displayed draw to{' '}
          <b>{previewSimRoute != null ? ROUTE_LABELS[previewSimRoute] : '—'}</b>. Press the button to
          POST that exact two-sample draw to the real engine at{' '}
          <code style={{ fontFamily: monoFont }}>/api/guardian/check/</code> and confirm the
          production Guardian makes the same decision.
        </Typography>
        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={runBackendAnchor}
            disabled={anchor.status === 'loading'}
            startIcon={
              anchor.status === 'loading' ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <VerifiedIcon />
              )
            }
          >
            {anchor.status === 'loading'
              ? 'Checking…'
              : 'Run this exact draw through the production Guardian'}
          </Button>
        </Box>

        {anchor.status === 'done' && (
          <Alert
            severity={anchor.match ? 'success' : 'warning'}
            sx={{ mt: 1.5 }}
            icon={anchor.match ? <VerifiedIcon fontSize="inherit" /> : undefined}
          >
            <AlertTitle>
              {anchor.match
                ? 'Match — production engine agrees with the simulation'
                : 'Different route on this draw'}
            </AlertTitle>
            In-browser cascade routed to <b>{ROUTE_LABELS[anchor.simRoute]}</b>; the production
            Guardian routed to <b>{ROUTE_LABELS[anchor.backendRoute]}</b>.
            {anchor.normalityP != null && (
              <>
                {' '}
                Backend normality p={anchor.normalityP.toFixed(4)}.
              </>
            )}
            {anchor.varianceP != null && (
              <>
                {' '}
                Levene p={anchor.varianceP.toFixed(4)}.
              </>
            )}
            {!anchor.match && (
              <>
                {' '}
                Borderline draws can differ because the engine uses Shapiro-Wilk while the sim uses
                Jarque-Bera for normality — press <b>New draw</b> to try another.
              </>
            )}
          </Alert>
        )}
        {anchor.status === 'error' && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            <AlertTitle>Guardian endpoint unreachable</AlertTitle>
            {anchor.message} The simulation above is unaffected — it runs entirely in your browser.
          </Alert>
        )}
      </Paper>

      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 2.5, color: 'text.disabled', fontFamily: monoFont }}
      >
        This component is Figure 8 of the manuscript, made interactive — the same S1–S6 scenarios,
        the same cascade, the same honest S6 caveat. A reviewer can reproduce the headline result by
        pressing Run.
      </Typography>
    </Paper>
  );
};

/* ------------------------------------------------------------------ */
/* Small presentational sub-components                                 */
/* ------------------------------------------------------------------ */

function LegendSwatch({ color, label }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: color, opacity: 0.7 }} />
      {label}
    </Box>
  );
}

function BenchStat({ k, v, monoFont, sx }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, ...sx }}>
      <Typography component="span" variant="body2" color="text.secondary">
        {k}
      </Typography>
      <Box component="span" sx={{ fontFamily: monoFont, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {v}
      </Box>
    </Box>
  );
}

// A meter bar with an optional 5% target marker (avoids MUI LinearProgress so
// we can colour-code and place the target tick).
function Meter({ value, max, color, showTarget, pal }) {
  const pct = Math.min(value / max, 1) * 100;
  const targetPct = (0.05 / max) * 100;
  return (
    <Box sx={{ mt: 1.25, mb: 1.25 }}>
      <Box
        sx={{
          position: 'relative',
          height: 10,
          borderRadius: '5px',
          bgcolor: pal.subtle,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'visible',
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: '5px 0 0 5px',
            bgcolor: color,
            width: `${pct}%`,
            transition: 'width 0.18s ease',
          }}
        />
        {showTarget && (
          <Tooltip title="5% target">
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                bottom: -4,
                left: `${targetPct}%`,
                width: 2,
                borderRadius: '2px',
                bgcolor: 'warning.main',
              }}
            />
          </Tooltip>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9.5,
          color: 'text.disabled',
          mt: 0.5,
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <span>0</span>
        <span>0.10</span>
        <span>0.20</span>
      </Box>
    </Box>
  );
}

// Lightweight determinate progress that respects the theme without pulling in
// animation; used only while the sim is running.
function LinearProgressLike({ value }) {
  return (
    <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
      <Box
        sx={{
          height: '100%',
          bgcolor: 'primary.main',
          width: `${Math.round(value * 100)}%`,
          transition: 'width 0.2s ease',
        }}
      />
    </Box>
  );
}

export default GuardianCascadeSimulator;
