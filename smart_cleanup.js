#!/usr/bin/env node

/**
 * Smart Cleanup Script for Math.random()
 * =======================================
 * Intelligently removes fake results while preserving educational examples
 * Following the principle: Real data for real calculations
 */

const fs = require('fs');
const path = require('path');

// Patterns to identify different types of Math.random() usage
const PATTERNS = {
  // REMOVE - These are fake results
  fakeResults: [
    /t_statistic.*=.*Math\.random/gi,
    /p_value.*=.*Math\.random/gi,
    /correlation.*=.*Math\.random/gi,
    /f_statistic.*=.*Math\.random/gi,
    /effect_size.*=.*Math\.random/gi,
    /confidence.*=.*Math\.random/gi,
    /power.*=.*Math\.random\(\).*\*/gi,
    /result.*=.*Math\.random/gi,
  ],

  // KEEP - These are example data generators
  exampleData: [
    /generateExampleData/gi,
    /loadExample/gi,
    /sampleData/gi,
    /demoData/gi,
    /example.*\[.*Math\.random/gi,
  ],

  // TRANSFORM - Educational simulations
  educationalSims: [
    /CLTSimulator/gi,
    /CoverageAnimation/gi,
    /SimulationControl/gi,
    /DistributionAnimation/gi,
    /bootstrap/gi,
    /monte.*carlo/gi,
  ]
};

// Files to analyze
const CRITICAL_FILES = [
  'frontend/src/modules/HypothesisTestingModule.jsx',
  'frontend/src/modules/CorrelationRegressionModule.jsx',
  'frontend/src/modules/TTestCompleteModule.jsx',
  'frontend/src/modules/ANOVACompleteModule.jsx',
  'frontend/src/components/PowerAnalysis/PowerCalculator.jsx',
  'frontend/src/components/TestRecommender/DataInputPanel.jsx',
];

class SmartCleaner {
  constructor() {
    this.report = {
      analyzed: 0,
      toRemove: [],
      toKeep: [],
      toTransform: [],
      changes: []
    };
  }

  /**
   * Analyze a file and categorize Math.random() usage
   */
  analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    this.report.analyzed++;

    console.log(`\n📋 Analyzing: ${path.basename(filePath)}`);

    lines.forEach((line, index) => {
      if (line.includes('Math.random')) {
        const lineNum = index + 1;
        const category = this.categorizeLine(line, filePath);

        if (category === 'remove') {
          console.log(`  ❌ Line ${lineNum}: REMOVE (fake result)`);
          this.report.toRemove.push({
            file: filePath,
            line: lineNum,
            content: line.trim(),
            reason: 'Generates fake statistical results'
          });
        } else if (category === 'keep') {
          console.log(`  ✅ Line ${lineNum}: KEEP (example data)`);
          this.report.toKeep.push({
            file: filePath,
            line: lineNum,
            content: line.trim(),
            reason: 'Generates example data for education'
          });
        } else if (category === 'transform') {
          console.log(`  🔄 Line ${lineNum}: TRANSFORM (educational sim)`);
          this.report.toTransform.push({
            file: filePath,
            line: lineNum,
            content: line.trim(),
            reason: 'Educational simulation - move to backend'
          });
        }
      }
    });
  }

  /**
   * Categorize a line containing Math.random()
   */
  categorizeLine(line, filePath) {
    // Check if it's a fake result
    for (const pattern of PATTERNS.fakeResults) {
      if (pattern.test(line)) {
        return 'remove';
      }
    }

    // Check if it's example data
    for (const pattern of PATTERNS.exampleData) {
      if (pattern.test(line)) {
        return 'keep';
      }
    }

    // Check if it's in an educational simulation file
    for (const pattern of PATTERNS.educationalSims) {
      if (pattern.test(filePath)) {
        return 'transform';
      }
    }

    // Default: needs manual review
    return 'review';
  }

  /**
   * Generate replacement code
   */
  generateReplacement(item) {
    if (item.content.includes('p_value')) {
      return 'const p_value = result.high_precision_result.p_value;';
    }
    if (item.content.includes('t_statistic')) {
      return 'const t_statistic = result.high_precision_result.t_statistic;';
    }
    if (item.content.includes('correlation')) {
      return 'const correlation = await service.calculateCorrelation(data);';
    }
    if (item.content.includes('power')) {
      return 'const power = await powerAnalysisService.calculatePower(params);';
    }

    // For simulations
    if (item.content.includes('Array.from')) {
      return `// TODO: Replace with real example data
const data = REAL_EXAMPLE_DATASETS.medical.bloodPressure.control;`;
    }

    return '// TODO: Replace with real backend call';
  }

  /**
   * Apply fixes to files
   */
  applyFixes(dryRun = true) {
    console.log(`\n🔧 ${dryRun ? 'DRY RUN' : 'APPLYING'} Fixes...`);

    this.report.toRemove.forEach(item => {
      console.log(`\n📝 File: ${item.file}`);
      console.log(`   Line ${item.line}: ${item.content}`);
      console.log(`   Replace with: ${this.generateReplacement(item)}`);

      if (!dryRun) {
        // Read file
        let content = fs.readFileSync(item.file, 'utf8');
        const lines = content.split('\n');

        // Replace line
        lines[item.line - 1] = this.generateReplacement(item);

        // Write file
        fs.writeFileSync(item.file, lines.join('\n'));
        this.report.changes.push({
          file: item.file,
          line: item.line,
          change: 'Replaced fake result with backend call'
        });
      }
    });
  }

  /**
   * Generate final report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('SMART CLEANUP REPORT');
    console.log('='.repeat(60));

    console.log(`\n📊 Summary:`);
    console.log(`  Files analyzed: ${this.report.analyzed}`);
    console.log(`  ❌ To Remove: ${this.report.toRemove.length} (fake results)`);
    console.log(`  ✅ To Keep: ${this.report.toKeep.length} (example data)`);
    console.log(`  🔄 To Transform: ${this.report.toTransform.length} (simulations)`);

    // Save detailed report
    const reportPath = 'smart_cleanup_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    // Generate fix script
    this.generateFixScript();
  }

  /**
   * Generate a script to apply fixes
   */
  generateFixScript() {
    let script = `#!/bin/bash
# Auto-generated fix script for Math.random() cleanup
# Generated: ${new Date().toISOString()}

echo "🔧 Applying fixes to remove fake results..."
`;

    this.report.toRemove.forEach(item => {
      script += `
# Fix: ${item.file} line ${item.line}
# Reason: ${item.reason}
sed -i.bak '${item.line}s/.*/\\/\\/ TODO: Connect to backend - was fake result/' "${item.file}"
`;
    });

    script += `
echo "✅ Fixes applied!"
echo "⚠️  Remember to:"
echo "  1. Import HighPrecisionStatisticalService where needed"
echo "  2. Replace TODO comments with actual backend calls"
echo "  3. Test each module after changes"
`;

    fs.writeFileSync('apply_fixes.sh', script);
    fs.chmodSync('apply_fixes.sh', '755');
    console.log(`\n📜 Fix script generated: apply_fixes.sh`);
  }
}

// Main execution
function main() {
  console.log('🎯 Smart Math.random() Cleanup Tool');
  console.log('Preserving educational examples while removing fake results');
  console.log('='.repeat(60));

  const cleaner = new SmartCleaner();

  // Analyze critical files
  CRITICAL_FILES.forEach(file => {
    cleaner.analyzeFile(path.join(__dirname, file));
  });

  // Generate report
  cleaner.generateReport();

  // Apply fixes (dry run by default)
  const isDryRun = process.argv[2] !== '--apply';
  cleaner.applyFixes(isDryRun);

  if (isDryRun) {
    console.log('\n💡 To apply fixes, run: node smart_cleanup.js --apply');
  }

  console.log('\n✅ Analysis complete!');
  console.log('\n📌 Next steps:');
  console.log('  1. Review smart_cleanup_report.json');
  console.log('  2. Verify categorizations are correct');
  console.log('  3. Run apply_fixes.sh to remove fake results');
  console.log('  4. Manually update files to use RealExampleDatasets.js');
  console.log('  5. Test all modules after changes');
}

// Run the script
main();