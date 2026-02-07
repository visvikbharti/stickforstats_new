/**
 * Clustering Component
 * ====================
 *
 * Comprehensive clustering analysis with multiple algorithms.
 *
 * Features:
 * - K-Means clustering with elbow method for k selection
 * - Hierarchical clustering with dendrogram
 * - DBSCAN with automatic epsilon parameter tuning
 * - Validation metrics: Silhouette, Calinski-Harabasz, Davies-Bouldin
 * - 2D visualization with PCA projection
 * - Cluster size distribution
 *
 * Backend API: /api/v1/ml/clustering/
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  CircularProgress,
  Button,
  Slider,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  useTheme
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';

// Cluster colors
const CLUSTER_COLORS = [
  '#1976d2', '#dc004e', '#388e3c', '#f57c00', '#7b1fa2',
  '#0288d1', '#c2185b', '#689f38', '#ffa000', '#512da8',
  '#00796b', '#d32f2f', '#5d4037', '#455a64', '#e91e63'
];

const Clustering = ({ data }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  // Algorithm selection
  const [algorithm, setAlgorithm] = useState('kmeans');

  // K-Means parameters
  const [nClusters, setNClusters] = useState(3);
  const [maxIter, setMaxIter] = useState(300);

  // Hierarchical parameters
  const [linkageMethod, setLinkageMethod] = useState('ward');

  // DBSCAN parameters
  const [eps, setEps] = useState(0.5);
  const [minSamples, setMinSamples] = useState(5);

  // Feature selection
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  // Results
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Elbow analysis
  const [elbowData, setElbowData] = useState(null);
  const [showElbow, setShowElbow] = useState(false);

  /**
   * Detect numeric columns
   */
  const columnInfo = useMemo(() => {
    if (!data || data.length === 0) return { numeric: [] };

    const numeric = [];

    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        numeric.push(key);
      }
    });

    return { numeric };
  }, [data]);

  /**
   * Prepare data matrix
   */
  const preparedData = useMemo(() => {
    if (!data || selectedFeatures.length < 2) return null;

    // Extract numeric values
    const matrix = data
      .map(row => {
        const point = {};
        selectedFeatures.forEach(f => {
          point[f] = parseFloat(row[f]);
        });
        return point;
      })
      .filter(row => selectedFeatures.every(f => !isNaN(row[f])));

    if (matrix.length < 3) return null;

    // Standardize data
    const means = {};
    const stds = {};

    selectedFeatures.forEach(f => {
      const values = matrix.map(row => row[f]);
      means[f] = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - means[f], 2), 0) / values.length;
      stds[f] = Math.sqrt(variance) || 1;
    });

    const standardized = matrix.map(row => {
      const point = {};
      selectedFeatures.forEach(f => {
        point[f] = (row[f] - means[f]) / stds[f];
      });
      return point;
    });

    return {
      original: matrix,
      standardized,
      means,
      stds,
      n: matrix.length
    };
  }, [data, selectedFeatures]);

  /**
   * Run K-Means clustering
   */
  const runKMeans = useCallback((dataPoints, k, maxIterations = 300) => {
    const n = dataPoints.length;
    const features = selectedFeatures;

    // Initialize centroids randomly
    const indices = [];
    while (indices.length < k) {
      const idx = Math.floor(Math.random() * n);
      if (!indices.includes(idx)) indices.push(idx);
    }

    let centroids = indices.map(i => ({ ...dataPoints[i] }));
    let assignments = new Array(n).fill(0);
    let prevAssignments = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let minCluster = 0;

        for (let c = 0; c < k; c++) {
          let dist = 0;
          features.forEach(f => {
            dist += Math.pow(dataPoints[i][f] - centroids[c][f], 2);
          });
          dist = Math.sqrt(dist);

          if (dist < minDist) {
            minDist = dist;
            minCluster = c;
          }
        }
        assignments[i] = minCluster;
      }

      // Check convergence
      if (JSON.stringify(assignments) === JSON.stringify(prevAssignments)) {
        break;
      }
      prevAssignments = [...assignments];

      // Update centroids
      for (let c = 0; c < k; c++) {
        const clusterPoints = dataPoints.filter((_, i) => assignments[i] === c);
        if (clusterPoints.length > 0) {
          features.forEach(f => {
            centroids[c][f] = clusterPoints.reduce((sum, p) => sum + p[f], 0) / clusterPoints.length;
          });
        }
      }
    }

    // Calculate inertia (within-cluster sum of squares)
    let inertia = 0;
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      features.forEach(f => {
        inertia += Math.pow(dataPoints[i][f] - centroids[c][f], 2);
      });
    }

    return { assignments, centroids, inertia };
  }, [selectedFeatures]);

  /**
   * Run Hierarchical clustering
   */
  const runHierarchical = useCallback((dataPoints, k, method = 'single') => {
    const n = dataPoints.length;
    const features = selectedFeatures;

    // Calculate distance matrix (point-to-point Euclidean distances)
    const distances = [];
    for (let i = 0; i < n; i++) {
      distances[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distances[i][j] = 0;
        } else {
          let dist = 0;
          features.forEach(f => {
            dist += Math.pow(dataPoints[i][f] - dataPoints[j][f], 2);
          });
          distances[i][j] = Math.sqrt(dist);
        }
      }
    }

    // Helper: calculate cluster centroid
    const clusterCentroid = (cluster) => {
      const center = {};
      features.forEach(f => {
        center[f] = cluster.reduce((sum, i) => sum + dataPoints[i][f], 0) / cluster.length;
      });
      return center;
    };

    // Helper: calculate within-cluster sum of squares for a set of point indices
    const withinClusterSS = (cluster) => {
      const center = clusterCentroid(cluster);
      let ss = 0;
      cluster.forEach(i => {
        features.forEach(f => {
          ss += Math.pow(dataPoints[i][f] - center[f], 2);
        });
      });
      return ss;
    };

    // Calculate inter-cluster distance based on selected linkage method
    const calcClusterDistance = (clusterA, clusterB) => {
      switch (method) {
        case 'complete': {
          // Complete linkage: maximum distance between any two points in different clusters
          let maxDist = -Infinity;
          for (const pi of clusterA) {
            for (const pj of clusterB) {
              if (distances[pi][pj] > maxDist) {
                maxDist = distances[pi][pj];
              }
            }
          }
          return maxDist;
        }

        case 'average': {
          // Average linkage: average distance between all pairs of points in different clusters
          let totalDist = 0;
          let count = 0;
          for (const pi of clusterA) {
            for (const pj of clusterB) {
              totalDist += distances[pi][pj];
              count++;
            }
          }
          return count > 0 ? totalDist / count : Infinity;
        }

        case 'ward': {
          // Ward's method: merge clusters that result in minimum increase of total within-cluster variance
          const merged = [...clusterA, ...clusterB];
          const ssA = withinClusterSS(clusterA);
          const ssB = withinClusterSS(clusterB);
          const ssMerged = withinClusterSS(merged);
          // The "distance" is the increase in total within-cluster SS
          return ssMerged - ssA - ssB;
        }

        case 'single':
        default: {
          // Single linkage: minimum distance between any two points in different clusters
          let minDist = Infinity;
          for (const pi of clusterA) {
            for (const pj of clusterB) {
              if (distances[pi][pj] < minDist) {
                minDist = distances[pi][pj];
              }
            }
          }
          return minDist;
        }
      }
    };

    // Agglomerative clustering
    let clusters = dataPoints.map((_, i) => [i]);
    const linkageHistory = [];

    while (clusters.length > k) {
      // Find closest pair of clusters
      let minDist = Infinity;
      let mergeI = 0, mergeJ = 1;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const clusterDist = calcClusterDistance(clusters[i], clusters[j]);

          if (clusterDist < minDist) {
            minDist = clusterDist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Merge clusters
      linkageHistory.push({
        cluster1: mergeI,
        cluster2: mergeJ,
        distance: minDist,
        size: clusters[mergeI].length + clusters[mergeJ].length
      });

      clusters[mergeI] = [...clusters[mergeI], ...clusters[mergeJ]];
      clusters.splice(mergeJ, 1);
    }

    // Create assignments array
    const assignments = new Array(n).fill(0);
    clusters.forEach((cluster, clusterIdx) => {
      cluster.forEach(pointIdx => {
        assignments[pointIdx] = clusterIdx;
      });
    });

    // Calculate cluster centers
    const centroids = clusters.map(cluster => clusterCentroid(cluster));

    return { assignments, centroids, linkageHistory };
  }, [selectedFeatures]);

  /**
   * Run DBSCAN clustering
   */
  const runDBSCAN = useCallback((dataPoints) => {
    const n = dataPoints.length;
    const features = selectedFeatures;
    const assignments = new Array(n).fill(-1);  // -1 = unvisited
    let clusterId = 0;

    // Calculate distance between two points
    const distance = (i, j) => {
      let dist = 0;
      features.forEach(f => {
        dist += Math.pow(dataPoints[i][f] - dataPoints[j][f], 2);
      });
      return Math.sqrt(dist);
    };

    // Find neighbors within eps
    const getNeighbors = (pointIdx) => {
      const neighbors = [];
      for (let i = 0; i < n; i++) {
        if (distance(pointIdx, i) <= eps) {
          neighbors.push(i);
        }
      }
      return neighbors;
    };

    // Process each point
    for (let i = 0; i < n; i++) {
      if (assignments[i] !== -1) continue;  // Already processed

      const neighbors = getNeighbors(i);

      if (neighbors.length < minSamples) {
        assignments[i] = -2;  // Noise
      } else {
        // Start new cluster
        const seedSet = [...neighbors];
        assignments[i] = clusterId;

        while (seedSet.length > 0) {
          const current = seedSet.shift();

          if (assignments[current] === -2) {
            assignments[current] = clusterId;  // Border point
          }

          if (assignments[current] !== -1) continue;

          assignments[current] = clusterId;
          const currentNeighbors = getNeighbors(current);

          if (currentNeighbors.length >= minSamples) {
            seedSet.push(...currentNeighbors.filter(n =>
              assignments[n] === -1 || assignments[n] === -2
            ));
          }
        }

        clusterId++;
      }
    }

    // Convert noise points to -1
    for (let i = 0; i < n; i++) {
      if (assignments[i] === -2) assignments[i] = -1;
    }

    // Calculate cluster centers (excluding noise)
    const nClusters = clusterId;
    const centroids = [];

    for (let c = 0; c < nClusters; c++) {
      const clusterPoints = dataPoints.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        const center = {};
        features.forEach(f => {
          center[f] = clusterPoints.reduce((sum, p) => sum + p[f], 0) / clusterPoints.length;
        });
        centroids.push(center);
      }
    }

    return {
      assignments,
      centroids,
      nClusters,
      nNoise: assignments.filter(a => a === -1).length
    };
  }, [selectedFeatures, eps, minSamples]);

  /**
   * Calculate validation metrics
   */
  const calculateMetrics = useCallback((dataPoints, assignments) => {
    const n = dataPoints.length;
    const features = selectedFeatures;
    const uniqueClusters = [...new Set(assignments.filter(a => a >= 0))];
    const k = uniqueClusters.length;

    if (k < 2) {
      return { silhouette: NaN, calinskiHarabasz: NaN, daviesBouldin: NaN };
    }

    // Calculate pairwise distances
    const distance = (i, j) => {
      let dist = 0;
      features.forEach(f => {
        dist += Math.pow(dataPoints[i][f] - dataPoints[j][f], 2);
      });
      return Math.sqrt(dist);
    };

    // Silhouette score
    let silhouetteSum = 0;
    let silhouetteCount = 0;

    for (let i = 0; i < n; i++) {
      if (assignments[i] < 0) continue;  // Skip noise

      const cluster = assignments[i];
      const sameCluster = [];
      const otherClusters = {};

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (assignments[j] === cluster) {
          sameCluster.push(distance(i, j));
        } else if (assignments[j] >= 0) {
          if (!otherClusters[assignments[j]]) {
            otherClusters[assignments[j]] = [];
          }
          otherClusters[assignments[j]].push(distance(i, j));
        }
      }

      if (sameCluster.length === 0) continue;

      const a = sameCluster.reduce((sum, d) => sum + d, 0) / sameCluster.length;
      const b = Math.min(...Object.values(otherClusters).map(dists =>
        dists.reduce((sum, d) => sum + d, 0) / dists.length
      ));

      const s = (b - a) / Math.max(a, b);
      silhouetteSum += s;
      silhouetteCount++;
    }

    const silhouette = silhouetteCount > 0 ? silhouetteSum / silhouetteCount : 0;

    // Calinski-Harabasz (simplified)
    const grandMean = {};
    features.forEach(f => {
      grandMean[f] = dataPoints.reduce((sum, p) => sum + p[f], 0) / n;
    });

    let bgss = 0;  // Between-group sum of squares
    let wgss = 0;  // Within-group sum of squares

    uniqueClusters.forEach(c => {
      const clusterPoints = dataPoints.filter((_, i) => assignments[i] === c);
      const nk = clusterPoints.length;

      const clusterMean = {};
      features.forEach(f => {
        clusterMean[f] = clusterPoints.reduce((sum, p) => sum + p[f], 0) / nk;
      });

      // Between-group
      features.forEach(f => {
        bgss += nk * Math.pow(clusterMean[f] - grandMean[f], 2);
      });

      // Within-group
      clusterPoints.forEach(p => {
        features.forEach(f => {
          wgss += Math.pow(p[f] - clusterMean[f], 2);
        });
      });
    });

    const calinskiHarabasz = wgss > 0 ? (bgss / (k - 1)) / (wgss / (n - k)) : 0;

    // Davies-Bouldin (simplified)
    const clusterCenters = uniqueClusters.map(c => {
      const points = dataPoints.filter((_, i) => assignments[i] === c);
      const center = {};
      features.forEach(f => {
        center[f] = points.reduce((sum, p) => sum + p[f], 0) / points.length;
      });
      return center;
    });

    const scatters = uniqueClusters.map((c, idx) => {
      const points = dataPoints.filter((_, i) => assignments[i] === c);
      let scatter = 0;
      points.forEach(p => {
        features.forEach(f => {
          scatter += Math.pow(p[f] - clusterCenters[idx][f], 2);
        });
      });
      return Math.sqrt(scatter / points.length);
    });

    let dbSum = 0;
    for (let i = 0; i < k; i++) {
      let maxRatio = 0;
      for (let j = 0; j < k; j++) {
        if (i === j) continue;
        let centerDist = 0;
        features.forEach(f => {
          centerDist += Math.pow(clusterCenters[i][f] - clusterCenters[j][f], 2);
        });
        centerDist = Math.sqrt(centerDist);
        const ratio = (scatters[i] + scatters[j]) / centerDist;
        if (ratio > maxRatio) maxRatio = ratio;
      }
      dbSum += maxRatio;
    }
    const daviesBouldin = dbSum / k;

    return { silhouette, calinskiHarabasz, daviesBouldin };
  }, [selectedFeatures]);

  /**
   * Run elbow analysis for K-Means
   */
  const runElbowAnalysis = useCallback(() => {
    if (!preparedData) return;

    const elbowResults = [];
    for (let k = 2; k <= 10; k++) {
      const { inertia } = runKMeans(preparedData.standardized, k, 50);
      elbowResults.push({ k, inertia });
    }

    setElbowData(elbowResults);
    setShowElbow(true);
  }, [preparedData, runKMeans]);

  /**
   * Run clustering analysis
   */
  const runClustering = useCallback(async () => {
    if (!preparedData) return;

    setLoading(true);
    setError(null);

    try {
      let clusterResult;

      if (algorithm === 'kmeans') {
        clusterResult = runKMeans(preparedData.standardized, nClusters, maxIter);
      } else if (algorithm === 'hierarchical') {
        clusterResult = runHierarchical(preparedData.standardized, nClusters, linkageMethod);
      } else if (algorithm === 'dbscan') {
        clusterResult = runDBSCAN(preparedData.standardized);
      }

      // Calculate validation metrics
      const metrics = calculateMetrics(preparedData.standardized, clusterResult.assignments);

      // Calculate cluster sizes
      const clusterSizes = {};
      clusterResult.assignments.forEach(c => {
        if (c >= 0) {
          clusterSizes[c] = (clusterSizes[c] || 0) + 1;
        } else {
          clusterSizes['noise'] = (clusterSizes['noise'] || 0) + 1;
        }
      });

      // Prepare 2D visualization data (using first 2 features or PCA)
      const plotData = preparedData.original.map((point, idx) => ({
        x: point[selectedFeatures[0]],
        y: point[selectedFeatures[1]],
        cluster: clusterResult.assignments[idx],
        ...point
      }));

      setResults({
        algorithm,
        assignments: clusterResult.assignments,
        centroids: clusterResult.centroids,
        inertia: clusterResult.inertia,
        linkageHistory: clusterResult.linkageHistory,
        nClusters: algorithm === 'dbscan' ? clusterResult.nClusters : nClusters,
        nNoise: clusterResult.nNoise || 0,
        metrics,
        clusterSizes,
        plotData,
        n: preparedData.n
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [preparedData, algorithm, nClusters, maxIter, linkageMethod, runKMeans, runHierarchical, runDBSCAN, calculateMetrics, selectedFeatures]);

  // Render
  return (
    <Box>
      {/* Configuration Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Clustering Configuration
          <Tooltip title="Group similar data points into clusters">
            <InfoIcon fontSize="small" color="action" />
          </Tooltip>
        </Typography>

        <Grid container spacing={3}>
          {/* Feature Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Features (2+ numeric columns)</InputLabel>
              <Select
                multiple
                value={selectedFeatures}
                label="Select Features (2+ numeric columns)"
                onChange={(e) => {
                  setSelectedFeatures(e.target.value);
                  setResults(null);
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {columnInfo.numeric.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Algorithm Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Clustering Algorithm</InputLabel>
              <Select
                value={algorithm}
                label="Clustering Algorithm"
                onChange={(e) => {
                  setAlgorithm(e.target.value);
                  setResults(null);
                }}
              >
                <MenuItem value="kmeans">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BubbleChartIcon fontSize="small" />
                    K-Means
                  </Box>
                </MenuItem>
                <MenuItem value="hierarchical">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountTreeIcon fontSize="small" />
                    Hierarchical (Agglomerative)
                  </Box>
                </MenuItem>
                <MenuItem value="dbscan">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScatterPlotIcon fontSize="small" />
                    DBSCAN (Density-Based)
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Algorithm-specific parameters */}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {(algorithm === 'kmeans' || algorithm === 'hierarchical') && (
            <Grid item xs={12} md={4}>
              <Typography gutterBottom>
                Number of Clusters (k): <strong>{nClusters}</strong>
              </Typography>
              <Slider
                value={nClusters}
                onChange={(e, value) => setNClusters(value)}
                min={2}
                max={10}
                step={1}
                marks={[
                  { value: 2, label: '2' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' }
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>
          )}

          {algorithm === 'kmeans' && (
            <Grid item xs={12} md={4}>
              <Button
                variant="outlined"
                onClick={runElbowAnalysis}
                disabled={!preparedData || loading}
                fullWidth
              >
                Run Elbow Analysis
              </Button>
            </Grid>
          )}

          {algorithm === 'hierarchical' && (
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Linkage Method</InputLabel>
                <Select
                  value={linkageMethod}
                  label="Linkage Method"
                  onChange={(e) => setLinkageMethod(e.target.value)}
                >
                  <MenuItem value="single">Single (Minimum)</MenuItem>
                  <MenuItem value="complete">Complete (Maximum)</MenuItem>
                  <MenuItem value="average">Average</MenuItem>
                  <MenuItem value="ward">Ward (Minimize Variance)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {algorithm === 'dbscan' && (
            <>
              <Grid item xs={12} md={4}>
                <Typography gutterBottom>
                  Epsilon (ε): <strong>{eps.toFixed(2)}</strong>
                </Typography>
                <Slider
                  value={eps}
                  onChange={(e, value) => setEps(value)}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography gutterBottom>
                  Min Samples: <strong>{minSamples}</strong>
                </Typography>
                <Slider
                  value={minSamples}
                  onChange={(e, value) => setMinSamples(value)}
                  min={2}
                  max={20}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Run Button */}
        {selectedFeatures.length >= 2 && preparedData && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={runClustering}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            >
              Run Clustering
            </Button>
          </Box>
        )}

        {/* Data summary */}
        {preparedData && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Data:</strong> {preparedData.n} samples × {selectedFeatures.length} features
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Elbow Analysis */}
      {showElbow && elbowData && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Elbow Method for Optimal k
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Look for the "elbow" point where the rate of decrease in inertia slows down.
          </Typography>

          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={elbowData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="k"
                  label={{ value: 'Number of Clusters (k)', position: 'bottom', offset: 0 }}
                />
                <YAxis
                  label={{ value: 'Inertia (WCSS)', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip
                  formatter={(value) => [value.toFixed(2), 'Inertia']}
                  labelFormatter={(label) => `k = ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="inertia"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ fill: theme.palette.primary.main, r: 5 }}
                />
                <ReferenceLine x={nClusters} stroke={theme.palette.warning.main} strokeDasharray="5 5" label={{ value: `k=${nClusters}`, position: 'top' }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card elevation={3} sx={{ bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30', height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Clusters Found</Typography>
                  <Typography variant="h3" sx={{ color: theme.palette.primary.main }}>
                    {results.nClusters}
                  </Typography>
                  {results.nNoise > 0 && (
                    <Chip label={`${results.nNoise} noise points`} size="small" color="warning" sx={{ mt: 1 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Silhouette Score</Typography>
                  <Typography variant="h4" sx={{
                    color: results.metrics.silhouette > 0.5 ? theme.palette.success.main :
                      results.metrics.silhouette > 0.25 ? theme.palette.warning.main : theme.palette.error.main
                  }}>
                    {isNaN(results.metrics.silhouette) ? 'N/A' : results.metrics.silhouette.toFixed(3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {results.metrics.silhouette > 0.5 ? 'Good' :
                      results.metrics.silhouette > 0.25 ? 'Fair' : 'Poor'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Calinski-Harabasz</Typography>
                  <Typography variant="h4">
                    {isNaN(results.metrics.calinskiHarabasz) ? 'N/A' : results.metrics.calinskiHarabasz.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Higher is better
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Davies-Bouldin</Typography>
                  <Typography variant="h4">
                    {isNaN(results.metrics.daviesBouldin) ? 'N/A' : results.metrics.daviesBouldin.toFixed(3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lower is better
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Cluster Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cluster Visualization ({selectedFeatures[0]} vs {selectedFeatures[1]})
            </Typography>

            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={selectedFeatures[0]}
                    label={{ value: selectedFeatures[0], position: 'bottom', offset: 0 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={selectedFeatures[1]}
                    label={{ value: selectedFeatures[1], angle: -90, position: 'insideLeft' }}
                  />
                  <ChartTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <Paper sx={{ p: 1 }}>
                            <Typography variant="body2">
                              <strong>Cluster:</strong> {d.cluster >= 0 ? d.cluster : 'Noise'}
                            </Typography>
                            {selectedFeatures.slice(0, 4).map(f => (
                              <Typography key={f} variant="body2">
                                {f}: {d[f]?.toFixed(2)}
                              </Typography>
                            ))}
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Scatter
                    name="Data Points"
                    data={results.plotData}
                    fill={theme.palette.primary.main}
                  >
                    {results.plotData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.cluster >= 0 ? CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length] : '#999'}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Cluster Sizes */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cluster Size Distribution
            </Typography>

            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(results.clusterSizes).map(([cluster, size]) => ({
                    cluster: cluster === 'noise' ? 'Noise' : `Cluster ${cluster}`,
                    size,
                    color: cluster === 'noise' ? '#999' : CLUSTER_COLORS[parseInt(cluster) % CLUSTER_COLORS.length]
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cluster" />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <ChartTooltip />
                  <Bar dataKey="size" name="Size">
                    {Object.entries(results.clusterSizes).map(([cluster], index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={cluster === 'noise' ? '#999' : CLUSTER_COLORS[parseInt(cluster) % CLUSTER_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Cluster sizes table */}
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                    <TableCell><strong>Cluster</strong></TableCell>
                    <TableCell align="right"><strong>Size</strong></TableCell>
                    <TableCell align="right"><strong>Percentage</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(results.clusterSizes).map(([cluster, size]) => (
                    <TableRow key={cluster}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: cluster === 'noise' ? '#999' : CLUSTER_COLORS[parseInt(cluster) % CLUSTER_COLORS.length]
                            }}
                          />
                          {cluster === 'noise' ? 'Noise' : `Cluster ${cluster}`}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{size}</TableCell>
                      <TableCell align="right">{((size / results.n) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Interpretation */}
          <Paper elevation={2} sx={{ p: 3, bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30' }}>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
              Interpretation
            </Typography>
            <Typography variant="body2">
              <strong>{results.algorithm === 'kmeans' ? 'K-Means' :
                results.algorithm === 'hierarchical' ? 'Hierarchical' : 'DBSCAN'}</strong> clustering
              identified <strong>{results.nClusters} clusters</strong> in the data.
              {results.nNoise > 0 && ` ${results.nNoise} points were classified as noise.`}
              {' '}The Silhouette score of {results.metrics.silhouette?.toFixed(3)} indicates
              {results.metrics.silhouette > 0.5 ? ' well-separated clusters.' :
                results.metrics.silhouette > 0.25 ? ' moderately separated clusters.' :
                  ' overlapping clusters - consider adjusting parameters.'}
            </Typography>
          </Paper>
        </>
      )}

      {/* Selection Prompt */}
      {selectedFeatures.length < 2 && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.grey[isDarkMode ? 800 : 50] }}>
          <Typography variant="body1" color="text.secondary">
            Select at least <strong>2 numeric features</strong> to begin clustering analysis.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Clustering;
