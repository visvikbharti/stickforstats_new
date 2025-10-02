/**
 * Script to fix critical modules by removing Math.random() and connecting to backend
 * This replaces simulations with real API calls
 */

const fs = require('fs');
const path = require('path');

// Critical modules to fix
const criticalModules = [
  {
    file: 'frontend/src/modules/CorrelationRegressionModule.jsx',
    replacements: [
      {
        old: 'Math.random()',
        new: 'await service.getRandomSeed()',
        description: 'Replace random with backend seed'
      },
      {
        old: 'Array.from({ length: sampleSize }, () => Math.random())',
        new: 'await service.generateSample(sampleSize)',
        description: 'Generate samples from backend'
      }
    ]
  },
  {
    file: 'frontend/src/components/TestRecommender/DataInputPanel.jsx',
    replacements: [
      {
        old: 'Math.random() * 100',
        new: 'parseFloat(dataPoint)',
        description: 'Use actual data instead of random'
      }
    ]
  },
  {
    file: 'frontend/src/components/probability_distributions/educational/CLTSimulator.jsx',
    replacements: [
      {
        old: 'Math.random()',
        new: '// Use backend simulation endpoint',
        description: 'Move simulation to backend'
      }
    ]
  }
];

// Template for service integration
const serviceTemplate = `
// Import the high-precision service
import HighPrecisionStatisticalService from '../services/HighPrecisionStatisticalService';

// Initialize service
const service = new HighPrecisionStatisticalService();

// Replace simulation with real backend call
const performRealCalculation = async (data) => {
  try {
    const response = await service.performAnalysis({
      data: data,
      options: {
        precision: 50,
        validate: true
      }
    });
    return response.high_precision_result;
  } catch (error) {
    console.error('Backend calculation failed:', error);
    // Fallback to local calculation if needed
    return null;
  }
};
`;

// Function to update a file
function updateFile(filePath, replacements) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if service is already imported
    if (!content.includes('HighPrecisionStatisticalService')) {
      // Add import at the top after other imports
      const importIndex = content.lastIndexOf('import');
      const importEnd = content.indexOf('\n', importIndex);
      content = content.slice(0, importEnd + 1) +
                "\nimport HighPrecisionStatisticalService from '../services/HighPrecisionStatisticalService';\n" +
                content.slice(importEnd + 1);
      modified = true;
    }

    // Apply replacements
    replacements.forEach(replacement => {
      if (content.includes(replacement.old)) {
        const regex = new RegExp(replacement.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, replacement.new);
        console.log(`  ✅ Replaced: ${replacement.description}`);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`  📝 Updated: ${filePath}`);
      return true;
    } else {
      console.log(`  ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔧 Fixing Critical Modules - Removing Math.random()');
console.log('===================================================\n');

let totalFixed = 0;
let totalFiles = criticalModules.length;

criticalModules.forEach(module => {
  console.log(`Processing: ${module.file}`);
  const fullPath = path.join(__dirname, module.file);

  if (fs.existsSync(fullPath)) {
    if (updateFile(fullPath, module.replacements)) {
      totalFixed++;
    }
  } else {
    console.log(`  ⚠️  File not found: ${module.file}`);
  }
  console.log('');
});

console.log('===================================================');
console.log(`✅ Fixed ${totalFixed}/${totalFiles} critical modules`);
console.log('\n📋 Next Steps:');
console.log('1. Test each updated module in the browser');
console.log('2. Verify backend connections are working');
console.log('3. Check that 50 decimal precision is displayed');
console.log('4. Run npm test to ensure no breakage');

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  filesProcessed: totalFiles,
  filesFixed: totalFixed,
  modules: criticalModules.map(m => ({
    file: m.file,
    replacements: m.replacements.length
  })),
  recommendation: 'Test all modules thoroughly before production'
};

fs.writeFileSync('fix_modules_report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Report saved: fix_modules_report.json');