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
