#!/usr/bin/env node
/**
 * ESLint ratchet — errors always fail; warnings may never INCREASE.
 * ================================================================
 *
 * Replaces a bare `--max-warnings <N>` in package.json. The behaviour is the same in the case
 * that matters (more warnings than the baseline => non-zero exit), but two things that bit this
 * repo are fixed:
 *
 * 1. THE FAILURE IS ACTIONABLE. `--max-warnings` says only "1065 exceeds 1064". This prints the
 *    rules and files that grew, so whoever tripped it can see what they added without re-running
 *    eslint by hand and diffing counts. That matters because `frontend-lint` gates `docker-build`
 *    (ci.yml) -- a cryptic lint failure blocks a production image push.
 *
 * 2. THE BASELINE CANNOT SILENTLY RISE. `npm run lint:baseline` refuses to write a HIGHER number
 *    without `--force`. The old design relied on a human remembering both to lower the constant
 *    as debt burned down, and not to casually raise it when something failed -- and "remember to"
 *    is precisely the enforcement this codebase has repeatedly found does not hold. Lowering is
 *    automatic; raising is a deliberate, visible act.
 *
 * There is deliberately NO slack in the baseline. A buffer would let warnings accumulate
 * invisibly up to the cap, which is the same shape as the defect fixed in 2026-07-14b: eslint
 * was linting 0 of 469 .jsx files, so `--max-warnings 0` passed vacuously while real
 * temporal-dead-zone errors sat uncaught. A gate that cannot fail is not a gate.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_PATH = path.join(__dirname, '..', '.eslint-baseline.json');
const ESLINT_ARGS = ['eslint', 'src/', '--ext', '.js,.jsx,.ts,.tsx', '-f', 'json'];

function runESLint() {
  const res = spawnSync('npx', ESLINT_ARGS, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  });
  // eslint exits 1 when it reports errors, which is normal here — we do our own gating.
  // A missing binary or a crash gives no parseable stdout, and that must NOT read as "clean".
  const start = res.stdout ? res.stdout.indexOf('[') : -1;
  if (start === -1) {
    console.error('lint-ratchet: eslint produced no JSON report — treating as FAILURE.');
    console.error(res.stderr || '(no stderr)');
    process.exit(2);
  }
  try {
    return JSON.parse(res.stdout.slice(start));
  } catch (err) {
    console.error(`lint-ratchet: could not parse the eslint report (${err.message}) — FAILURE.`);
    process.exit(2);
  }
}

function summarise(report) {
  let errors = 0;
  let warnings = 0;
  const byRule = new Map();
  const byFile = new Map();
  const errorLines = [];
  for (const file of report) {
    const rel = file.filePath.split(`${path.sep}frontend${path.sep}`).pop();
    for (const m of file.messages) {
      const rule = m.ruleId || '(syntax)';
      if (m.severity === 2) {
        errors += 1;
        errorLines.push(`  ${rel}:${m.line}:${m.column}  ${rule}  ${m.message}`);
      } else {
        warnings += 1;
        byRule.set(rule, (byRule.get(rule) || 0) + 1);
        byFile.set(rel, (byFile.get(rel) || 0) + 1);
      }
    }
  }
  return { errors, warnings, byRule, byFile, errorLines };
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`lint-ratchet: no baseline at ${BASELINE_PATH}. Create it with:\n`
      + '  npm run lint:baseline -- --force');
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function top(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function main() {
  const updating = process.argv.includes('--update-baseline');
  const force = process.argv.includes('--force');

  const { errors, warnings, byRule, byFile, errorLines } = summarise(runESLint());

  if (updating) {
    const previous = fs.existsSync(BASELINE_PATH) ? readBaseline().warnings : Infinity;
    if (warnings > previous && !force) {
      console.error(
        `lint-ratchet: refusing to RAISE the baseline ${previous} -> ${warnings}.\n`
        + 'The ratchet exists so warning debt cannot grow quietly. Either fix the new warnings,\n'
        + 'or, if the increase is genuinely justified, say so explicitly:\n'
        + '  npm run lint:baseline -- --force        (and explain it in the commit message)'
      );
      process.exit(1);
    }
    fs.writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify({ warnings, note: 'Ratchet: may only go DOWN. See scripts/lint-ratchet.js.' }, null, 2)}\n`
    );
    console.log(`lint-ratchet: baseline ${previous === Infinity ? '(new)' : previous} -> ${warnings}`);
    return;
  }

  const baseline = readBaseline().warnings;

  if (errors > 0) {
    console.error(`lint-ratchet: ${errors} ERROR(S) — these always fail, regardless of the ratchet.\n`);
    console.error(errorLines.slice(0, 40).join('\n'));
    process.exit(1);
  }

  if (warnings > baseline) {
    console.error(
      `lint-ratchet: warnings ${warnings} exceed the baseline ${baseline} (+${warnings - baseline}).\n\n`
      + 'Most-reported rules right now:\n'
      + top(byRule, 6).map(([r, c]) => `  ${String(c).padStart(5)}  ${r}`).join('\n')
      + '\n\nFiles with the most warnings:\n'
      + top(byFile, 6).map(([f, c]) => `  ${String(c).padStart(5)}  ${f}`).join('\n')
      + '\n\nFix them, or add a narrowly-scoped eslint-disable with a reason. Raising the\n'
      + 'baseline is possible but deliberate: npm run lint:baseline -- --force'
    );
    process.exit(1);
  }

  if (warnings < baseline) {
    console.log(
      `lint-ratchet: ${warnings} warnings, ${baseline - warnings} BELOW the baseline (${baseline}).\n`
      + 'Lock the improvement in so it cannot regress:  npm run lint:baseline'
    );
    return;
  }

  console.log(`lint-ratchet: 0 errors, ${warnings} warnings (at the baseline).`);
}

main();
