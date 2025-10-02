/**
 * APAFormatter Component
 * 
 * Formats statistical results according to APA 7th Edition guidelines.
 * 
 * @timestamp 2025-08-06 22:43:00 UTC
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Paper,
  Alert,
  Divider,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  FormatQuote as QuoteIcon,
  TableChart as TableIcon,
  Code as InlineIcon,
} from '@mui/icons-material';

import { APAFormatterProps } from './InterpretationEngine.types';

const APAFormatter: React.FC<APAFormatterProps> = ({
  result,
  includeEffectSize = true,
  includeConfidenceInterval = true,
  inTextFormat = true,
  tableFormat = false,
  onCopy,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Format p-value according to APA
  const formatPValue = (p: number): string => {
    if (p < 0.001) return 'p < .001';
    return `p = ${p.toFixed(3).replace('0.', '.')}`;
  };

  // Format degrees of freedom
  const formatDF = (): string => {
    if (!result.degreesOfFreedom) return '';
    
    if (typeof result.degreesOfFreedom === 'number') {
      return `(${result.degreesOfFreedom})`;
    } else {
      return `(${result.degreesOfFreedom.numerator}, ${result.degreesOfFreedom.denominator})`;
    }
  };

  // Generate statistical statement
  const generateStatisticalStatement = (): string => {
    const df = formatDF();
    const statValue = result.statistic.toFixed(2);
    const pValue = formatPValue(result.pValue);
    
    return `${result.statisticName}${df} = ${statValue}, ${pValue}`;
  };

  // Generate effect size statement
  const generateEffectSizeStatement = (): string => {
    if (!result.effectSize) return '';
    
    let statement = `${result.effectSize.measure} = ${result.effectSize.value.toFixed(2)}`;
    
    if (includeConfidenceInterval && result.effectSize.confidenceInterval) {
      const ci = result.effectSize.confidenceInterval;
      statement += `, 95% CI [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`;
    }
    
    return statement;
  };

  // Generate in-text citation
  const generateInTextCitation = (): string => {
    const isSignificant = result.pValue < result.alpha;
    const testName = result.testName;
    const statistical = generateStatisticalStatement();
    const effectSize = generateEffectSizeStatement();
    
    let citation = '';
    
    if (isSignificant) {
      citation = `The ${testName} revealed a statistically significant difference, ${statistical}`;
    } else {
      citation = `The ${testName} did not reveal a statistically significant difference, ${statistical}`;
    }
    
    if (includeEffectSize && effectSize) {
      citation += `, ${effectSize}`;
    }
    
    citation += '.';
    
    return citation;
  };

  // Generate parenthetical citation
  const generateParentheticalCitation = (): string => {
    const statistical = generateStatisticalStatement();
    const effectSize = generateEffectSizeStatement();
    
    let citation = `(${statistical}`;
    
    if (includeEffectSize && effectSize) {
      citation += `; ${effectSize}`;
    }
    
    citation += ')';
    
    return citation;
  };

  // Generate table format
  const generateTableFormat = (): string => {
    const parts = [];
    
    // Test name
    parts.push(result.testName);
    
    // Sample size
    if (result.sampleInfo.groups) {
      const groupInfo = result.sampleInfo.groups
        .map(g => `${g.name}: n = ${g.n}`)
        .join(', ');
      parts.push(groupInfo);
    } else {
      parts.push(`N = ${result.sampleInfo.totalN}`);
    }
    
    // Test statistic
    parts.push(`${result.statisticName} = ${result.statistic.toFixed(2)}`);
    
    // Degrees of freedom
    if (result.degreesOfFreedom) {
      if (typeof result.degreesOfFreedom === 'number') {
        parts.push(`df = ${result.degreesOfFreedom}`);
      } else {
        parts.push(`df = ${result.degreesOfFreedom.numerator}, ${result.degreesOfFreedom.denominator}`);
      }
    }
    
    // P-value
    parts.push(formatPValue(result.pValue));
    
    // Effect size
    if (result.effectSize) {
      parts.push(`${result.effectSize.measure} = ${result.effectSize.value.toFixed(2)}`);
    }
    
    return parts.join('\t');
  };

  // Handle copy
  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      if (onCopy) {
        onCopy(text);
      }
    });
  };

  const statisticalStatement = generateStatisticalStatement();
  const effectSizeStatement = generateEffectSizeStatement();
  const inTextCitation = generateInTextCitation();
  const parentheticalCitation = generateParentheticalCitation();
  const tableFormatText = generateTableFormat();

  return (
    <Box>
      {/* APA Guidelines Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          APA 7th Edition Guidelines
        </Typography>
        <Typography variant="body2">
          • Report exact p-values to three decimal places (p = .034)<br />
          • Report p < .001 for very small p-values<br />
          • Include effect sizes for primary outcomes<br />
          • Include confidence intervals when relevant<br />
          • Use italics for statistical symbols (in actual documents)
        </Typography>
      </Alert>

      {/* Statistical Statement */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Statistical Statement
            </Typography>
            <Tooltip title={copiedSection === 'statistical' ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton
                size="small"
                onClick={() => handleCopy(statisticalStatement, 'statistical')}
              >
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace' }}>
            <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
              {statisticalStatement}
            </Typography>
          </Paper>
          
          {includeEffectSize && effectSizeStatement && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                With Effect Size:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace' }}>
                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                  {statisticalStatement}, {effectSizeStatement}
                </Typography>
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* In-Text Citation */}
      {inTextFormat && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QuoteIcon color="primary" />
                <Typography variant="h6">
                  In-Text Citation
                </Typography>
              </Box>
              <Tooltip title={copiedSection === 'intext' ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(inTextCitation, 'intext')}
                >
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Paper sx={{ p: 2, bgcolor: 'blue.50' }}>
              <Typography variant="body1">
                {inTextCitation}
              </Typography>
            </Paper>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Parenthetical Format:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'blue.50' }}>
              <Typography variant="body1">
                ...significant difference was found {parentheticalCitation}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}

      {/* Table Format */}
      {tableFormat && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableIcon color="primary" />
                <Typography variant="h6">
                  Table Format
                </Typography>
              </Box>
              <Tooltip title={copiedSection === 'table' ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(tableFormatText, 'table')}
                >
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', overflowX: 'auto' }}>
              <Typography variant="body2">
                {tableFormatText}
              </Typography>
            </Paper>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Tab-delimited format for easy pasting into tables
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Common Variations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Common Variations
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* With means and SDs */}
            {result.sampleInfo.groups && result.sampleInfo.groups[0]?.mean !== undefined && (
              <Box>
                <Chip label="With Descriptive Statistics" size="small" sx={{ mb: 1 }} />
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {result.sampleInfo.groups.map((g, idx) => (
                      <span key={idx}>
                        {g.name} (M = {g.mean?.toFixed(2)}, SD = {g.sd?.toFixed(2)})
                        {idx < result.sampleInfo.groups!.length - 1 && ', '}
                      </span>
                    ))}
                    . {inTextCitation}
                  </Typography>
                </Paper>
              </Box>
            )}
            
            {/* Multiple comparisons note */}
            {result.multipleComparisons && (
              <Box>
                <Chip label="Multiple Comparisons Note" size="small" sx={{ mb: 1 }} />
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    Post hoc analyses were conducted using {result.multipleComparisons.method} correction 
                    (α<sub>adjusted</sub> = {result.multipleComparisons.adjustedAlpha.toFixed(3)}).
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Copy All Button */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          startIcon={<CopyIcon />}
          onClick={() => {
            const allText = `${inTextCitation}\n\n${statisticalStatement}${effectSizeStatement ? `, ${effectSizeStatement}` : ''}`;
            handleCopy(allText, 'all');
          }}
        >
          Copy All APA Formats
        </Button>
      </Box>
    </Box>
  );
};

export default APAFormatter;