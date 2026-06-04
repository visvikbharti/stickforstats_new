/**
 * Systemic guard for robustness-audit findings F-02 / F-07.
 *
 * Several service modules export a pre-built SINGLETON INSTANCE as their default
 * export (and, in some cases, the class as a *named* export). Calling
 * `new <defaultImport>()` on the instance throws
 * "TypeError: X is not a constructor". When that throw is swallowed by a
 * try/catch the symptom is a silently-empty page (F-02, AuditDashboard); when it
 * is not, the component white-screens on render (F-07, DataPipeline).
 *
 * This test statically scans the frontend source and fails if any file
 * default-imports one of these singleton-instance modules and then calls `new`
 * on that default binding. It deliberately does NOT flag the valid pattern of a
 * *named* class import used with `new` (e.g. CorrelationCalculator), so it has
 * no false positives.
 */

const fs = require('fs');
const path = require('path');

// Modules whose DEFAULT export is a singleton INSTANCE, not the class.
// (`new <default import of these>()` is always a bug.)
const SINGLETON_INSTANCE_MODULES = [
  'StatisticalTestService',
  'HighPrecisionStatisticalService',
];

const SRC_DIR = path.join(__dirname, '..');

/** Strip JS comments so a `new X()` mentioned in a comment is not a false hit. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')        // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');     // line comments (keep http://)
}

function collectSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'build') continue;
      out.push(...collectSourceFiles(full));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Returns the local name bound to the DEFAULT import of `moduleBase` in `src`,
 * or null if the module is not default-imported (named-only imports return null).
 */
function defaultImportLocalName(src, moduleBase) {
  const importRe = new RegExp(
    "import\\s+([^;]*?)\\s+from\\s+['\"][^'\"]*\\/" + moduleBase + "['\"]",
    'g'
  );
  let match;
  while ((match = importRe.exec(src)) !== null) {
    const clause = match[1].trim();
    // Named-only import: `{ Foo }` -> no default binding.
    if (clause.startsWith('{')) continue;
    // Default binding is the first identifier before a comma / brace / `* as`.
    const defaultName = clause.split(',')[0].trim();
    if (/^[A-Za-z_$][\w$]*$/.test(defaultName)) return defaultName;
  }
  return null;
}

describe('no `new` on default-imported singleton services (F-02 / F-07)', () => {
  const files = collectSourceFiles(SRC_DIR);

  test('source tree has files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test('no component calls `new` on a singleton-instance default import', () => {
    const violations = [];
    for (const file of files) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const moduleBase of SINGLETON_INSTANCE_MODULES) {
        const localName = defaultImportLocalName(src, moduleBase);
        if (!localName) continue;
        const newRe = new RegExp('\\bnew\\s+' + localName + '\\s*\\(');
        if (newRe.test(src)) {
          violations.push(
            `${path.relative(SRC_DIR, file)}: \`new ${localName}()\` on the ` +
            `default import of ${moduleBase} (default export is a singleton ` +
            `instance, not the class). Use the import directly without \`new\`, ` +
            `or import the named class.`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
