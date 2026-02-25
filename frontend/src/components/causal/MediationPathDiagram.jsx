/**
 * Mediation Path Diagram Component
 * =================================
 * Visualizes mediation analysis results showing direct and indirect effects
 * between treatment, mediator(s), and outcome variables.
 *
 * Features:
 * - Single and multiple mediator visualization
 * - Path coefficients with significance indicators
 * - Confidence intervals on hover
 * - Effect decomposition summary
 * - APA-style effect reporting
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

// Styled components
const DiagramContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  minHeight: 300,
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
}));

const NodeBox = styled(Paper)(({ theme, nodeType }) => {
  const colors = {
    treatment: {
      bg: theme.palette.mode === 'dark' ? '#1b5e20' : '#e8f5e9',
      border: '#4caf50'
    },
    mediator: {
      bg: theme.palette.mode === 'dark' ? '#0d47a1' : '#e3f2fd',
      border: '#2196f3'
    },
    outcome: {
      bg: theme.palette.mode === 'dark' ? '#b71c1c' : '#ffebee',
      border: '#f44336'
    }
  };

  const nodeColor = colors[nodeType] || colors.mediator;

  return {
    padding: theme.spacing(2),
    minWidth: 120,
    textAlign: 'center',
    backgroundColor: nodeColor.bg,
    border: `2px solid ${nodeColor.border}`,
    borderRadius: theme.shape.borderRadius * 2,
    fontWeight: 'bold',
    zIndex: 1
  };
});

const PathLine = styled('div')(({ theme, significant }) => ({
  position: 'absolute',
  height: 2,
  backgroundColor: significant
    ? theme.palette.primary.main
    : theme.palette.grey[400],
  transformOrigin: 'left center'
}));

const PathLabel = styled(Paper)(({ theme, significant }) => ({
  position: 'absolute',
  padding: theme.spacing(0.5, 1),
  fontSize: '0.85rem',
  fontWeight: significant ? 'bold' : 'normal',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${significant ? theme.palette.primary.main : theme.palette.grey[300]}`,
  borderRadius: theme.shape.borderRadius,
  zIndex: 2,
  cursor: 'pointer',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.shadows[2]
  }
}));

const ArrowHead = styled('div')(({ theme, significant }) => ({
  position: 'absolute',
  width: 0,
  height: 0,
  borderLeft: `8px solid ${significant ? theme.palette.primary.main : theme.palette.grey[400]}`,
  borderTop: '5px solid transparent',
  borderBottom: '5px solid transparent'
}));

const EffectSummary = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(3),
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(0,0,0,0.02)'
}));

const MediationPathDiagram = ({
  treatment,
  mediators = [],
  outcome,
  results,
  showConfidenceIntervals = true,
  showEffectDecomposition = true
}) => {
  const theme = useTheme();

  // Handle both single mediator (backward compatible) and multiple mediators
  const mediatorList = useMemo(() => {
    if (Array.isArray(mediators) && mediators.length > 0) {
      return mediators;
    }
    if (results?.mediator) {
      return [{ name: results.mediator, ...results }];
    }
    return [];
  }, [mediators, results]);

  // Format coefficient for display
  const formatCoef = (value, pValue, ci = null) => {
    if (value === null || value === undefined) return '-';

    const formatted = value.toFixed(3);
    const significant = pValue !== null && pValue < 0.05;
    const stars = pValue !== null ? (
      pValue < 0.001 ? '***' :
      pValue < 0.01 ? '**' :
      pValue < 0.05 ? '*' : ''
    ) : '';

    return { formatted, stars, significant, ci };
  };

  // Calculate positions for mediator nodes
  const getMediatorPositions = (count, containerWidth = 600) => {
    if (count === 1) {
      return [{ x: containerWidth / 2, y: 50 }];
    }

    const positions = [];
    const spacing = containerWidth / (count + 1);

    for (let i = 0; i < count; i++) {
      positions.push({
        x: spacing * (i + 1),
        y: 50
      });
    }

    return positions;
  };

  // Extract effects from results
  const effects = useMemo(() => {
    if (!results) return null;

    return {
      totalEffect: results.total_effect || results.totalEffect,
      directEffect: results.direct_effect || results.directEffect,
      indirectEffect: results.indirect_effect || results.indirectEffect,
      proportionMediated: results.proportion_mediated || results.proportionMediated,
      pathA: results.path_a || results.a_path || results.a,
      pathB: results.path_b || results.b_path || results.b,
      pathC: results.path_c || results.c_path || results.c_prime || results.directEffect,
      pValues: {
        total: results.p_total || results.total_p,
        direct: results.p_direct || results.direct_p,
        indirect: results.p_indirect || results.indirect_p || results.sobel_p,
        a: results.p_a || results.a_p,
        b: results.p_b || results.b_p
      },
      ci: {
        indirect: results.indirect_ci || results.bootstrap_ci,
        direct: results.direct_ci,
        total: results.total_ci
      }
    };
  }, [results]);

  if (!treatment || !outcome || mediatorList.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Provide treatment, mediator(s), and outcome to display the path diagram.
        </Typography>
      </Paper>
    );
  }

  const containerWidth = 600;
  const containerHeight = mediatorList.length > 1 ? 350 : 280;
  const mediatorPositions = getMediatorPositions(mediatorList.length, containerWidth);

  // Node positions
  const treatmentPos = { x: 80, y: containerHeight / 2 };
  const outcomePos = { x: containerWidth - 80, y: containerHeight / 2 };

  return (
    <Box>
      <DiagramContainer sx={{ height: containerHeight, position: 'relative' }}>
        <svg
          width={containerWidth}
          height={containerHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <defs>
            <marker
              id="arrowhead-sig"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={theme.palette.primary.main}
              />
            </marker>
            <marker
              id="arrowhead-nonsig"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={theme.palette.grey[400]}
              />
            </marker>
          </defs>

          {/* Path a (Treatment → Mediator) for each mediator */}
          {mediatorPositions.map((pos, i) => {
            const pathA = effects?.pathA;
            const pValue = effects?.pValues?.a;
            const significant = pValue !== null && pValue < 0.05;

            return (
              <g key={`path-a-${i}`}>
                <line
                  x1={treatmentPos.x + 60}
                  y1={treatmentPos.y}
                  x2={pos.x - 60}
                  y2={pos.y + 20}
                  stroke={significant ? theme.palette.primary.main : theme.palette.grey[400]}
                  strokeWidth={2}
                  markerEnd={significant ? 'url(#arrowhead-sig)' : 'url(#arrowhead-nonsig)'}
                />
              </g>
            );
          })}

          {/* Path b (Mediator → Outcome) for each mediator */}
          {mediatorPositions.map((pos, i) => {
            const pathB = effects?.pathB;
            const pValue = effects?.pValues?.b;
            const significant = pValue !== null && pValue < 0.05;

            return (
              <g key={`path-b-${i}`}>
                <line
                  x1={pos.x + 60}
                  y1={pos.y + 20}
                  x2={outcomePos.x - 60}
                  y2={outcomePos.y}
                  stroke={significant ? theme.palette.primary.main : theme.palette.grey[400]}
                  strokeWidth={2}
                  markerEnd={significant ? 'url(#arrowhead-sig)' : 'url(#arrowhead-nonsig)'}
                />
              </g>
            );
          })}

          {/* Path c' (Direct effect: Treatment → Outcome) */}
          {(() => {
            const pathC = effects?.directEffect;
            const pValue = effects?.pValues?.direct;
            const significant = pValue !== null && pValue < 0.05;

            return (
              <line
                x1={treatmentPos.x + 60}
                y1={treatmentPos.y + 15}
                x2={outcomePos.x - 60}
                y2={outcomePos.y + 15}
                stroke={significant ? theme.palette.primary.main : theme.palette.grey[400]}
                strokeWidth={2}
                strokeDasharray={significant ? 'none' : '5,5'}
                markerEnd={significant ? 'url(#arrowhead-sig)' : 'url(#arrowhead-nonsig)'}
              />
            );
          })()}
        </svg>

        {/* Treatment Node */}
        <Box sx={{ position: 'absolute', left: treatmentPos.x - 60, top: treatmentPos.y - 25 }}>
          <NodeBox nodeType="treatment" elevation={2}>
            <Typography variant="subtitle2">{treatment}</Typography>
            <Typography variant="caption" color="text.secondary">Treatment</Typography>
          </NodeBox>
        </Box>

        {/* Mediator Node(s) */}
        {mediatorPositions.map((pos, i) => (
          <Box key={i} sx={{ position: 'absolute', left: pos.x - 60, top: pos.y - 5 }}>
            <NodeBox nodeType="mediator" elevation={2}>
              <Typography variant="subtitle2">
                {mediatorList[i]?.name || mediatorList[i] || `M${i + 1}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">Mediator</Typography>
            </NodeBox>
          </Box>
        ))}

        {/* Outcome Node */}
        <Box sx={{ position: 'absolute', left: outcomePos.x - 60, top: outcomePos.y - 25 }}>
          <NodeBox nodeType="outcome" elevation={2}>
            <Typography variant="subtitle2">{outcome}</Typography>
            <Typography variant="caption" color="text.secondary">Outcome</Typography>
          </NodeBox>
        </Box>

        {/* Path Labels */}
        {effects && (
          <>
            {/* Path a label */}
            {mediatorPositions.map((pos, i) => {
              const coef = formatCoef(effects.pathA, effects.pValues?.a);
              const midX = (treatmentPos.x + 60 + pos.x - 60) / 2;
              const midY = (treatmentPos.y + pos.y + 20) / 2 - 15;

              return (
                <Tooltip
                  key={`label-a-${i}`}
                  title={
                    showConfidenceIntervals && effects.ci?.a
                      ? `95% CI: [${effects.ci.a[0]?.toFixed(3)}, ${effects.ci.a[1]?.toFixed(3)}]`
                      : `p = ${effects.pValues?.a?.toFixed(4) || 'N/A'}`
                  }
                >
                  <PathLabel
                    sx={{ left: midX - 30, top: midY }}
                    significant={coef.significant}
                    elevation={1}
                  >
                    a = {coef.formatted}{coef.stars}
                  </PathLabel>
                </Tooltip>
              );
            })}

            {/* Path b label */}
            {mediatorPositions.map((pos, i) => {
              const coef = formatCoef(effects.pathB, effects.pValues?.b);
              const midX = (pos.x + 60 + outcomePos.x - 60) / 2;
              const midY = (pos.y + 20 + outcomePos.y) / 2 - 15;

              return (
                <Tooltip
                  key={`label-b-${i}`}
                  title={
                    showConfidenceIntervals && effects.ci?.b
                      ? `95% CI: [${effects.ci.b[0]?.toFixed(3)}, ${effects.ci.b[1]?.toFixed(3)}]`
                      : `p = ${effects.pValues?.b?.toFixed(4) || 'N/A'}`
                  }
                >
                  <PathLabel
                    sx={{ left: midX - 30, top: midY }}
                    significant={coef.significant}
                    elevation={1}
                  >
                    b = {coef.formatted}{coef.stars}
                  </PathLabel>
                </Tooltip>
              );
            })}

            {/* Path c' (direct effect) label */}
            {(() => {
              const coef = formatCoef(effects.directEffect, effects.pValues?.direct);
              const midX = containerWidth / 2 - 30;
              const midY = (treatmentPos.y + outcomePos.y) / 2 + 30;

              return (
                <Tooltip
                  title={
                    showConfidenceIntervals && effects.ci?.direct
                      ? `95% CI: [${effects.ci.direct[0]?.toFixed(3)}, ${effects.ci.direct[1]?.toFixed(3)}]`
                      : `p = ${effects.pValues?.direct?.toFixed(4) || 'N/A'}`
                  }
                >
                  <PathLabel
                    sx={{ left: midX, top: midY }}
                    significant={coef.significant}
                    elevation={1}
                  >
                    c' = {coef.formatted}{coef.stars}
                  </PathLabel>
                </Tooltip>
              );
            })()}
          </>
        )}
      </DiagramContainer>

      {/* Effect Decomposition */}
      {showEffectDecomposition && effects && (
        <EffectSummary elevation={0}>
          <Typography variant="h6" gutterBottom>
            Effect Decomposition
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Effect</TableCell>
                  <TableCell align="right">Estimate</TableCell>
                  <TableCell align="right">95% CI</TableCell>
                  <TableCell align="right">p-value</TableCell>
                  <TableCell align="center">Significance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <strong>Total Effect (c)</strong>
                  </TableCell>
                  <TableCell align="right">
                    {effects.totalEffect?.toFixed(4) || '-'}
                  </TableCell>
                  <TableCell align="right">
                    {effects.ci?.total
                      ? `[${effects.ci.total[0]?.toFixed(3)}, ${effects.ci.total[1]?.toFixed(3)}]`
                      : '-'
                    }
                  </TableCell>
                  <TableCell align="right">
                    {effects.pValues?.total?.toFixed(4) || '-'}
                  </TableCell>
                  <TableCell align="center">
                    {effects.pValues?.total < 0.05 && (
                      <Chip label="Sig" size="small" color="success" />
                    )}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>Direct Effect (c')</TableCell>
                  <TableCell align="right">
                    {effects.directEffect?.toFixed(4) || '-'}
                  </TableCell>
                  <TableCell align="right">
                    {effects.ci?.direct
                      ? `[${effects.ci.direct[0]?.toFixed(3)}, ${effects.ci.direct[1]?.toFixed(3)}]`
                      : '-'
                    }
                  </TableCell>
                  <TableCell align="right">
                    {effects.pValues?.direct?.toFixed(4) || '-'}
                  </TableCell>
                  <TableCell align="center">
                    {effects.pValues?.direct < 0.05 && (
                      <Chip label="Sig" size="small" color="success" />
                    )}
                  </TableCell>
                </TableRow>

                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>
                    <strong>Indirect Effect (a × b)</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{effects.indirectEffect?.toFixed(4) || '-'}</strong>
                  </TableCell>
                  <TableCell align="right">
                    {effects.ci?.indirect
                      ? `[${effects.ci.indirect[0]?.toFixed(3)}, ${effects.ci.indirect[1]?.toFixed(3)}]`
                      : '-'
                    }
                  </TableCell>
                  <TableCell align="right">
                    {effects.pValues?.indirect?.toFixed(4) || '-'}
                  </TableCell>
                  <TableCell align="center">
                    {(effects.pValues?.indirect < 0.05 ||
                      (effects.ci?.indirect &&
                        effects.ci.indirect[0] * effects.ci.indirect[1] > 0)) && (
                      <Chip label="Sig" size="small" color="primary" />
                    )}
                  </TableCell>
                </TableRow>

                {effects.proportionMediated !== null && effects.proportionMediated !== undefined && (
                  <TableRow>
                    <TableCell>Proportion Mediated</TableCell>
                    <TableCell align="right" colSpan={4}>
                      <Typography variant="body2" color="primary">
                        {(effects.proportionMediated * 100).toFixed(1)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary">
            <strong>Interpretation:</strong> The indirect effect represents the portion of the
            treatment's effect on the outcome that operates through the mediator(s).
            {effects.ci?.indirect && effects.ci.indirect[0] * effects.ci.indirect[1] > 0
              ? ' The bootstrap 95% CI excludes zero, indicating significant mediation.'
              : effects.pValues?.indirect < 0.05
                ? ' The Sobel test indicates significant mediation.'
                : ' The mediation effect is not statistically significant.'
            }
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            * p &lt; .05, ** p &lt; .01, *** p &lt; .001
          </Typography>
        </EffectSummary>
      )}
    </Box>
  );
};

export default MediationPathDiagram;
