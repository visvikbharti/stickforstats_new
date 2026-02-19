/**
 * Journal Analytics Page
 * ======================
 * Comprehensive analytics dashboard for journal editors/admins.
 * Displays aggregate submission metrics, SQS score trends,
 * common statistical issues, and period-over-period comparisons.
 *
 * Route: /journal-analytics
 * Created: February 2026
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  BarChart,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Bar,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArticleIcon from '@mui/icons-material/Article';
import { apiClient } from '../services/api';

// ---------- Helper sub-components ----------

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: color || 'primary.main', mr: 1 }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function DeltaChip({ value, label }) {
  if (value === null || value === undefined) {
    return <Chip label={`${label}: N/A`} size="small" variant="outlined" />;
  }
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <Chip
      icon={isNeutral ? null : isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
      label={`${label}: ${isPositive ? '+' : ''}${value}%`}
      size="small"
      color={isNeutral ? 'default' : isPositive ? 'success' : 'error'}
      variant="outlined"
    />
  );
}

// ---------- Constants ----------

const PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 180 days' },
  { value: 365, label: 'Last year' },
];

const DEMO_JOURNALS = [
  { slug: 'jss', name: 'Journal of Statistical Software' },
  { slug: 'jasa', name: 'Journal of the American Statistical Association' },
  { slug: 'biometrika', name: 'Biometrika' },
  { slug: 'stats-in-medicine', name: 'Statistics in Medicine' },
];

const PIE_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336'];

// ---------- Main Component ----------

function JournalAnalyticsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [journalSlug, setJournalSlug] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data state
  const [overview, setOverview] = useState(null);
  const [issues, setIssues] = useState(null);
  const [trends, setTrends] = useState(null);
  const [comparison, setComparison] = useState(null);

  // Chart colors that adapt to dark mode
  const chartColors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    text: theme.palette.text.primary,
    textSecondary: theme.palette.text.secondary,
    gridLine: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  // Fetch all analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!journalSlug) return;
    setLoading(true);
    setError(null);

    try {
      const [overviewRes, issuesRes, trendsRes, comparisonRes] = await Promise.allSettled([
        apiClient.get('/v1/journal/analytics/overview/', { params: { journal: journalSlug, days } }),
        apiClient.get('/v1/journal/analytics/issues/', { params: { journal: journalSlug, days } }),
        apiClient.get('/v1/journal/analytics/trends/', { params: { journal: journalSlug, days } }),
        apiClient.get('/v1/journal/analytics/comparison/', { params: { journal: journalSlug, days } }),
      ]);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
      if (issuesRes.status === 'fulfilled') setIssues(issuesRes.value.data);
      if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value.data);
      if (comparisonRes.status === 'fulfilled') setComparison(comparisonRes.value.data);

      // Check if all failed
      const allFailed = [overviewRes, issuesRes, trendsRes, comparisonRes].every(
        (r) => r.status === 'rejected'
      );
      if (allFailed) {
        const firstError = overviewRes.reason;
        setError(
          firstError?.response?.data?.error ||
          firstError?.message ||
          'Failed to load analytics data. Ensure the backend is running and the journal exists.'
        );
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [journalSlug, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Prepare pie chart data from overview
  const pieData = overview
    ? [
        { name: 'Excellent (80+)', value: overview.sqs_scores.distribution.excellent_80_plus },
        { name: 'Good (60-79)', value: overview.sqs_scores.distribution.good_60_79 },
        { name: 'Needs Work (40-59)', value: overview.sqs_scores.distribution.needs_work_40_59 },
        { name: 'Poor (<40)', value: overview.sqs_scores.distribution.poor_below_40 },
      ].filter((d) => d.value > 0)
    : [];

  // Prepare status data for bar chart
  const statusData = overview
    ? Object.entries(overview.by_status).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        count,
      }))
    : [];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Journal Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aggregate submission metrics, SQS score trends, and statistical quality insights.
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 300 }} size="small">
          <InputLabel id="journal-select-label">Journal</InputLabel>
          <Select
            labelId="journal-select-label"
            value={journalSlug}
            label="Journal"
            onChange={(e) => setJournalSlug(e.target.value)}
          >
            <MenuItem value="" disabled>
              Select a journal
            </MenuItem>
            {DEMO_JOURNALS.map((j) => (
              <MenuItem key={j.slug} value={j.slug}>
                {j.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel id="period-select-label">Period</InputLabel>
          <Select
            labelId="period-select-label"
            value={days}
            label="Period"
            onChange={(e) => setDays(e.target.value)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loading && <CircularProgress size={24} />}
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!journalSlug && !loading && (
        <Card elevation={1} sx={{ p: 6, textAlign: 'center' }}>
          <ArticleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Select a journal to view analytics
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            Choose a journal from the dropdown above to load submission metrics,
            SQS score distributions, trend data, and period comparisons.
          </Typography>
        </Card>
      )}

      {/* Main content with tabs */}
      {journalSlug && (
        <>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<AssessmentIcon />} label="Overview" iconPosition="start" />
            <Tab icon={<TimelineIcon />} label="Trends" iconPosition="start" />
            <Tab icon={<WarningAmberIcon />} label="Issues" iconPosition="start" />
            <Tab icon={<CompareArrowsIcon />} label="Comparison" iconPosition="start" />
          </Tabs>

          {/* ===== Tab 0: Overview ===== */}
          <TabPanel value={activeTab} index={0}>
            {overview ? (
              <>
                {/* Metric cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Total Submissions"
                      value={overview.total_submissions}
                      subtitle={`Last ${overview.period_days} days`}
                      icon={<ArticleIcon />}
                      color="primary.main"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Average SQS Score"
                      value={overview.sqs_scores.average != null ? overview.sqs_scores.average : '--'}
                      subtitle={`${overview.sqs_scores.scored_count} scored`}
                      icon={<AssessmentIcon />}
                      color="success.main"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Excellent Scores"
                      value={overview.sqs_scores.distribution.excellent_80_plus}
                      subtitle="SQS >= 80"
                      icon={<TrendingUpIcon />}
                      color="success.main"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Needs Attention"
                      value={overview.sqs_scores.distribution.poor_below_40}
                      subtitle="SQS < 40"
                      icon={<WarningAmberIcon />}
                      color="error.main"
                    />
                  </Grid>
                </Grid>

                {/* Charts row */}
                <Grid container spacing={3}>
                  {/* SQS Distribution Pie */}
                  <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          SQS Score Distribution
                        </Typography>
                        {pieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey="value"
                                label={({ name, percent }) =>
                                  `${name} (${(percent * 100).toFixed(0)}%)`
                                }
                              >
                                {pieData.map((entry, index) => (
                                  <Cell
                                    key={entry.name}
                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: theme.palette.background.paper,
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 8,
                                  color: chartColors.text,
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="text.secondary">No scored submissions in this period.</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Submissions by Status Bar */}
                  <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Submissions by Status
                        </Typography>
                        {statusData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={statusData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridLine} />
                              <XAxis
                                dataKey="status"
                                tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
                              />
                              <YAxis
                                tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
                                allowDecimals={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: theme.palette.background.paper,
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 8,
                                  color: chartColors.text,
                                }}
                              />
                              <Bar dataKey="count" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="text.secondary">No submissions in this period.</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            ) : (
              !loading && (
                <Alert severity="info">No overview data available for the selected journal and period.</Alert>
              )
            )}
          </TabPanel>

          {/* ===== Tab 1: Trends ===== */}
          <TabPanel value={activeTab} index={1}>
            {trends && trends.weekly_trends.length > 0 ? (
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Weekly SQS Score Trends
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Average SQS score and submission count per week over the last {trends.period_days} days.
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={trends.weekly_trends.map((entry) => ({
                        ...entry,
                        weekLabel: new Date(entry.week).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        }),
                      }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridLine} />
                      <XAxis
                        dataKey="weekLabel"
                        tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="score"
                        domain={[0, 100]}
                        tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
                        label={{
                          value: 'Avg SQS Score',
                          angle: -90,
                          position: 'insideLeft',
                          fill: chartColors.textSecondary,
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        yAxisId="count"
                        orientation="right"
                        allowDecimals={false}
                        tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
                        label={{
                          value: 'Submissions',
                          angle: 90,
                          position: 'insideRight',
                          fill: chartColors.textSecondary,
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                          color: chartColors.text,
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="avg_sqs_score"
                        name="Avg SQS Score"
                        stroke={chartColors.primary}
                        strokeWidth={2}
                        dot={{ fill: chartColors.primary, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="count"
                        type="monotone"
                        dataKey="submission_count"
                        name="Submissions"
                        stroke={chartColors.secondary}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: chartColors.secondary, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              !loading && (
                <Alert severity="info">No trend data available. Trends require scored submissions over multiple weeks.</Alert>
              )
            )}
          </TabPanel>

          {/* ===== Tab 2: Issues ===== */}
          <TabPanel value={activeTab} index={2}>
            {issues ? (
              <Grid container spacing={3}>
                {/* Severity breakdown cards */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    {Object.entries(issues.severity_breakdown).map(([severity, count]) => {
                      const colorMap = {
                        critical: 'error',
                        major: 'warning',
                        moderate: 'info',
                        minor: 'default',
                      };
                      return (
                        <Chip
                          key={severity}
                          label={`${severity.charAt(0).toUpperCase() + severity.slice(1)}: ${count}`}
                          color={colorMap[severity] || 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.9rem', py: 2, px: 1 }}
                        />
                      );
                    })}
                    <Chip
                      label={`${issues.submissions_analyzed} manuscripts analyzed`}
                      variant="outlined"
                      sx={{ fontSize: '0.9rem', py: 2, px: 1 }}
                    />
                  </Box>
                </Grid>

                {/* Top issues bar chart */}
                <Grid item xs={12}>
                  <Card elevation={2}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Top Statistical Issues
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Most frequently flagged issue categories across all reviewed submissions
                        in the last {issues.period_days} days.
                      </Typography>
                      {issues.top_issues.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(300, issues.top_issues.length * 40)}>
                          <BarChart
                            data={issues.top_issues}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridLine} />
                            <XAxis
                              type="number"
                              tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
                              allowDecimals={false}
                            />
                            <YAxis
                              dataKey="category"
                              type="category"
                              tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
                              width={130}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 8,
                                color: chartColors.text,
                              }}
                              formatter={(value, name, props) => [
                                `${value} (${props.payload.percentage}%)`,
                                'Occurrences',
                              ]}
                            />
                            <Bar dataKey="count" fill={chartColors.warning} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography color="text.secondary">
                            No issues found in reviewed submissions.
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              !loading && (
                <Alert severity="info">No issues data available for the selected journal and period.</Alert>
              )
            )}
          </TabPanel>

          {/* ===== Tab 3: Comparison ===== */}
          <TabPanel value={activeTab} index={3}>
            {comparison ? (
              <>
                {/* Delta indicators */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <DeltaChip value={comparison.changes.submissions_pct} label="Submissions" />
                  <DeltaChip value={comparison.changes.avg_score_pct} label="Avg SQS" />
                </Box>

                <Grid container spacing={3}>
                  {/* Current Period */}
                  <Grid item xs={12} md={6}>
                    <Card
                      elevation={3}
                      sx={{
                        height: '100%',
                        border: '2px solid',
                        borderColor: 'primary.main',
                      }}
                    >
                      <CardContent>
                        <Chip label="Current Period" color="primary" size="small" sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Last {comparison.period_days} days
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              Total Submissions
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                              {comparison.current_period.submissions}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              Average SQS Score
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                              {comparison.current_period.avg_sqs_score}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              Scored Submissions
                            </Typography>
                            <Typography variant="h5">
                              {comparison.current_period.scored_count}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Previous Period */}
                  <Grid item xs={12} md={6}>
                    <Card elevation={2} sx={{ height: '100%' }}>
                      <CardContent>
                        <Chip label="Previous Period" size="small" variant="outlined" sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {comparison.period_days * 2} to {comparison.period_days} days ago
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              Total Submissions
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                              {comparison.previous_period.submissions}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              Average SQS Score
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                              {comparison.previous_period.avg_sqs_score}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              Scored Submissions
                            </Typography>
                            <Typography variant="h5">
                              {comparison.previous_period.scored_count}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            ) : (
              !loading && (
                <Alert severity="info">No comparison data available for the selected journal and period.</Alert>
              )
            )}
          </TabPanel>
        </>
      )}
    </Container>
  );
}

export default JournalAnalyticsPage;
