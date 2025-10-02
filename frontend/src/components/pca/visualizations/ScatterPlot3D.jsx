import React, { useMemo } from 'react';
import { Box, Typography, CircularProgress, Button, IconButton, Tooltip, Badge, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10, schemeSet2, schemePaired } from 'd3-scale-chromatic';
import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutorenewIcon from '@mui/icons-material/Autorenew';

// Import patched THREE
import patchedTHREE from '../../../utils/patchedThree';

// Import react-three-fiber (will be loaded conditionally)
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

// 3D Point component for Three.js
const Point3D = React.memo(({ position, color, size, label, showLabels }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {showLabels && label && (
        <Text
          position={[0, size * 1.5, 0]}
          fontSize={size * 2}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
});

// 3D Scatter Plot Component
const ScatterPlot3D = ({ 
  data, 
  xComponent, 
  yComponent, 
  zComponent, 
  markerSize, 
  colorPalette, 
  showLabels, 
  loading 
}) => {
  const theme = useTheme();
  const disable3D = process.env.REACT_APP_DISABLE_3D === 'true';

  // Memoize unique groups and color scale
  const uniqueGroups = useMemo(() => {
    if (!data || !data.sample_data) return [];
    return Array.from(new Set(data.sample_data.map(d => d.group)));
  }, [data]);

  // Memoize color scale
  const colorScale = useMemo(() => {
    let scale;
    if (colorPalette === 'Category10') {
      scale = scaleOrdinal(schemeCategory10);
    } else if (colorPalette === 'Set2') {
      scale = scaleOrdinal(schemeSet2);
    } else {
      scale = scaleOrdinal(schemePaired);
    }
    scale.domain(uniqueGroups);
    return scale;
  }, [colorPalette, uniqueGroups]);

  // Memoize 3D points to avoid expensive recalculations
  const points3D = useMemo(() => {
    if (!data || !data.sample_data || disable3D) return [];
    
    return data.sample_data.map((sample, index) => {
      // Calculate 3D position from PC values
      const pos = [
        sample.pc1 * 2, // Scale for better visualization
        sample.pc2 * 2,
        (sample.pc3 || 0) * 2
      ];

      const color = colorScale(sample.group);

      return (
        <Point3D
          key={index}
          position={pos}
          color={color}
          size={markerSize / 500}
          label={sample.sample_id}
          showLabels={showLabels}
        />
      );
    });
  }, [data, markerSize, showLabels, colorScale, disable3D]);

  // Memoize legend items
  const legendItems = useMemo(() => {
    if (!uniqueGroups.length) return null;
    
    return uniqueGroups.map((group, idx) => (
      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Box sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: colorScale(group),
          mr: 1
        }} />
        <Typography variant="caption">{group}</Typography>
      </Box>
    ));
  }, [uniqueGroups, colorScale]);

  // Memoize axis labels
  const axisLabels = useMemo(() => {
    if (disable3D) return null;
    
    return (
      <>
        {/* X axis */}
        <line>
          <bufferGeometry
            attach="geometry"
            {...{
              attributes: {
                position: {
                  array: new Float32Array([-2, 0, 0, 2, 0, 0]),
                  itemSize: 3,
                  count: 2
                }
              }
            }}
          />
          <lineBasicMaterial attach="material" color="red" linewidth={2} />
        </line>
        <Text position={[2.2, 0, 0]} fontSize={0.2} color="red">PC{xComponent}</Text>
  
        {/* Y axis */}
        <line>
          <bufferGeometry
            attach="geometry"
            {...{
              attributes: {
                position: {
                  array: new Float32Array([0, -2, 0, 0, 2, 0]),
                  itemSize: 3,
                  count: 2
                }
              }
            }}
          />
          <lineBasicMaterial attach="material" color="green" linewidth={2} />
        </line>
        <Text position={[0, 2.2, 0]} fontSize={0.2} color="green">PC{yComponent}</Text>
  
        {/* Z axis */}
        <line>
          <bufferGeometry
            attach="geometry"
            {...{
              attributes: {
                position: {
                  array: new Float32Array([0, 0, -2, 0, 0, 2]),
                  itemSize: 3,
                  count: 2
                }
              }
            }}
          />
          <lineBasicMaterial attach="material" color="blue" linewidth={2} />
        </line>
        <Text position={[0, 0, 2.2]} fontSize={0.2} color="blue">PC{zComponent}</Text>
      </>
    );
  }, [xComponent, yComponent, zComponent, disable3D]);

  // If 3D is disabled, render a fallback 2D component
  if (disable3D) {
    return (
      <Box 
        sx={{
          width: '100%',
          height: 500,
          border: '1px solid #ddd',
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 3
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          3D Visualization Disabled
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          3D visualization is currently disabled. Please use the 2D visualization tab or
          run the application with 3D support enabled.
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          sx={{ mt: 2 }}
          onClick={() => alert('To enable 3D visualization, run with REACT_APP_DISABLE_3D=false')}
        >
          Learn More
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      height: 500,
      border: '1px solid #ddd',
      borderRadius: 1,
      position: 'relative'
    }}>
      {/* Real-time update indicator */}
      {loading && (
        <Box sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          bgcolor: 'rgba(255,255,255,0.8)',
          borderRadius: 1,
          px: 1,
          py: 0.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="caption">
              Updating...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Settings overlay */}
      <Box sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        display: 'flex',
        gap: 0.5
      }}>
        <Tooltip title="Toggle labels">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download as PNG">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}
            onClick={() => {
              alert('This would save the 3D visualization as PNG');
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Legend overlay */}
      {data && (
        <Box sx={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 10,
          bgcolor: 'rgba(255,255,255,0.8)',
          borderRadius: 1,
          p: 1
        }}>
          {legendItems}
        </Box>
      )}

      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <hemisphereLight intensity={0.5} groundColor="blue" />

        {/* Add a subtle environment reflection */}
        <color attach="background" args={['#f5f5f5']} />

        {/* Render all the 3D points */}
        {points3D}

        {/* Add a grid helper */}
        <gridHelper args={[10, 10, '#cccccc', '#eeeeee']} rotation={[Math.PI / 2, 0, 0]} />

        {/* Add axes */}
        <group>
          {axisLabels}
        </group>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={10}
          minDistance={2}
        />
      </Canvas>
    </Box>
  );
};

export default React.memo(ScatterPlot3D);