import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  IconButton,
  Collapse,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  SvgIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Import D3 for animated educational visualizations
import * as d3 from 'd3';

// Styled components
const EducationCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  borderRadius: theme.shape.borderRadius * 2,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper
}));

const FormulaBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  margin: `${theme.spacing(2)} 0`,
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'auto'
}));

const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const TopicChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: theme.palette.primary.lightest || theme.palette.primary.light,
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.lighter || theme.palette.primary.main,
    color: theme.palette.primary.contrastText
  }
}));

const VisualizationContainer = styled(Box)(({ theme }) => ({
  height: 300,
  width: '100%',
  position: 'relative',
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3)
}));

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

// Custom 3Blue1Brown style SVG icons
const SigmaIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M9,5V3H15V5L12,9L15,13V15H9V13H13L10.5,9L13,5H9M5,3C3.89,3 3,3.9 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.9 20.11,3 19,3H5Z" />
  </SvgIcon>
);

/**
 * Normal Distribution Visualization Component
 * Creates an animated visualization of a normal distribution
 */
const NormalDistributionVisualization = ({ 
  mean = 0, 
  stdDev = 1, 
  controlLimits = true,
  animated = true,
  highlightZones = true
}) => {
  const svgRef = useRef(null);
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(animated);
  const [animationPhase, setAnimationPhase] = useState(0);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Set up SVG dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;
    
    // Create SVG element
    const svg = d3.select(svgRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleLinear()
      .domain([mean - 4 * stdDev, mean + 4 * stdDev])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max([d3.randomNormal(mean, stdDev)(0) * 1.1, 0.4])])
      .range([height, 0]);
    
    // Draw x-axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
    
    // Draw the normal distribution curve
    const line = d3.line()
      .x(d => x(d))
      .y(d => y(Math.exp(-0.5 * Math.pow((d - mean) / stdDev, 2)) / (stdDev * Math.sqrt(2 * Math.PI))))
      .curve(d3.curveBasis);
    
    const points = d3.range(mean - 4 * stdDev, mean + 4 * stdDev, 0.1);
    
    // Draw the curve
    const path = svg.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", theme.palette.primary.main)
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add control limits if requested
    if (controlLimits) {
      // Lower Control Limit (mean - 3*stdDev)
      svg.append("line")
        .attr("x1", x(mean - 3 * stdDev))
        .attr("x2", x(mean - 3 * stdDev))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-dasharray", "4")
        .attr("stroke-width", 2);
      
      // Upper Control Limit (mean + 3*stdDev)
      svg.append("line")
        .attr("x1", x(mean + 3 * stdDev))
        .attr("x2", x(mean + 3 * stdDev))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-dasharray", "4")
        .attr("stroke-width", 2);
      
      // Center Line (mean)
      svg.append("line")
        .attr("x1", x(mean))
        .attr("x2", x(mean))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", theme.palette.text.secondary)
        .attr("stroke-dasharray", "4")
        .attr("stroke-width", 1);
    }
    
    // Highlight zones if requested
    if (highlightZones) {
      // Create zones
      const zones = [
        { name: "C", start: mean - stdDev, end: mean + stdDev, color: theme.palette.success.light },
        { name: "B", start: mean - 2 * stdDev, end: mean - stdDev, color: theme.palette.warning.light },
        { name: "B", start: mean + stdDev, end: mean + 2 * stdDev, color: theme.palette.warning.light },
        { name: "A", start: mean - 3 * stdDev, end: mean - 2 * stdDev, color: theme.palette.error.light },
        { name: "A", start: mean + 2 * stdDev, end: mean + 3 * stdDev, color: theme.palette.error.light }
      ];
      
      // Add zone areas with initial opacity 0
      zones.forEach(zone => {
        svg.append("rect")
          .attr("x", x(zone.start))
          .attr("width", x(zone.end) - x(zone.start))
          .attr("y", 0)
          .attr("height", height)
          .attr("fill", zone.color)
          .attr("opacity", 0)
          .attr("class", `zone-${zone.name}`);
      });
      
      // Zone labels
      zones.forEach(zone => {
        svg.append("text")
          .attr("x", x(zone.start + (zone.end - zone.start) / 2))
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .attr("fill", theme.palette.getContrastText(zone.color))
          .attr("font-weight", "bold")
          .attr("opacity", 0)
          .attr("class", `zone-label-${zone.name}`)
          .text(`Zone ${zone.name}`);
      });
    }
    
    // Animation setup
    if (animated && isPlaying) {
      // Animation timeline
      const animationDuration = 800;
      
      // Phase 1: Draw the curve
      if (animationPhase === 0) {
        const pathLength = path.node().getTotalLength();
        
        path.attr("stroke-dasharray", pathLength)
          .attr("stroke-dashoffset", pathLength)
          .transition()
          .duration(animationDuration)
          .attr("stroke-dashoffset", 0)
          .on("end", () => setAnimationPhase(1));
      }
      
      // Phase 2: Show control limits
      else if (animationPhase === 1 && controlLimits) {
        svg.selectAll("line")
          .attr("opacity", 0)
          .transition()
          .duration(animationDuration)
          .attr("opacity", 1)
          .on("end", () => setAnimationPhase(2));
      }
      
      // Phase 3: Show zones
      else if (animationPhase === 2 && highlightZones) {
        // First show C zone
        svg.selectAll(".zone-C")
          .transition()
          .duration(animationDuration / 2)
          .attr("opacity", 0.3);
        
        svg.selectAll(".zone-label-C")
          .transition()
          .duration(animationDuration / 2)
          .attr("opacity", 1)
          .on("end", () => {
            // Then B zones
            svg.selectAll(".zone-B")
              .transition()
              .duration(animationDuration / 2)
              .attr("opacity", 0.3);
            
            svg.selectAll(".zone-label-B")
              .transition()
              .duration(animationDuration / 2)
              .attr("opacity", 1)
              .on("end", () => {
                // Finally A zones
                svg.selectAll(".zone-A")
                  .transition()
                  .duration(animationDuration / 2)
                  .attr("opacity", 0.3);
                
                svg.selectAll(".zone-label-A")
                  .transition()
                  .duration(animationDuration / 2)
                  .attr("opacity", 1);
              });
          });
      }
    } else if (highlightZones) {
      // If not animating, show all zones immediately
      svg.selectAll("[class^=zone-]")
        .attr("opacity", 0.3);
      
      svg.selectAll("[class^=zone-label-]")
        .attr("opacity", 1);
    }
    
  }, [svgRef, mean, stdDev, controlLimits, theme, animated, isPlaying, animationPhase]);
  
  // Restart animation
  const restartAnimation = () => {
    setAnimationPhase(0);
    setIsPlaying(true);
  };
  
  // Toggle animation
  const toggleAnimation = () => {
    setIsPlaying(!isPlaying);
  };
  
  return (
    <Box>
      <Box mb={1} display="flex" justifyContent="flex-end">
        <Tooltip title={isPlaying ? "Pause Animation" : "Resume Animation"}>
          <IconButton onClick={toggleAnimation} size="small">
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Restart Animation">
          <IconButton onClick={restartAnimation} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <svg 
        ref={svgRef} 
        style={{ width: '100%', height: '100%' }}
      />
      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
        Normal distribution with mean={mean} and standard deviation={stdDev}
      </Typography>
    </Box>
  );
};

/**
 * Educational Panel Component
 * 
 * Displays educational content with interactive visualizations
 * 
 * @param {Object} props Component props
 * @param {Object} props.content Educational content object
 */
const EducationalPanel = ({ content }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [expanded, setExpanded] = useState(true);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Toggle expand/collapse
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  if (!content) {
    return null;
  }
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Educational Resources
            </Typography>
          </Box>
          
          <ExpandMore
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon />
          </ExpandMore>
        </Box>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab 
              icon={<MenuBookIcon />} 
              iconPosition="start" 
              label="Theory" 
            />
            <Tab 
              icon={<CodeIcon />} 
              iconPosition="start" 
              label="Formulas" 
            />
            <Tab 
              icon={<HistoryIcon />} 
              iconPosition="start" 
              label="History" 
            />
            <Tab 
              icon={<InfoIcon />} 
              iconPosition="start" 
              label="Applications" 
            />
          </Tabs>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 0 && (
                <EducationCard>
                  <Typography variant="h6" gutterBottom>
                    {content.title || "Control Chart Theory"}
                  </Typography>
                  
                  <ReactMarkdown
                    children={content.theory || `
# Control Chart Theory

Control charts, also known as Shewhart charts, are tools used to determine if a manufacturing or business process is in a state of statistical control.

## Key Concepts

A process is said to be in **statistical control** when it only exhibits **common cause variation** - the natural, expected variation inherent to the process.

When a process exhibits **special cause variation** - variation from external factors not inherent to the process - it is said to be out of control.

Control charts help distinguish between these two types of variation by establishing:

- A **center line** (CL) representing the process average
- **Upper control limit** (UCL) at 3 standard deviations above the center line
- **Lower control limit** (LCL) at 3 standard deviations below the center line

When points fall outside these control limits or exhibit non-random patterns, the process may be affected by special causes that should be investigated.
                    `}
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({node, ...props}) => <Typography variant="h5" gutterBottom {...props} />,
                      h2: ({node, ...props}) => <Typography variant="h6" gutterBottom sx={{ mt: 2 }} {...props} />,
                      h3: ({node, ...props}) => <Typography variant="subtitle1" fontWeight="bold" gutterBottom {...props} />,
                      p: ({node, ...props}) => <Typography variant="body2" paragraph {...props} />,
                      strong: ({node, ...props}) => <Typography component="span" fontWeight="bold" {...props} />,
                      em: ({node, ...props}) => <Typography component="span" fontStyle="italic" {...props} />,
                      li: ({node, ...props}) => <Typography component="li" variant="body2" {...props} />
                    }}
                  />
                  
                  <VisualizationContainer>
                    <NormalDistributionVisualization 
                      mean={0} 
                      stdDev={1} 
                      controlLimits={true}
                      highlightZones={true}
                      animated={true}
                    />
                  </VisualizationContainer>
                  
                  <Box mt={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Related Topics
                    </Typography>
                    <Box>
                      <TopicChip label="Process Capability" />
                      <TopicChip label="Normal Distribution" />
                      <TopicChip label="Statistical Control" />
                      <TopicChip label="Variation Types" />
                    </Box>
                  </Box>
                </EducationCard>
              )}
              
              {activeTab === 1 && (
                <EducationCard>
                  <Typography variant="h6" gutterBottom>
                    Statistical Formulas
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    Control charts use different formulas depending on the chart type. Here are the key formulas for X-bar and R charts:
                  </Typography>
                  
                  <MathJaxContext>
                    <FormulaBox>
                      <Typography variant="subtitle1" gutterBottom>
                        X-bar Chart Control Limits
                      </Typography>
                      <Box px={2}>
                        <MathJax inline={false}>{`\\begin{align} UCL_{\\bar{x}} &= \\bar{\\bar{x}} + A_2\\bar{R} \\\\ CL_{\\bar{x}} &= \\bar{\\bar{x}} \\\\ LCL_{\\bar{x}} &= \\bar{\\bar{x}} - A_2\\bar{R} \\end{align}`}</MathJax>
                      </Box>
                      
                      <Typography variant="subtitle1" sx={{ mt: 3 }} gutterBottom>
                        R Chart Control Limits
                      </Typography>
                      <Box px={2}>
                        <MathJax inline={false}>{`\\begin{align} UCL_R &= D_4\\bar{R} \\\\ CL_R &= \\bar{R} \\\\ LCL_R &= D_3\\bar{R} \\end{align}`}</MathJax>
                      </Box>
                      
                      <Typography variant="subtitle1" sx={{ mt: 3 }} gutterBottom>
                        Where:
                      </Typography>
                      <Typography variant="body2" component="ul">
                        <li>x̿ is the grand average (average of subgroup averages)</li>
                        <li>R̄ is the average range</li>
                        <li>A₂, D₃, D₄ are constants that depend on subgroup size</li>
                      </Typography>
                    </FormulaBox>
                  </MathJaxContext>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Control Chart Constants Table
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Subgroup Size (n)</TableCell>
                          <TableCell>A₂</TableCell>
                          <TableCell>D₃</TableCell>
                          <TableCell>D₄</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>2</TableCell>
                          <TableCell>1.880</TableCell>
                          <TableCell>0</TableCell>
                          <TableCell>3.267</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>3</TableCell>
                          <TableCell>1.023</TableCell>
                          <TableCell>0</TableCell>
                          <TableCell>2.575</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>4</TableCell>
                          <TableCell>0.729</TableCell>
                          <TableCell>0</TableCell>
                          <TableCell>2.282</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>5</TableCell>
                          <TableCell>0.577</TableCell>
                          <TableCell>0</TableCell>
                          <TableCell>2.115</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </EducationCard>
              )}
              
              {activeTab === 2 && (
                <EducationCard>
                  <Typography variant="h6" gutterBottom>
                    Historical Context
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    Control charts were developed by Walter A. Shewhart while working at Bell Telephone Laboratories in the 1920s. They were one of the first tools developed for statistical process control.
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    The fundamental principles of control charts were introduced in Shewhart's 1931 book "Economic Control of Quality of Manufactured Product," which laid the groundwork for modern statistical quality control methods.
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    W. Edwards Deming later popularized control charts and other statistical methods when he helped rebuild Japanese industry after World War II. The widespread adoption of these techniques was a significant factor in Japan's economic recovery and the reputation of Japanese manufacturing for high quality.
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    Control charts remain a cornerstone of modern quality management systems, including Six Sigma and Total Quality Management (TQM).
                  </Typography>
                  
                  <Box mt={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Key Figures in SQC Development
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <PersonIcon />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Walter A. Shewhart (1891-1967)" 
                          secondary="Developer of the control chart and the PDCA cycle"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <PersonIcon />
                        </ListItemIcon>
                        <ListItemText 
                          primary="W. Edwards Deming (1900-1993)" 
                          secondary="Promoter of SPC methods and management philosophy"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <PersonIcon />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Joseph M. Juran (1904-2008)" 
                          secondary="Developer of quality management principles"
                        />
                      </ListItem>
                    </List>
                  </Box>
                </EducationCard>
              )}
              
              {activeTab === 3 && (
                <EducationCard>
                  <Typography variant="h6" gutterBottom>
                    Applications in Industry
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Pharmaceutical Manufacturing
                  </Typography>
                  <Typography variant="body2" paragraph>
                    In pharmaceutical manufacturing, control charts are used to monitor critical quality attributes like tablet weight, hardness, dissolution rate, and active ingredient content. These charts help ensure that drug products meet strict regulatory requirements for safety and efficacy.
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Biotech Production
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Biotech processes use control charts to monitor parameters such as pH, temperature, dissolved oxygen, and product yield during fermentation and purification processes. The high variability of biological systems makes statistical process control especially valuable in this field.
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Semiconductor Manufacturing
                  </Typography>
                  <Typography variant="body2" paragraph>
                    In semiconductor manufacturing, control charts monitor wafer processing parameters like film thickness, critical dimensions, and defect counts. The extremely tight tolerances required in chip production depend on robust statistical process control methods.
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Food and Beverage Industry
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Food manufacturers use control charts to monitor fill weights, ingredient proportions, cooking temperatures, and microbial counts. These applications help ensure consistent product quality and food safety compliance.
                  </Typography>
                </EducationCard>
              )}
            </motion.div>
          </AnimatePresence>
        </Collapse>
      </Box>
    </motion.div>
  );
};

// Custom Person Icon component
const PersonIcon = () => (
  <SvgIcon>
    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
  </SvgIcon>
);

export default EducationalPanel;