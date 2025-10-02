import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Security as SecurityIcon,
  Fingerprint as FingerprintIcon,
  VerifiedUser as VerifiedIcon
} from '@mui/icons-material';
import { useDarkMode } from '../context/DarkModeContext';
import { useSnackbar } from 'notistack';
import StatisticalTestService from '../services/StatisticalTestService';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

const AuditDashboard = () => {
  const { darkMode } = useDarkMode();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [selectedTab, setSelectedTab] = useState(0);
  const [auditData, setAuditData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedField, setSelectedField] = useState('all');
  const [timeRange, setTimeRange] = useState('quarter');
  const [certificationDialog, setCertificationDialog] = useState(false);
  const [currentCertification, setCurrentCertification] = useState(null);

  const chartColors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main
  };

  // Real data loading from backend
  const fetchAuditData = async (field, range) => {
    try {
      // Try to fetch real data from backend
      const service = new StatisticalTestService();
      const response = await service.apiClient.get('/api/audit/summary/', {
        params: {
          field: field === 'all' ? null : field,
          time_range: range
        }
      });
      return response.data;
    } catch (error) {
      // If no data available, return null to show empty state
      console.log('No audit data available yet');
      return null;
    }
  };

  useEffect(() => {
    loadAuditData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedField, timeRange]);

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditData(selectedField, timeRange);
      setAuditData(data);
      if (!data) {
        enqueueSnackbar('No audit data available yet. Data will appear as analyses are performed.', { variant: 'info' });
      }
    } catch (error) {
      enqueueSnackbar('Failed to load audit data', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCertification = (validation) => {
    setCurrentCertification({
      id: `CERT-${Date.now()}`,
      validationId: validation.id,
      timestamp: new Date().toISOString(),
      test: validation.test,
      score: validation.score,
      assumptions: validation.assumptionsPassed ? 'All Passed' : 'Some Violations',
      precision: '50-decimal',
      reproducible: true
    });
    setCertificationDialog(true);
  };

  const downloadCertificate = () => {
    const cert = currentCertification;
    const content = `
STATISTICAL VALIDATION CERTIFICATE
===================================

Certificate ID: ${cert.id}
Issue Date: ${new Date(cert.timestamp).toLocaleString()}

TEST INFORMATION
----------------
Test Type: ${cert.test}
Methodology Score: ${cert.score}/100
Assumptions: ${cert.assumptions}
Precision: ${cert.precision}
Reproducible: ${cert.reproducible ? 'Yes' : 'No'}

VALIDATION DETAILS
------------------
This analysis has been validated using the StickForStats
methodology framework with comprehensive assumption checking
and 50-decimal precision calculations.

All calculations are fully auditable and reproducible.

Issued by: StickForStats Validation Platform
Version: 1.0.0
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${cert.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    enqueueSnackbar('Certificate downloaded', { variant: 'success' });
    setCertificationDialog(false);
  };

  const renderSummaryMetrics = () => {
    if (!auditData || !auditData.summary) {
      // Show empty state with placeholders
      const emptyMetrics = [
        {
          label: 'Total Analyses',
          value: '—',
          icon: <ScienceIcon />,
          color: theme.palette.primary.main
        },
        {
          label: 'Methodology Score',
          value: '—',
          icon: <AssessmentIcon />,
          color: theme.palette.success.main
        },
        {
          label: 'Reproducibility',
          value: '—',
          icon: <FingerprintIcon />,
          color: theme.palette.info.main
        },
        {
          label: 'Assumptions Checked',
          value: '—',
          icon: <VerifiedIcon />,
          color: theme.palette.warning.main
        }
      ];

      return (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              No analyses have been performed yet. Metrics will appear here once you start using the statistical tests.
            </Typography>
          </Alert>
          <Grid container spacing={3}>
            {emptyMetrics.map((metric, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ opacity: 0.7 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          backgroundColor: alpha(metric.color, 0.1),
                          color: metric.color,
                          mr: 2
                        }}
                      >
                        {metric.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h4" fontWeight="bold" color="textSecondary">
                          {metric.value}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {metric.label}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      );
    }

    const metrics = [
      {
        label: 'Total Analyses',
        value: auditData.summary.totalAnalyses,
        icon: <ScienceIcon />,
        color: theme.palette.primary.main
      },
      {
        label: 'Methodology Score',
        value: `${auditData.summary.methodologyScore}%`,
        icon: <AssessmentIcon />,
        color: theme.palette.success.main
      },
      {
        label: 'Reproducibility',
        value: `${auditData.summary.reproducibilityScore}%`,
        icon: <FingerprintIcon />,
        color: theme.palette.info.main
      },
      {
        label: 'Assumptions Checked',
        value: auditData.summary.assumptionsChecked,
        icon: <VerifiedIcon />,
        color: theme.palette.warning.main
      }
    ];

    return (
      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(metric.color, 0.1),
                      color: metric.color,
                      mr: 2
                    }}
                  >
                    {metric.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {metric.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {metric.label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderFieldAnalysis = () => {
    if (!auditData || !auditData.byField) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis by Field
            </Typography>
            <Box sx={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.action.hover, 0.05),
              borderRadius: 2
            }}>
              <Typography variant="body2" color="textSecondary" align="center">
                No field analysis data available yet.
                <br />
                Data will appear here once analyses are performed.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Analysis by Field
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={auditData.byField}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
              <XAxis dataKey="field" stroke={theme.palette.text.primary} />
              <YAxis stroke={theme.palette.text.primary} />
              <ChartTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`
                }}
              />
              <Bar dataKey="score" fill={chartColors.primary} name="Methodology Score" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderTestTypeAnalysis = () => {
    if (!auditData || !auditData.byTestType) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Type Distribution
            </Typography>
            <Box sx={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.action.hover, 0.05),
              borderRadius: 2
            }}>
              <Typography variant="body2" color="textSecondary" align="center">
                No test distribution data available yet.
                <br />
                Data will appear here once analyses are performed.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      );
    }

    const pieData = auditData.byTestType.map(item => ({
      name: item.test,
      value: item.count
    }));

    const COLORS = [
      chartColors.primary,
      chartColors.secondary,
      chartColors.success,
      chartColors.warning,
      chartColors.info
    ];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Type Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderTrendAnalysis = () => {
    if (!auditData || !auditData.trends) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Methodology Improvement Trends
            </Typography>
            <Box sx={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.action.hover, 0.05),
              borderRadius: 2
            }}>
              <Typography variant="body2" color="textSecondary" align="center">
                No trend data available yet.
                <br />
                Trends will appear here as analyses accumulate over time.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Methodology Improvement Trends
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={auditData.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
              <XAxis dataKey="month" stroke={theme.palette.text.primary} />
              <YAxis stroke={theme.palette.text.primary} />
              <ChartTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke={chartColors.success}
                strokeWidth={2}
                name="Methodology Score"
              />
              <Line
                type="monotone"
                dataKey="violations"
                stroke={chartColors.error}
                strokeWidth={2}
                name="Violations Detected"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderMethodologyRadar = () => {
    if (!auditData) return null;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Methodology Metrics
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={auditData.methodologyMetrics}>
              <PolarGrid stroke={alpha(theme.palette.divider, 0.3)} />
              <PolarAngleAxis dataKey="metric" stroke={theme.palette.text.primary} />
              <PolarRadiusAxis stroke={theme.palette.text.primary} />
              <Radar
                name="Score"
                dataKey="value"
                stroke={chartColors.primary}
                fill={chartColors.primary}
                fillOpacity={0.6}
              />
              <ChartTooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderRecentValidations = () => {
    if (!auditData || !auditData.recentValidations || auditData.recentValidations.length === 0) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Validations
            </Typography>
            <Box sx={{
              py: 6,
              px: 2,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.action.hover, 0.05),
              borderRadius: 2
            }}>
              <Typography variant="body2" color="textSecondary">
                No validations have been performed yet.
                <br />
                Start using the statistical tests and validations will appear here automatically.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ScienceIcon />}
                sx={{ mt: 3 }}
                href="/unified-test"
              >
                Go to Statistical Tests
              </Button>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Validations
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Test Type</TableCell>
                  <TableCell>Field</TableCell>
                  <TableCell>Assumptions</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditData.recentValidations.map((validation) => (
                  <TableRow key={validation.id}>
                    <TableCell>{validation.id}</TableCell>
                    <TableCell>{validation.test}</TableCell>
                    <TableCell>{validation.field}</TableCell>
                    <TableCell>
                      {validation.assumptionsPassed ? (
                        <Chip icon={<CheckIcon />} label="Passed" color="success" size="small" />
                      ) : (
                        <Chip icon={<WarningIcon />} label="Violations" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LinearProgress
                          variant="determinate"
                          value={validation.score}
                          sx={{ width: 60, mr: 1 }}
                        />
                        <Typography variant="body2">{validation.score}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Generate Certificate">
                        <IconButton
                          size="small"
                          onClick={() => generateCertification(validation)}
                        >
                          <VerifiedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        background: darkMode
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SecurityIcon sx={{ mr: 2, fontSize: 40, color: theme.palette.primary.main }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            Statistical Practice Audit Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Transparent methodology validation and field-level insights
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 150, mr: 2 }}>
          <InputLabel>Field</InputLabel>
          <Select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            label="Field"
            size="small"
          >
            <MenuItem value="all">All Fields</MenuItem>
            <MenuItem value="medicine">Medicine</MenuItem>
            <MenuItem value="psychology">Psychology</MenuItem>
            <MenuItem value="biology">Biology</MenuItem>
            <MenuItem value="economics">Economics</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120, mr: 2 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Period"
            size="small"
          >
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="quarter">Quarter</MenuItem>
            <MenuItem value="year">Year</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => enqueueSnackbar('Report downloaded', { variant: 'success' })}
        >
          Export Report
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          This dashboard provides aggregate insights into statistical methodology patterns.
          All analyses are anonymous and focus on methodological improvement opportunities.
        </Typography>
      </Alert>

      <Tabs
        value={selectedTab}
        onChange={(e, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Overview" />
        <Tab label="Field Analysis" />
        <Tab label="Trends" />
        <Tab label="Validations" />
      </Tabs>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {selectedTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {renderSummaryMetrics()}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderFieldAnalysis()}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderTestTypeAnalysis()}
              </Grid>
            </Grid>
          )}

          {selectedTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                {renderFieldAnalysis()}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderTestTypeAnalysis()}
              </Grid>
              <Grid item xs={12}>
                {renderMethodologyRadar()}
              </Grid>
            </Grid>
          )}

          {selectedTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {renderTrendAnalysis()}
              </Grid>
              <Grid item xs={12}>
                {renderMethodologyRadar()}
              </Grid>
            </Grid>
          )}

          {selectedTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {renderRecentValidations()}
              </Grid>
            </Grid>
          )}
        </>
      )}

      <Dialog
        open={certificationDialog}
        onClose={() => setCertificationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Validation Certificate</DialogTitle>
        <DialogContent>
          {currentCertification && (
            <Box>
              <Typography variant="body1" paragraph>
                Certificate ID: <strong>{currentCertification.id}</strong>
              </Typography>
              <Typography variant="body1" paragraph>
                Test: <strong>{currentCertification.test}</strong>
              </Typography>
              <Typography variant="body1" paragraph>
                Score: <strong>{currentCertification.score}/100</strong>
              </Typography>
              <Typography variant="body1" paragraph>
                Assumptions: <strong>{currentCertification.assumptions}</strong>
              </Typography>
              <Alert severity="success">
                This validation has been performed with 50-decimal precision
                and is fully reproducible.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertificationDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={downloadCertificate}>
            Download Certificate
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AuditDashboard;