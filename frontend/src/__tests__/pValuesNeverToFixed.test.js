/**
 * No code the site loads prints a p-value with toFixed.
 *
 * toFixed(4) prints p = 7.76e-8 as "0.0000", which reads as exactly zero; the t-test page did
 * this on the live site on 24 October 2026. p-values go through formatPValue / formatPClause
 * (utils/formatStats.js), which use significant figures below 0.001.
 *
 * The test follows the imports from src/index.js, so it covers the code the site can load and
 * nothing else, and fails on any `.toFixed(` or `.toPrecision(` whose receiver is named like a
 * p-value (p_value, pValue, adjustedPValues, normalityP, reported_p, ...), unless the line or one
 * of the three before it handles small values itself (`p < 0.001 ? ...`).
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const EXTENSIONS = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];
const RELATIVE_IMPORT =
  /(?:import\s+(?:[^'"]*?\s+from\s+)?|import\s*\(\s*|require\s*\(\s*|export\s+[^'"]*?\s+from\s+)['"](\.{1,2}\/[^'"]+)['"]/g;

/** Blank out comments, keeping line numbers and `http://`. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function reachableFiles() {
  const seen = new Set();
  const stack = [path.join(SRC, 'index.js')];
  while (stack.length) {
    const file = stack.pop();
    if (!seen.has(file)) {
      seen.add(file);
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const m of src.matchAll(RELATIVE_IMPORT)) {
        const base = path.resolve(path.dirname(file), m[1]);
        const hit = EXTENSIONS.map((e) => base + e).find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
        if (hit && /\.(jsx?|tsx?)$/.test(hit)) stack.push(hit);
      }
    }
  }
  return [...seen].filter((f) => !/__tests__|\.test\./.test(f));
}

// Named like a p-value. Not the bare `p` of a binomial distribution, nor cp, pp or np.
const isPValueName = (name) =>
  /p_?values?$/i.test(name) || // p_value, pValue(s), adjustedPValues, fPValue, ks_pvalue
  /^[a-z]+P$/.test(name) || // normalityP, varianceP
  /_p$/i.test(name) || // reported_p, computed_p
  /^p(adj|vals?)$/i.test(name); // padj, pval

const HANDLES_SMALL_VALUES = /<\s*0?\.00+1\b/; // < 0.001, <.001, < 0.0001

function pValuesFormattedWithToFixed(file) {
  const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n');
  const found = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\.(toFixed|toPrecision)\(/g)) {
      const receiver = /([\w$.?[\]'"]+)\)?\s*$/.exec(line.slice(0, m.index));
      const names = receiver ? receiver[1].match(/[A-Za-z_$][\w$]*/g) || [] : [];
      const guarded = lines.slice(Math.max(0, i - 3), i + 1).some((l) => HANDLES_SMALL_VALUES.test(l));
      if (names.some(isPValueName) && !guarded) {
        found.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
      }
    }
  });
  return found;
}

test('the import walk reaches the pages it should', () => {
  const files = reachableFiles().map((f) => path.relative(SRC, f));
  expect(files).toEqual(
    expect.arrayContaining(['modules/TTestCompleteModule.jsx', 'pages/GenomicsAnalysisPage.jsx', 'utils/formatStats.js'])
  );
});

test('no p-value is formatted with toFixed', () => {
  const offenders = reachableFiles().flatMap(pValuesFormattedWithToFixed);
  expect(offenders).toEqual([]);
});

// The generic number formatters print a fixed number of decimals, so a p-value handed to one reads
// as zero below the last decimal: ResultDisplay's formatValue printed "p = 0.0000" on the /modules/*
// pages. The whole file is scanned, so a call split over lines counts too.
const FIXED_DECIMAL_FORMATTER = /\b(formatNumber|formatValue|formatPrecisionNumber|formatStat|fmtP)\s*\(\s*([^,()]+)/g;

test('no p-value goes through a generic fixed-decimal formatter', () => {
  const offenders = reachableFiles().flatMap((file) => {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    return [...src.matchAll(FIXED_DECIMAL_FORMATTER)]
      .filter((m) => (m[2].match(/[A-Za-z_$][\w$]*/g) || []).some(isPValueName))
      .map((m) => `${path.relative(SRC, file)}:${src.slice(0, m.index).split('\n').length}: ${m[0].replace(/\s+/g, ' ')}`);
  });
  expect(offenders).toEqual([]);
});

// Running text writes a p-value as a clause: formatPClause gives "p = 7.76e-8" or "p < 2.2e-16",
// where "p = " followed by formatPValue gives "p = < 2.2e-16" for an exact 0.
test('running text never writes "p = " before formatPValue', () => {
  const offenders = reachableFiles().flatMap((file) =>
    stripComments(fs.readFileSync(file, 'utf8'))
      .split('\n')
      .flatMap((line, i) =>
        /\bp\s*=\s*\$?\{\s*formatPValue\(/.test(line) ? [`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`] : []
      )
  );
  expect(offenders).toEqual([]);
});
