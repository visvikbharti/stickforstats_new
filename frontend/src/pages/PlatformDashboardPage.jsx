/**
 * Platform Dashboard Page
 * =======================
 * Comprehensive organization management dashboard for StickForStats.
 * Provides tier management, usage analytics, team management,
 * API key administration, and billing/checkout.
 *
 * Route: /platform
 * Created: February 2026
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Tooltip,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaymentIcon from '@mui/icons-material/Payment';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import StarIcon from '@mui/icons-material/Star';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import PlatformService from '../services/PlatformService';

// ---------- Helper sub-components (plain functions, no hooks) ----------

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

function TierCard({ tier, isCurrent, onSelect }) {
  const isEnterprise = tier.name === 'Enterprise';
  return (
    <Card
      elevation={isCurrent ? 6 : 2}
      sx={{
        height: '100%',
        border: isCurrent ? '2px solid' : '1px solid',
        borderColor: isCurrent ? 'primary.main' : 'divider',
        position: 'relative',
      }}
    >
      {isCurrent && (
        <Chip
          label="Current Plan"
          color="primary"
          size="small"
          icon={<StarIcon />}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        />
      )}
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {tier.name}
        </Typography>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          {tier.price === 0 ? 'Free' : `$${tier.price}/mo`}
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 0 }}>
          {(tier.features || []).map((feature, idx) => (
            <Typography component="li" variant="body2" key={idx} sx={{ mb: 0.5 }}>
              {feature}
            </Typography>
          ))}
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        {isCurrent ? (
          <Button variant="outlined" disabled fullWidth>
            Active
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={() => onSelect(tier)}
            color={isEnterprise ? 'secondary' : 'primary'}
          >
            {isEnterprise ? 'Contact Sales' : 'Upgrade'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

function OrgListCard({ org, onSelect }) {
  return (
    <Card
      elevation={2}
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
      onClick={() => onSelect(org)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" />
          <Typography variant="h6">{org.name}</Typography>
          {org.tier && (
            <Chip label={org.tier} size="small" color="primary" variant="outlined" />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {org.slug}
        </Typography>
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }) {
  const roleColor =
    member.role === 'admin' ? 'error' : member.role === 'member' ? 'primary' : 'default';
  return (
    <TableRow>
      <TableCell>{member.email || member.username || 'Unknown'}</TableCell>
      <TableCell>{member.name || '-'}</TableCell>
      <TableCell>
        <Chip label={member.role} size="small" color={roleColor} />
      </TableCell>
      <TableCell>{member.joined ? new Date(member.joined).toLocaleDateString() : '-'}</TableCell>
    </TableRow>
  );
}

function APIKeyRow({ apiKey, onRevoke }) {
  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" fontWeight="bold">
          {apiKey.name || 'Unnamed'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={apiKey.prefix ? `${apiKey.prefix}...` : '***'}
          variant="outlined"
          size="small"
          icon={<SecurityIcon />}
        />
      </TableCell>
      <TableCell>
        {apiKey.created ? new Date(apiKey.created).toLocaleDateString() : '-'}
      </TableCell>
      <TableCell>
        {apiKey.last_used ? new Date(apiKey.last_used).toLocaleDateString() : 'Never'}
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Revoke key">
          <IconButton color="error" size="small" onClick={() => onRevoke(apiKey)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

// Chart color palette
const PIE_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7'];

// ======================== Main Component ========================

export default function PlatformDashboardPage() {
  const theme = useTheme();

  // ---- All state hooks ----
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgDetail, setOrgDetail] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [members, setMembers] = useState([]);
  const [usage, setUsage] = useState(null);
  const [billing, setBilling] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create org dialog
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  // API key dialogs
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // ---- Data fetching callbacks ----

  const loadOrganizations = useCallback(async () => {
    try {
      const data = await PlatformService.getOrganizations();
      setOrganizations(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError('Failed to load organizations.');
    }
  }, []);

  const loadTiers = useCallback(async () => {
    try {
      const data = await PlatformService.getTiers();
      setTiers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      // Tiers may not be available; use defaults
      setTiers([
        {
          name: 'Free',
          price: 0,
          features: ['1,000 API calls/month', '1 team member', 'Community support'],
        },
        {
          name: 'Pro',
          price: 29,
          features: ['50,000 API calls/month', '10 team members', 'Priority support', 'API access'],
        },
        {
          name: 'Enterprise',
          price: 199,
          features: [
            'Unlimited API calls',
            'Unlimited team members',
            'Dedicated support',
            'SSO & SAML',
            'Custom integrations',
          ],
        },
      ]);
    }
  }, []);

  const loadOrgDetail = useCallback(async (slug) => {
    try {
      const data = await PlatformService.getOrganizationDetail(slug);
      setOrgDetail(data);
    } catch (err) {
      setError('Failed to load organization details.');
    }
  }, []);

  const loadMembers = useCallback(async (slug) => {
    try {
      const data = await PlatformService.getMembers(slug);
      setMembers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setMembers([]);
    }
  }, []);

  const loadUsage = useCallback(async (slug) => {
    try {
      const data = await PlatformService.getUsage({ org: slug, days: 30 });
      setUsage(data);
    } catch (err) {
      setUsage(null);
    }
  }, []);

  const loadBilling = useCallback(async (slug) => {
    try {
      const data = await PlatformService.getBilling(slug);
      setBilling(data);
    } catch (err) {
      setBilling(null);
    }
  }, []);

  const loadAPIKeys = useCallback(async (slug) => {
    try {
      const data = await PlatformService.getAPIKeys(slug);
      setApiKeys(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setApiKeys([]);
    }
  }, []);

  // ---- Effects ----

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadOrganizations(), loadTiers()]);
      setLoading(false);
    };
    init();
  }, [loadOrganizations, loadTiers]);

  // When an org is selected, load all related data
  useEffect(() => {
    if (!selectedOrg) return;
    const slug = selectedOrg.slug;
    setActiveTab(0);
    loadOrgDetail(slug);
    loadMembers(slug);
    loadUsage(slug);
    loadBilling(slug);
    loadAPIKeys(slug);
  }, [selectedOrg, loadOrgDetail, loadMembers, loadUsage, loadBilling, loadAPIKeys]);

  // ---- Action handlers ----

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const created = await PlatformService.createOrganization({ name: newOrgName.trim() });
      setCreateOrgOpen(false);
      setNewOrgName('');
      await loadOrganizations();
      setSelectedOrg(created);
    } catch (err) {
      setError('Failed to create organization.');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedOrg) return;
    setInviting(true);
    try {
      await PlatformService.inviteMember(selectedOrg.slug, inviteEmail.trim(), inviteRole);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      await loadMembers(selectedOrg.slug);
    } catch (err) {
      setError('Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !selectedOrg) return;
    setCreatingKey(true);
    try {
      const result = await PlatformService.createAPIKey({
        org: selectedOrg.slug,
        name: newKeyName.trim(),
      });
      setCreatedKey(result);
      setNewKeyName('');
      await loadAPIKeys(selectedOrg.slug);
    } catch (err) {
      setError('Failed to create API key.');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;
    try {
      await PlatformService.revokeAPIKey(keyToRevoke.id);
      setRevokeConfirmOpen(false);
      setKeyToRevoke(null);
      await loadAPIKeys(selectedOrg.slug);
    } catch (err) {
      setError('Failed to revoke API key.');
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    });
  };

  const handleUpgrade = async (tier) => {
    if (!selectedOrg) return;
    try {
      const result = await PlatformService.createCheckout({
        org: selectedOrg.slug,
        tier: tier.name.toLowerCase(),
      });
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch (err) {
      setError('Failed to start checkout session.');
    }
  };

  // ---- Derived data ----

  const currentTier = orgDetail?.tier || selectedOrg?.tier || 'Free';
  const tierLimit = currentTier === 'Enterprise' ? 999999 : currentTier === 'Pro' ? 50000 : 1000;
  const totalCalls = usage?.total_calls ?? 0;
  const usagePercent = Math.min(100, Math.round((totalCalls / tierLimit) * 100));

  const dailyData = usage?.daily || [];
  const categoryData = usage?.categories || [];
  const responseTimeTrend = usage?.response_times || [];

  // ======================== Render ========================

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Platform Dashboard...
        </Typography>
      </Container>
    );
  }

  // Error banner (always rendered, only visible when error is set)
  const errorBanner = error ? (
    <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
      {error}
    </Alert>
  ) : null;

  // ---- No org selected: show org list + create ----
  if (!selectedOrg) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <BusinessIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Platform Dashboard
          </Typography>
        </Box>

        {errorBanner}

        {/* Create Organization Card */}
        <Card elevation={3} sx={{ mb: 4, p: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Create Organization
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Organizations let you manage team access, API keys, and billing in one place.
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOrgOpen(true)}
            >
              New Organization
            </Button>
          </CardActions>
        </Card>

        {/* Existing orgs */}
        {organizations.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Your Organizations
            </Typography>
            <Grid container spacing={2}>
              {organizations.map((org) => (
                <Grid item xs={12} sm={6} md={4} key={org.slug || org.id}>
                  <OrgListCard org={org} onSelect={setSelectedOrg} />
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {organizations.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No organizations yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first organization to get started.
            </Typography>
          </Paper>
        )}

        {/* Create Org Dialog */}
        <Dialog open={createOrgOpen} onClose={() => setCreateOrgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Organization Name"
              fullWidth
              variant="outlined"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              disabled={creatingOrg}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOrgOpen(false)} disabled={creatingOrg}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              variant="contained"
              disabled={!newOrgName.trim() || creatingOrg}
            >
              {creatingOrg ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }

  // ---- Org selected: tabbed dashboard ----
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <BusinessIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Typography variant="h4" fontWeight="bold">
          Platform Dashboard
        </Typography>
      </Box>

      {/* Back button + org name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button size="small" onClick={() => setSelectedOrg(null)}>
          &larr; All Organizations
        </Button>
        <Typography variant="h6" color="text.secondary">
          {selectedOrg.name}
        </Typography>
        {currentTier && (
          <Chip label={currentTier} color="primary" size="small" variant="outlined" />
        )}
      </Box>

      {errorBanner}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<AssessmentIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<TrendingUpIcon />} label="Usage" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="Team" iconPosition="start" />
          <Tab icon={<VpnKeyIcon />} label="API Keys" iconPosition="start" />
          <Tab icon={<PaymentIcon />} label="Billing" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ========== Tab 0: Overview ========== */}
      <TabPanel value={activeTab} index={0}>
        {/* Org info card */}
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold">
              {orgDetail?.name || selectedOrg.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Tier: <strong>{currentTier}</strong> &mdash; Slug: {selectedOrg.slug}
            </Typography>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Team Members"
              value={members.length}
              icon={<PeopleIcon />}
              color={theme.palette.info.main}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="API Calls (30d)"
              value={totalCalls.toLocaleString()}
              subtitle={`${usagePercent}% of ${tierLimit.toLocaleString()} limit`}
              icon={<TrendingUpIcon />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="API Keys"
              value={apiKeys.length}
              icon={<VpnKeyIcon />}
              color={theme.palette.warning.main}
            />
          </Grid>
        </Grid>

        {/* Usage bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tier Usage
          </Typography>
          <LinearProgress
            variant="determinate"
            value={usagePercent}
            sx={{ height: 10, borderRadius: 5 }}
            color={usagePercent > 90 ? 'error' : usagePercent > 70 ? 'warning' : 'primary'}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {totalCalls.toLocaleString()} / {tierLimit.toLocaleString()} API calls used
          </Typography>
        </Paper>

        {/* Upgrade CTA */}
        {currentTier !== 'Enterprise' && (
          <Card
            elevation={2}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Unlock more with an upgrade
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get higher API limits, more team members, and priority support.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={<StarIcon />}
                onClick={() => setActiveTab(4)}
              >
                View Plans
              </Button>
            </CardActions>
          </Card>
        )}
      </TabPanel>

      {/* ========== Tab 1: Usage ========== */}
      <TabPanel value={activeTab} index={1}>
        {/* Daily API calls area chart */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Daily API Calls (Last 30 Days)
          </Typography>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke={theme.palette.primary.main}
                  fill={theme.palette.primary.main}
                  fillOpacity={0.2}
                  name="API Calls"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">No usage data available yet.</Typography>
            </Box>
          )}
        </Paper>

        {/* Category breakdown pie chart */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Category Breakdown
              </Typography>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No category data.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Response time trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Response Time Trend
              </Typography>
              {responseTimeTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={responseTimeTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis unit="ms" />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="avg_ms"
                      stroke={theme.palette.secondary.main}
                      fill={theme.palette.secondary.main}
                      fillOpacity={0.15}
                      name="Avg Response (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No response time data.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ========== Tab 2: Team ========== */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Team Members ({members.length})</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite Member
          </Button>
        </Box>

        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.length > 0 ? (
                members.map((m, idx) => <MemberRow key={m.id || idx} member={m} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No team members found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* Invite Dialog */}
        <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviting}
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Role
            </Typography>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              fullWidth
              size="small"
              disabled={inviting}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              variant="contained"
              disabled={!inviteEmail.trim() || inviting}
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* ========== Tab 3: API Keys ========== */}
      <TabPanel value={activeTab} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">API Keys ({apiKeys.length})</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreatedKey(null);
              setCreateKeyOpen(true);
            }}
          >
            Create API Key
          </Button>
        </Box>

        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key Prefix</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Used</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apiKeys.length > 0 ? (
                apiKeys.map((k, idx) => (
                  <APIKeyRow
                    key={k.id || idx}
                    apiKey={k}
                    onRevoke={(key) => {
                      setKeyToRevoke(key);
                      setRevokeConfirmOpen(true);
                    }}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No API keys created yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* Create Key Dialog */}
        <Dialog
          open={createKeyOpen}
          onClose={() => {
            setCreateKeyOpen(false);
            setCreatedKey(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{createdKey ? 'API Key Created' : 'Create API Key'}</DialogTitle>
          <DialogContent>
            {!createdKey ? (
              <TextField
                autoFocus
                margin="dense"
                label="Key Name"
                fullWidth
                variant="outlined"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                disabled={creatingKey}
                placeholder="e.g., Production Backend"
              />
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Copy this key now. It will not be shown again.
                </Alert>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mr: 1 }}>
                    {createdKey.key || createdKey.token || 'N/A'}
                  </Typography>
                  <Tooltip title={keyCopied ? 'Copied!' : 'Copy to clipboard'}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyKey(createdKey.key || createdKey.token || '')}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
                {keyCopied && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                    Copied to clipboard!
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {!createdKey ? (
              <>
                <Button onClick={() => setCreateKeyOpen(false)} disabled={creatingKey}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKey}
                  variant="contained"
                  disabled={!newKeyName.trim() || creatingKey}
                >
                  {creatingKey ? 'Creating...' : 'Create'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setCreateKeyOpen(false);
                  setCreatedKey(null);
                }}
                variant="contained"
              >
                Done
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Revoke Confirmation Dialog */}
        <Dialog
          open={revokeConfirmOpen}
          onClose={() => setRevokeConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to revoke the key{' '}
              <strong>{keyToRevoke?.name || 'this key'}</strong>? This action cannot be undone.
              Any applications using this key will lose access immediately.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRevokeConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleRevokeKey} variant="contained" color="error">
              Revoke
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* ========== Tab 4: Billing ========== */}
      <TabPanel value={activeTab} index={4}>
        {/* Current plan */}
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PaymentIcon color="primary" />
              <Typography variant="h6">Current Plan</Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {currentTier}
            </Typography>
            {billing?.next_billing_date && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Next billing date: {new Date(billing.next_billing_date).toLocaleDateString()}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Tier comparison grid */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Compare Plans
        </Typography>
        <Grid container spacing={3}>
          {tiers.map((tier) => (
            <Grid item xs={12} md={4} key={tier.name}>
              <TierCard
                tier={tier}
                isCurrent={tier.name.toLowerCase() === currentTier.toLowerCase()}
                onSelect={handleUpgrade}
              />
            </Grid>
          ))}
        </Grid>

        {/* Stripe checkout note */}
        <Paper sx={{ p: 2, mt: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <SecurityIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Payments are securely processed by Stripe. StickForStats never stores your card details.
            </Typography>
          </Box>
        </Paper>
      </TabPanel>
    </Container>
  );
}
