#!/bin/bash
# Script to find and document all Math.random() usage for removal

echo "🔍 Finding all Math.random() usage in frontend..."
echo "================================================"

# Count total instances
TOTAL=$(grep -r "Math\.random" frontend/src --include="*.jsx" --include="*.js" | wc -l)
echo "Found $TOTAL instances of Math.random()"

# List files with mock data
echo -e "\n📁 Files using Math.random():"
grep -r "Math\.random" frontend/src --include="*.jsx" --include="*.js" -l | while read file; do
    COUNT=$(grep -c "Math\.random" "$file")
    echo "  - $file ($COUNT instances)"
done

# Create report
echo -e "\n📊 Creating detailed report..."
cat > mock_data_report.md << 'EOF'
# Mock Data Removal Report

## Summary
Total instances of Math.random() to remove: TOTAL_COUNT

## Files to Update

### High Priority (Core Modules)
EOF

# Add high priority files
grep -r "Math\.random" frontend/src/modules --include="*.jsx" -l | while read file; do
    echo "- [ ] $file" >> mock_data_report.md
done

cat >> mock_data_report.md << 'EOF'

### Medium Priority (Components)
EOF

# Add component files
grep -r "Math\.random" frontend/src/components --include="*.jsx" -l | while read file; do
    echo "- [ ] $file" >> mock_data_report.md
done

cat >> mock_data_report.md << 'EOF'

## Replacement Strategy

1. **For Data Generation**: Replace with real API calls
2. **For Simulations**: Move to backend or use deterministic algorithms
3. **For Examples**: Use fixed, realistic datasets

## Code Patterns to Replace

```javascript
// OLD: Mock data generation
const data = Array.from({ length: 10 }, () => Math.random() * 100);

// NEW: Real API call
const response = await service.getData();
const data = response.data;
```

```javascript
// OLD: Simulation
const simulation = () => {
    return Math.random() > 0.5 ? 'success' : 'fail';
};

// NEW: Backend calculation
const result = await service.runSimulation({ params });
```
EOF

# Update report with actual count
sed -i '' "s/TOTAL_COUNT/$TOTAL/g" mock_data_report.md 2>/dev/null || sed -i "s/TOTAL_COUNT/$TOTAL/g" mock_data_report.md

echo "✅ Report created: mock_data_report.md"

echo -e "\n🎯 Next Steps:"
echo "1. Review mock_data_report.md"
echo "2. Update modules to use HighPrecisionStatisticalService"
echo "3. Replace simulations with backend calls"
echo "4. Test each module after updating"

echo -e "\n⚠️ Critical Files to Fix First:"
echo "  - TTestCompleteModule.jsx"
echo "  - ANOVACompleteModule.jsx"
echo "  - HypothesisTestingModule.jsx"
echo "  - CorrelationRegressionModule.jsx"