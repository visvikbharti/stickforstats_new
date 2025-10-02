import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert, 
  Divider, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardHeader,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { TwitterPicker } from 'react-color';

import { 
  fetchSampleGroups, 
  fetchSamples, 
  createSampleGroup, 
  updateSampleGroup,
  deleteSampleGroup,
  updateSample 
} from '../../api/pcaApi';

// Helper function to get contrasting text color (black/white) based on background color
const getContrastText = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

const SampleGroupManager = ({ projectId, project, onGroupsConfigured, onNext }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [groups, setGroups] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupColor, setGroupColor] = useState('#3f51b5');
  
  // Sample view dialog state
  const [sampleViewDialogOpen, setSampleViewDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch sample groups and samples in parallel
      const [groupsData, samplesData] = await Promise.all([
        fetchSampleGroups(projectId),
        fetchSamples(projectId)
      ]);
      
      setGroups(groupsData);
      setSamples(samplesData);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      // Editing existing group
      setEditingGroup(group);
      setGroupName(group.name);
      setGroupDescription(group.description || '');
      setGroupColor(group.color || '#3f51b5');
    } else {
      // Creating new group
      setEditingGroup(null);
      setGroupName('');
      setGroupDescription('');
      setGroupColor('#3f51b5');
    }
    setGroupDialogOpen(true);
  };

  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const groupData = {
        name: groupName,
        description: groupDescription,
        color: groupColor
      };
      
      if (editingGroup) {
        // Update existing group
        await updateSampleGroup(projectId, editingGroup.id, groupData);
        setSuccess(`Group "${groupName}" updated successfully`);
      } else {
        // Create new group
        await createSampleGroup(projectId, groupData);
        setSuccess(`Group "${groupName}" created successfully`);
      }
      
      // Reload data
      await loadData();
      handleCloseGroupDialog();
    } catch (err) {
      setError(`Failed to save group: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to delete group "${groupName}"?`)) {
      try {
        setLoading(true);
        setError(null);
        
        await deleteSampleGroup(projectId, groupId);
        setSuccess(`Group "${groupName}" deleted successfully`);
        
        // Reload data
        await loadData();
      } catch (err) {
        setError(`Failed to delete group: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewSamples = (group) => {
    setSelectedGroup(group);
    setSampleViewDialogOpen(true);
  };

  const handleChangeGroupAssignment = async (sampleId, newGroupId) => {
    try {
      setLoading(true);
      setError(null);
      
      await updateSample(projectId, sampleId, { group: newGroupId });
      
      // Reload data
      await loadData();
      setSuccess('Sample group assignment updated successfully');
    } catch (err) {
      setError(`Failed to update sample: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getGroupSampleCount = (groupId) => {
    return samples.filter(sample => sample.group === groupId).length;
  };

  const getGroupNameById = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown';
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Manage Sample Groups
      </Typography>
      
      <Typography paragraph>
        Organize your samples into meaningful groups for better PCA visualization and interpretation.
        Groups can represent different conditions, treatments, time points, or any other experimental factors.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {loading && groups.length === 0 && samples.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardHeader 
                title="Sample Groups" 
                subheader={`${groups.length} groups defined`}
                action={
                  <Tooltip title="Create a new sample group">
                    <IconButton 
                      color="primary" 
                      onClick={() => handleOpenGroupDialog()}
                      disabled={loading}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                {groups.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No sample groups defined yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenGroupDialog()}
                      disabled={loading}
                      sx={{ mt: 1 }}
                    >
                      Create Group
                    </Button>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Group Name</TableCell>
                          <TableCell align="center">Samples</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box 
                                  sx={{ 
                                    width: 20, 
                                    height: 20, 
                                    borderRadius: '50%', 
                                    backgroundColor: group.color || theme.palette.primary.main,
                                    mr: 1
                                  }} 
                                />
                                <Typography variant="body2">
                                  {group.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={getGroupSampleCount(group.id)} 
                                size="small"
                                color={getGroupSampleCount(group.id) > 0 ? "primary" : "default"}
                                variant={getGroupSampleCount(group.id) > 0 ? "filled" : "outlined"}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="View samples">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleViewSamples(group)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit group">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleOpenGroupDialog(group)}
                                  disabled={loading}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete group">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeleteGroup(group.id, group.name)}
                                  disabled={loading}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardHeader 
                title="Sample Overview" 
                subheader={`${samples.length} samples available`}
                action={
                  <Tooltip title="Sample information is extracted from your data file">
                    <IconButton>
                      <InfoOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                {samples.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No samples available in this project
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <TableContainer 
                      component={Paper} 
                      variant="outlined" 
                      sx={{ maxHeight: 300, overflow: 'auto' }}
                    >
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Sample Name</TableCell>
                            <TableCell>Group</TableCell>
                            <TableCell>Replicate ID</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {samples.slice(0, 10).map((sample) => (
                            <TableRow key={sample.id}>
                              <TableCell>
                                <Typography variant="body2" noWrap>
                                  {sample.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <FormControl 
                                  size="small" 
                                  fullWidth
                                  variant="outlined"
                                >
                                  <Select
                                    value={sample.group}
                                    onChange={(e) => handleChangeGroupAssignment(sample.id, e.target.value)}
                                    disabled={loading}
                                    size="small"
                                  >
                                    {groups.map((group) => (
                                      <MenuItem key={group.id} value={group.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <Box 
                                            sx={{ 
                                              width: 10, 
                                              height: 10, 
                                              borderRadius: '50%', 
                                              backgroundColor: group.color || theme.palette.primary.main,
                                              mr: 1
                                            }} 
                                          />
                                          {group.name}
                                        </Box>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {sample.replicate_id}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                          {samples.length > 10 && (
                            <TableRow>
                              <TableCell colSpan={3} align="center">
                                <Typography variant="body2" color="text.secondary">
                                  {samples.length - 10} more samples...
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      Tip: If needed, adjust the sample group assignments using the dropdown menus.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={handleCloseGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGroup ? `Edit Group: ${editingGroup.name}` : 'Create New Sample Group'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Group Name"
              fullWidth
              margin="normal"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loading}
              required
            />
            
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              disabled={loading}
              multiline
              rows={2}
            />
            
            <Box sx={{ mt: 3, mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Group Color
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    bgcolor: groupColor,
                    mr: 2,
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getContrastText(groupColor)
                  }}
                >
                  <GroupIcon />
                </Box>
                <TextField
                  size="small"
                  value={groupColor}
                  onChange={(e) => setGroupColor(e.target.value)}
                  sx={{ width: 120 }}
                />
              </Box>
              <TwitterPicker
                color={groupColor}
                onChange={(color) => setGroupColor(color.hex)}
                triangle="hide"
                width={isMobile ? '100%' : 'auto'}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveGroup} 
            variant="contained" 
            disabled={loading || !groupName.trim()}
          >
            {loading ? <CircularProgress size={24} /> : (editingGroup ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Sample View Dialog */}
      <Dialog 
        open={sampleViewDialogOpen} 
        onClose={() => setSampleViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Samples in {selectedGroup?.name || ''}
        </DialogTitle>
        <DialogContent>
          {selectedGroup && (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sample Name</TableCell>
                    <TableCell>Replicate ID</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {samples
                    .filter(sample => sample.group === selectedGroup.id)
                    .map((sample) => (
                      <TableRow key={sample.id}>
                        <TableCell>{sample.name}</TableCell>
                        <TableCell>{sample.replicate_id}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={sample.group}
                              onChange={(e) => handleChangeGroupAssignment(sample.id, e.target.value)}
                              disabled={loading}
                              size="small"
                              displayEmpty
                            >
                              <MenuItem value="" disabled>
                                Move to...
                              </MenuItem>
                              <Divider />
                              {groups
                                .filter(g => g.id !== selectedGroup.id)
                                .map((group) => (
                                  <MenuItem key={group.id} value={group.id}>
                                    {group.name}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))}
                  {samples.filter(sample => sample.group === selectedGroup.id).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No samples in this group
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSampleViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (onGroupsConfigured) {
              onGroupsConfigured();
            }
            if (onNext) {
              onNext();
            }
          }}
          disabled={loading}
        >
          Continue to PCA Configuration
        </Button>
      </Box>
    </Box>
  );
};

export default SampleGroupManager;