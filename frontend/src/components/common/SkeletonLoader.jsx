/**
 * Reusable skeleton loader for page-level loading states.
 * Replaces generic spinners with content-aware skeleton screens.
 */

import React from 'react';
import { Box, Skeleton, Paper } from '@mui/material';

/**
 * Page-level skeleton with common layout patterns.
 * @param {Object} props
 * @param {'dashboard'|'analysis'|'table'|'form'} props.variant - Layout variant
 */
const PageSkeleton = ({ variant = 'dashboard' }) => {
  const variants = {
    dashboard: <DashboardSkeleton />,
    analysis: <AnalysisSkeleton />,
    table: <TableSkeleton />,
    form: <FormSkeleton />,
  };

  return (
    <Box
      sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}
      role="status"
      aria-label="Loading content"
    >
      {variants[variant] || variants.dashboard}
    </Box>
  );
};

const DashboardSkeleton = () => (
  <Box>
    {/* Header */}
    <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
    <Skeleton variant="text" width="60%" height={24} sx={{ mb: 3 }} />

    {/* Stats cards row */}
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      {[1, 2, 3, 4].map((i) => (
        <Paper key={i} sx={{ p: 2, flex: '1 1 200px', minWidth: 150 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={36} />
        </Paper>
      ))}
    </Box>

    {/* Main content area */}
    <Paper sx={{ p: 3 }}>
      <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
    </Paper>
  </Box>
);

const AnalysisSkeleton = () => (
  <Box>
    <Skeleton variant="text" width="50%" height={40} sx={{ mb: 2 }} />

    {/* Data input area */}
    <Paper sx={{ p: 3, mb: 3 }}>
      <Skeleton variant="text" width="25%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1, mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
      </Box>
    </Paper>

    {/* Results area */}
    <Paper sx={{ p: 3 }}>
      <Skeleton variant="text" width="20%" height={24} sx={{ mb: 2 }} />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="text" width={`${90 - i * 10}%`} height={20} sx={{ mb: 1 }} />
      ))}
    </Paper>
  </Box>
);

const TableSkeleton = () => (
  <Box>
    <Skeleton variant="text" width="30%" height={36} sx={{ mb: 2 }} />
    <Paper sx={{ p: 2 }}>
      {/* Table header */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="text" width="18%" height={24} />
        ))}
      </Box>
      {/* Table rows */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
        <Box key={row} sx={{ display: 'flex', gap: 2, mb: 1 }}>
          {[1, 2, 3, 4, 5].map((col) => (
            <Skeleton key={col} variant="text" width="18%" height={20} />
          ))}
        </Box>
      ))}
    </Paper>
  </Box>
);

const FormSkeleton = () => (
  <Box>
    <Skeleton variant="text" width="40%" height={40} sx={{ mb: 3 }} />
    <Paper sx={{ p: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Box key={i} sx={{ mb: 3 }}>
          <Skeleton variant="text" width="20%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
        </Box>
      ))}
      <Skeleton variant="rectangular" width={140} height={42} sx={{ borderRadius: 1, mt: 2 }} />
    </Paper>
  </Box>
);

export { PageSkeleton, DashboardSkeleton, AnalysisSkeleton, TableSkeleton, FormSkeleton };
export default PageSkeleton;
