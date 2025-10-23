import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, Tabs, Tab, Divider, useMediaQuery, Alert, AlertTitle } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import * as d3 from 'd3';

// Helper components
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pca-tabpanel-${index}`}
      aria-labelledby={`pca-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// PCA Introduction Component
const PcaIntroduction = ({ onNext }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const scatterplotRef = useRef(null);
  const pcaAnimationRef = useRef(null);
  const eigenVectorsRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Set up the scatter plot visualization demonstrating dimensionality reduction
  useEffect(() => {
    if (tabValue === 1 && scatterplotRef.current) {
      renderScatterplot();
    }
  }, [tabValue]);

  // Set up the PCA animation
  useEffect(() => {
    if (tabValue === 2 && pcaAnimationRef.current) {
      renderPcaAnimation();
    }
  }, [tabValue]);

  // Set up the eigenvectors animation
  useEffect(() => {
    if (tabValue === 3 && eigenVectorsRef.current) {
      renderEigenVectorsAnimation();
    }
  }, [tabValue]);

  const renderScatterplot = () => {
    // Clear previous visualization
    d3.select(scatterplotRef.current).selectAll("*").remove();

    // Set up dimensions and margins
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select(scatterplotRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Generate random data with two clear clusters
    const numPoints = 100;
    const dataset = [];
    
    // Cluster 1
    for (let i = 0; i < numPoints / 2; i++) {
      dataset.push({
        x: 25 + Math.random() * 15,
        y: 25 + Math.random() * 15,
        group: "A"
      });
    }
    
    // Cluster 2
    for (let i = 0; i < numPoints / 2; i++) {
      dataset.push({
        x: 60 + Math.random() * 15,
        y: 60 + Math.random() * 15,
        group: "B"
      });
    }

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    svg.append("g")
      .call(yAxis);

    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .text("Feature 1");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text("Feature 2");

    // Plot data points
    svg.selectAll("circle")
      .data(dataset)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 5)
      .attr("fill", d => d.group === "A" ? theme.palette.primary.main : theme.palette.secondary.main)
      .attr("opacity", 0.7);

    // Calculate the principal components
    const meanX = d3.mean(dataset, d => d.x);
    const meanY = d3.mean(dataset, d => d.y);
    
    const centered = dataset.map(d => ({
      x: d.x - meanX,
      y: d.y - meanY,
      group: d.group
    }));
    
    // Calculate covariance matrix
    let xx = 0, xy = 0, yy = 0;
    centered.forEach(d => {
      xx += d.x * d.x;
      xy += d.x * d.y;
      yy += d.y * d.y;
    });
    xx /= dataset.length;
    xy /= dataset.length;
    yy /= dataset.length;
    
    // Calculate eigenvectors
    const trace = xx + yy;
    const determinant = xx * yy - xy * xy;
    const lambda1 = (trace + Math.sqrt(trace * trace - 4 * determinant)) / 2;
    const lambda2 = (trace - Math.sqrt(trace * trace - 4 * determinant)) / 2;
    
    // First eigenvector
    let ex1 = 1;
    let ey1 = (lambda1 - xx) / xy;
    const len1 = Math.sqrt(ex1 * ex1 + ey1 * ey1);
    ex1 /= len1;
    ey1 /= len1;
    
    // Second eigenvector
    let ex2 = 1;
    let ey2 = (lambda2 - xx) / xy;
    const len2 = Math.sqrt(ex2 * ex2 + ey2 * ey2);
    ex2 /= len2;
    ey2 /= len2;
    
    // Draw principal component axes
    const pcScale = 50;  // Scale the PC arrows
    
    // PC1
    svg.append("line")
      .attr("x1", xScale(meanX))
      .attr("y1", yScale(meanY))
      .attr("x2", xScale(meanX + ex1 * pcScale))
      .attr("y2", yScale(meanY + ey1 * pcScale))
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");
    
    // PC2
    svg.append("line")
      .attr("x1", xScale(meanX))
      .attr("y1", yScale(meanY))
      .attr("x2", xScale(meanX + ex2 * pcScale))
      .attr("y2", yScale(meanY + ey2 * pcScale))
      .attr("stroke", "green")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");
    
    // Add arrowhead markers
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#333");
    
    // Add PC1 and PC2 labels
    svg.append("text")
      .attr("x", xScale(meanX + ex1 * pcScale * 1.1))
      .attr("y", yScale(meanY + ey1 * pcScale * 1.1))
      .attr("text-anchor", "middle")
      .attr("fill", "red")
      .attr("font-weight", "bold")
      .text("PC1");
    
    svg.append("text")
      .attr("x", xScale(meanX + ex2 * pcScale * 1.1))
      .attr("y", yScale(meanY + ey2 * pcScale * 1.1))
      .attr("text-anchor", "middle")
      .attr("fill", "green")
      .attr("font-weight", "bold")
      .text("PC2");
    
    // Add a button to project data onto PC1
    const projectionButton = d3.select(scatterplotRef.current)
      .append("button")
      .text("Project Data onto PC1")
      .style("margin-top", "10px")
      .style("padding", "6px 12px")
      .style("background-color", theme.palette.primary.main)
      .style("color", "white")
      .style("border", "none")
      .style("border-radius", "4px")
      .style("cursor", "pointer");
    
    // Add a button to reset visualization
    const resetButton = d3.select(scatterplotRef.current)
      .append("button")
      .text("Reset")
      .style("margin-top", "10px")
      .style("margin-left", "10px")
      .style("padding", "6px 12px")
      .style("background-color", theme.palette.grey[500])
      .style("color", "white")
      .style("border", "none")
      .style("border-radius", "4px")
      .style("cursor", "pointer");
    
    // Handle projection button click
    projectionButton.on("click", () => {
      // Project points onto PC1
      const projectedPoints = dataset.map(d => {
        // Center the point
        const cx = d.x - meanX;
        const cy = d.y - meanY;
        
        // Project onto PC1
        const proj = cx * ex1 + cy * ey1;
        
        return {
          original: { x: d.x, y: d.y },
          projected: { 
            x: meanX + proj * ex1, 
            y: meanY + proj * ey1 
          },
          group: d.group
        };
      });
      
      // Animate the projection
      svg.selectAll("circle")
        .data(projectedPoints)
        .transition()
        .duration(1000)
        .attr("cx", d => xScale(d.projected.x))
        .attr("cy", d => yScale(d.projected.y));
      
      // Add projection lines
      svg.selectAll(".projection-line")
        .data(projectedPoints)
        .enter()
        .append("line")
        .attr("class", "projection-line")
        .attr("x1", d => xScale(d.original.x))
        .attr("y1", d => yScale(d.original.y))
        .attr("x2", d => xScale(d.projected.x))
        .attr("y2", d => yScale(d.projected.y))
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", 0)
        .transition()
        .duration(1000)
        .attr("opacity", 0.5);
    });
    
    // Handle reset button click
    resetButton.on("click", () => {
      // Reset points to original positions
      svg.selectAll("circle")
        .data(dataset)
        .transition()
        .duration(1000)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y));
      
      // Remove projection lines
      svg.selectAll(".projection-line")
        .transition()
        .duration(500)
        .attr("opacity", 0)
        .remove();
    });
  };

  const renderPcaAnimation = () => {
    // Implementation of PCA step-by-step animation
    d3.select(pcaAnimationRef.current).selectAll("*").remove();

    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 40, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select(pcaAnimationRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("PCA Step-by-Step Process");

    // Generate random data with correlation
    const numPoints = 50;
    const dataset = [];

    // Create correlated data
    for (let i = 0; i < numPoints; i++) {
      const x = 25 + Math.random() * 50;
      // Add correlation and some noise
      const y = 0.8 * x + 10 + (Math.random() - 0.5) * 20;
      dataset.push({ x, y });
    }

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    svg.append("g")
      .call(yAxis);

    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .text("Feature 1");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text("Feature 2");

    // Original data points
    const circles = svg.append("g")
      .attr("class", "data-points")
      .selectAll("circle")
      .data(dataset)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 5)
      .attr("fill", theme.palette.primary.main)
      .attr("opacity", 0.7);

    // Step indicator
    const stepIndicator = d3.select(pcaAnimationRef.current)
      .append("div")
      .style("margin-top", "20px")
      .style("text-align", "center");

    // Step information
    const stepInfo = stepIndicator.append("div")
      .style("margin-bottom", "10px")
      .style("font-weight", "bold")
      .text("Step 0: Original Data");

    // Navigation buttons
    const buttonContainer = stepIndicator.append("div");

    const prevButton = buttonContainer.append("button")
      .text("Previous")
      .style("margin-right", "10px")
      .style("padding", "6px 12px")
      .style("background-color", theme.palette.grey[500])
      .style("color", "white")
      .style("border", "none")
      .style("border-radius", "4px")
      .style("cursor", "pointer")
      .property("disabled", true);

    const nextButton = buttonContainer.append("button")
      .text("Next")
      .style("padding", "6px 12px")
      .style("background-color", theme.palette.primary.main)
      .style("color", "white")
      .style("border", "none")
      .style("border-radius", "4px")
      .style("cursor", "pointer");

    // Description area
    const description = stepIndicator.append("div")
      .style("margin-top", "10px")
      .style("padding", "10px")
      .style("background-color", theme.palette.background.default)
      .style("border-radius", "4px")
      .style("text-align", "left");

    description.append("p")
      .text("The plot shows sample data with 2 features. PCA will find the directions of maximum variance.");

    // Animation logic
    let currentStep = 0;
    const totalSteps = 5;

    // Calculate mean
    const meanX = d3.mean(dataset, d => d.x);
    const meanY = d3.mean(dataset, d => d.y);

    // Calculate centered data
    const centeredData = dataset.map(d => ({
      original: { x: d.x, y: d.y },
      centered: { x: d.x - meanX, y: d.y - meanY }
    }));

    // Calculate covariance matrix
    let xx = 0, xy = 0, yy = 0;
    centeredData.forEach(d => {
      xx += d.centered.x * d.centered.x;
      xy += d.centered.x * d.centered.y;
      yy += d.centered.y * d.centered.y;
    });
    xx /= dataset.length;
    xy /= dataset.length;
    yy /= dataset.length;

    // Calculate eigenvectors and eigenvalues
    const trace = xx + yy;
    const determinant = xx * yy - xy * xy;
    const lambda1 = (trace + Math.sqrt(trace * trace - 4 * determinant)) / 2;
    const lambda2 = (trace - Math.sqrt(trace * trace - 4 * determinant)) / 2;

    // First eigenvector (PC1)
    let ex1 = 1;
    let ey1 = (lambda1 - xx) / xy;
    const len1 = Math.sqrt(ex1 * ex1 + ey1 * ey1);
    ex1 /= len1;
    ey1 /= len1;

    // Second eigenvector (PC2)
    let ex2 = 1;
    let ey2 = (lambda2 - xx) / xy;
    const len2 = Math.sqrt(ex2 * ex2 + ey2 * ey2);
    ex2 /= len2;
    ey2 /= len2;

    // Step functions
    const updateStep = (step) => {
      // Update buttons
      prevButton.property("disabled", step === 0);
      nextButton.property("disabled", step === totalSteps - 1);

      // Update step info and description based on current step
      switch (step) {
        case 0: // Original data
          stepInfo.text("Step 0: Original Data");
          description.selectAll("p").remove();
          description.append("p")
            .text("The plot shows sample data with 2 features. PCA will find the directions of maximum variance.");

          // Reset to original data
          circles
            .transition()
            .duration(1000)
            .attr("cx", d => xScale(d.original ? d.original.x : d.x))
            .attr("cy", d => yScale(d.original ? d.original.y : d.y));

          // Remove any existing elements
          svg.selectAll(".mean-point, .pc-line, .center-lines").remove();
          break;

        case 1: // Data centering
          stepInfo.text("Step 1: Center the Data");
          description.selectAll("p").remove();
          description.append("p")
            .text(`PCA first centers the data by subtracting the mean (${meanX.toFixed(2)}, ${meanY.toFixed(2)}) from each data point.
                This places the origin at the center of the data cloud.`);

          // Show mean point
          svg.append("circle")
            .attr("class", "mean-point")
            .attr("cx", xScale(meanX))
            .attr("cy", yScale(meanY))
            .attr("r", 7)
            .attr("fill", "red")
            .attr("opacity", 0)
            .transition()
            .duration(500)
            .attr("opacity", 1);

          // Animate data points to centered positions
          circles
            .transition()
            .delay(500)
            .duration(1500)
            .attr("cx", d => xScale(d.centered ? d.centered.x + meanX : d.x - meanX + meanX))
            .attr("cy", d => yScale(d.centered ? d.centered.y + meanY : d.y - meanY + meanY));

          break;

        case 2: // Covariance matrix
          stepInfo.text("Step 2: Compute Covariance Matrix");
          description.selectAll("p").remove();
          description.append("p")
            .html(`The covariance matrix captures how features vary together:<br>
                <strong>Cov(X,X)</strong> = ${xx.toFixed(2)},
                <strong>Cov(X,Y)</strong> = ${xy.toFixed(2)},
                <strong>Cov(Y,Y)</strong> = ${yy.toFixed(2)}<br>
                The high covariance between X and Y indicates they are correlated.`);

          // Show correlation with a correlation line
          svg.append("line")
            .attr("class", "center-lines")
            .attr("x1", xScale(meanX - 40))
            .attr("y1", yScale(meanY - 40 * xy / xx))
            .attr("x2", xScale(meanX + 40))
            .attr("y2", yScale(meanY + 40 * xy / xx))
            .attr("stroke", "gray")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0)
            .transition()
            .duration(800)
            .attr("opacity", 0.7);

          break;

        case 3: // Eigenvectors
          stepInfo.text("Step 3: Find Principal Components");
          description.selectAll("p").remove();
          description.append("p")
            .html(`PCA finds the principal components by calculating the eigenvectors of the covariance matrix.<br>
                  <strong>PC1</strong> (red) captures ${(lambda1 / (lambda1 + lambda2) * 100).toFixed(1)}% of the variance.<br>
                  <strong>PC2</strong> (green) captures ${(lambda2 / (lambda1 + lambda2) * 100).toFixed(1)}% of the variance.`);

          // Draw PC1 (scaled by eigenvalue)
          const pcScale = 60;
          svg.append("line")
            .attr("class", "pc-line")
            .attr("x1", xScale(meanX))
            .attr("y1", yScale(meanY))
            .attr("x2", xScale(meanX + ex1 * Math.sqrt(lambda1) * pcScale / 5))
            .attr("y2", yScale(meanY + ey1 * Math.sqrt(lambda1) * pcScale / 5))
            .attr("stroke", "red")
            .attr("stroke-width", 3)
            .attr("opacity", 0)
            .attr("marker-end", "url(#pc1-arrow)")
            .transition()
            .duration(800)
            .attr("opacity", 1);

          // Draw PC2 (scaled by eigenvalue)
          svg.append("line")
            .attr("class", "pc-line")
            .attr("x1", xScale(meanX))
            .attr("y1", yScale(meanY))
            .attr("x2", xScale(meanX + ex2 * Math.sqrt(lambda2) * pcScale / 5))
            .attr("y2", yScale(meanY + ey2 * Math.sqrt(lambda2) * pcScale / 5))
            .attr("stroke", "green")
            .attr("stroke-width", 3)
            .attr("opacity", 0)
            .attr("marker-end", "url(#pc2-arrow)")
            .transition()
            .delay(400)
            .duration(800)
            .attr("opacity", 1);

          // Add arrowhead markers
          svg.append("defs")
            .selectAll("marker")
            .data(["pc1-arrow", "pc2-arrow"])
            .enter()
            .append("marker")
            .attr("id", d => d)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", (d, i) => i === 0 ? "red" : "green");

          // Add PC labels
          svg.append("text")
            .attr("class", "pc-line")
            .attr("x", xScale(meanX + ex1 * Math.sqrt(lambda1) * pcScale / 4))
            .attr("y", yScale(meanY + ey1 * Math.sqrt(lambda1) * pcScale / 4 - 10))
            .attr("text-anchor", "middle")
            .attr("fill", "red")
            .attr("font-weight", "bold")
            .attr("opacity", 0)
            .text("PC1")
            .transition()
            .delay(800)
            .duration(400)
            .attr("opacity", 1);

          svg.append("text")
            .attr("class", "pc-line")
            .attr("x", xScale(meanX + ex2 * Math.sqrt(lambda2) * pcScale / 4))
            .attr("y", yScale(meanY + ey2 * Math.sqrt(lambda2) * pcScale / 4 - 10))
            .attr("text-anchor", "middle")
            .attr("fill", "green")
            .attr("font-weight", "bold")
            .attr("opacity", 0)
            .text("PC2")
            .transition()
            .delay(1200)
            .duration(400)
            .attr("opacity", 1);

          break;

        case 4: // Projection
          stepInfo.text("Step 4: Project Data onto Principal Components");
          description.selectAll("p").remove();
          description.append("p")
            .html(`Finally, PCA projects the data onto the new coordinate system.<br>
                Data points are now represented by their scores along the principal components.<br>
                This transforms the data into uncorrelated variables (PCs) with maximum variance.`);

          // Calculate projections
          const projectedData = centeredData.map(d => {
            // Project centered data onto PC1
            const pc1 = d.centered.x * ex1 + d.centered.y * ey1;
            // Project centered data onto PC2
            const pc2 = d.centered.x * ex2 + d.centered.y * ey2;

            return {
              ...d,
              pc1: pc1,
              pc2: pc2,
              projectedX: meanX + pc1 * ex1,
              projectedY: meanY + pc1 * ey1,
            };
          });

          // Update circles data
          circles.data(projectedData);

          // Add projection lines
          svg.selectAll(".projection-line")
            .data(projectedData)
            .enter()
            .append("line")
            .attr("class", "pc-line projection-line")
            .attr("x1", d => xScale(meanX + d.centered.x))
            .attr("y1", d => yScale(meanY + d.centered.y))
            .attr("x2", d => xScale(d.projectedX))
            .attr("y2", d => yScale(d.projectedY))
            .attr("stroke", "#888")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0);

          // Animate projection
          svg.selectAll(".projection-line")
            .transition()
            .duration(800)
            .attr("opacity", 0.5);

          // Move points to projected positions
          circles
            .transition()
            .delay(800)
            .duration(1200)
            .attr("cx", d => xScale(d.projectedX))
            .attr("cy", d => yScale(d.projectedY));

          break;
      }
    };

    // Set up button click handlers
    nextButton.on("click", () => {
      if (currentStep < totalSteps - 1) {
        currentStep++;
        updateStep(currentStep);
      }
    });

    prevButton.on("click", () => {
      if (currentStep > 0) {
        currentStep--;
        updateStep(currentStep);
      }
    });

    // Initialize to the first step
    updateStep(currentStep);
  };

  const renderEigenVectorsAnimation = () => {
    // Implementation of eigenvectors and eigenvalues visualization
    d3.select(eigenVectorsRef.current).selectAll("*").remove();

    // Create main container with two columns
    const container = d3.select(eigenVectorsRef.current)
      .append("div")
      .style("display", "flex")
      .style("flex-direction", isMobile ? "column" : "row")
      .style("gap", "20px")
      .style("width", "100%");

    // Left column - covariance matrix visualization
    const leftCol = container.append("div")
      .style("flex", "1")
      .style("min-width", "280px");

    // Matrix title
    leftCol.append("h3")
      .style("text-align", "center")
      .style("margin-bottom", "5px")
      .style("color", theme.palette.primary.main)
      .text("Covariance Matrix");

    leftCol.append("p")
      .style("text-align", "center")
      .style("margin-bottom", "20px")
      .style("font-size", "14px")
      .style("color", theme.palette.text.secondary)
      .text("Captures how variables vary together");

    // Create simple 2x2 matrix
    const matrixContainer = leftCol.append("div")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("margin-bottom", "30px");

    // Matrix with brackets
    const matrix = matrixContainer.append("div")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("border-left", `2px solid ${theme.palette.text.primary}`)
      .style("border-right", `2px solid ${theme.palette.text.primary}`)
      .style("padding", "15px 20px")
      .style("position", "relative");

    // Add top and bottom matrix borders
    matrix.append("div")
      .style("position", "absolute")
      .style("top", "0")
      .style("left", "0")
      .style("width", "10px")
      .style("height", "2px")
      .style("background-color", theme.palette.text.primary);

    matrix.append("div")
      .style("position", "absolute")
      .style("top", "0")
      .style("right", "0")
      .style("width", "10px")
      .style("height", "2px")
      .style("background-color", theme.palette.text.primary);

    matrix.append("div")
      .style("position", "absolute")
      .style("bottom", "0")
      .style("left", "0")
      .style("width", "10px")
      .style("height", "2px")
      .style("background-color", theme.palette.text.primary);

    matrix.append("div")
      .style("position", "absolute")
      .style("bottom", "0")
      .style("right", "0")
      .style("width", "10px")
      .style("height", "2px")
      .style("background-color", theme.palette.text.primary);

    // Matrix rows
    const row1 = matrix.append("div")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("margin-bottom", "15px");

    row1.append("div")
      .style("width", "70px")
      .style("text-align", "center")
      .style("font-weight", "bold")
      .style("color", theme.palette.primary.main)
      .text("σ²ₓ");

    row1.append("div")
      .style("width", "70px")
      .style("text-align", "center")
      .style("font-weight", "bold")
      .style("color", theme.palette.primary.main)
      .text("σₓᵧ");

    const row2 = matrix.append("div")
      .style("display", "flex")
      .style("justify-content", "center");

    row2.append("div")
      .style("width", "70px")
      .style("text-align", "center")
      .style("font-weight", "bold")
      .style("color", theme.palette.primary.main)
      .text("σₓᵧ");

    row2.append("div")
      .style("width", "70px")
      .style("text-align", "center")
      .style("font-weight", "bold")
      .style("color", theme.palette.primary.main)
      .text("σ²ᵧ");

    // Eigenvalue equation
    leftCol.append("h3")
      .style("text-align", "center")
      .style("margin", "30px 0 10px")
      .style("color", theme.palette.primary.main)
      .text("Eigenvalue Equation");

    leftCol.append("div")
      .style("background-color", theme.palette.background.paper)
      .style("border-radius", "5px")
      .style("padding", "15px")
      .style("text-align", "center")
      .style("font-weight", "bold")
      .style("font-size", "18px")
      .style("font-family", "'Georgia', serif")
      .html("det(A - λI) = 0");

    leftCol.append("p")
      .style("text-align", "center")
      .style("margin-top", "10px")
      .style("font-size", "14px")
      .style("color", theme.palette.text.secondary)
      .html("λ represents eigenvalues<br>I is the identity matrix<br>A is the covariance matrix");

    // Simple interactive slider
    leftCol.append("h4")
      .style("text-align", "center")
      .style("margin-top", "20px")
      .text("Explore Eigenvalues");

    const sliderContainer = leftCol.append("div")
      .style("padding", "10px 20px");

    // Lambda values (will be updated by sliders)
    let lambda1Value = 7;
    let lambda2Value = 3;

    // Lambda 1 slider
    const lambda1Container = sliderContainer.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "15px");

    lambda1Container.append("span")
      .style("width", "80px")
      .style("font-weight", "bold")
      .text("λ₁:");

    const lambda1Slider = lambda1Container.append("input")
      .attr("type", "range")
      .attr("min", "0.5")
      .attr("max", "10")
      .attr("step", "0.1")
      .attr("value", lambda1Value)
      .style("flex-grow", "1");

    const lambda1Label = lambda1Container.append("span")
      .style("width", "50px")
      .style("margin-left", "10px")
      .style("font-weight", "bold")
      .style("text-align", "right")
      .text(lambda1Value.toFixed(1));

    // Lambda 2 slider
    const lambda2Container = sliderContainer.append("div")
      .style("display", "flex")
      .style("align-items", "center");

    lambda2Container.append("span")
      .style("width", "80px")
      .style("font-weight", "bold")
      .text("λ₂:");

    const lambda2Slider = lambda2Container.append("input")
      .attr("type", "range")
      .attr("min", "0.5")
      .attr("max", "10")
      .attr("step", "0.1")
      .attr("value", lambda2Value)
      .style("flex-grow", "1");

    const lambda2Label = lambda2Container.append("span")
      .style("width", "50px")
      .style("margin-left", "10px")
      .style("font-weight", "bold")
      .style("text-align", "right")
      .text(lambda2Value.toFixed(1));

    // Right column - eigenvector interactive visualization
    const rightCol = container.append("div")
      .style("flex", "1.5")
      .style("min-width", "300px");

    // SVG Container for visualizing eigenvectors
    const svgWidth = 400;
    const svgHeight = 400;

    rightCol.append("h3")
      .style("text-align", "center")
      .style("margin-bottom", "5px")
      .style("color", theme.palette.primary.main)
      .text("Eigenvectors Visualization");

    rightCol.append("p")
      .style("text-align", "center")
      .style("margin-bottom", "15px")
      .style("font-size", "14px")
      .style("color", theme.palette.text.secondary)
      .text("Directions of maximum variance in the data");

    const svg = rightCol.append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .style("margin", "0 auto")
      .style("display", "block");

    // Create a group for the visualization
    const g = svg.append("g")
      .attr("transform", `translate(${svgWidth/2}, ${svgHeight/2})`);

    // Draw coordinate axes
    g.append("line")
      .attr("x1", -svgWidth/2 + 40)
      .attr("y1", 0)
      .attr("x2", svgWidth/2 - 40)
      .attr("y2", 0)
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1);

    g.append("line")
      .attr("x1", 0)
      .attr("y1", -svgHeight/2 + 40)
      .attr("x2", 0)
      .attr("y2", svgHeight/2 - 40)
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1);

    // X-axis label
    g.append("text")
      .attr("x", svgWidth/2 - 50)
      .attr("y", 20)
      .text("X")
      .attr("font-size", "14px");

    // Y-axis label
    g.append("text")
      .attr("x", 10)
      .attr("y", -svgHeight/2 + 50)
      .text("Y")
      .attr("font-size", "14px");

    // Factor for scaling eigenvectors by eigenvalues
    const scale = 80;

    // Initialize eigenvector direction (orthogonal unit vectors)
    // These will remain fixed in direction, but scale with lambda values
    const baseEv1x = 0.8;
    const baseEv1y = 0.6;
    const baseEv2x = -0.6;
    const baseEv2y = 0.8;

    // Function to update visualization based on lambda values
    const updateVisualization = (l1, l2) => {
      // Remove old dynamic elements
      g.selectAll(".data-point").remove();
      g.selectAll(".pc-line").remove();
      g.selectAll(".pc-label").remove();

      // Determine which eigenvalue is larger (PC1 should have largest eigenvalue)
      const isPc1Larger = l1 >= l2;

      // Assign PC1 and PC2 based on eigenvalue magnitude
      const pc1Lambda = isPc1Larger ? l1 : l2;
      const pc2Lambda = isPc1Larger ? l2 : l1;
      const pc1x = isPc1Larger ? baseEv1x : baseEv2x;
      const pc1y = isPc1Larger ? baseEv1y : baseEv2y;
      const pc2x = isPc1Larger ? baseEv2x : baseEv1x;
      const pc2y = isPc1Larger ? baseEv2y : baseEv1y;

      // Store PC1 direction for projection button
      window.pcaPC1 = { x: pc1x, y: pc1y, lambda: pc1Lambda };

      // Generate random data points along eigenvectors
      const dataPoints = [];
      for (let i = 0; i < 100; i++) {
        // Generate points along eigenvectors, scaled by lambda values
        const a = (Math.random() - 0.5) * Math.sqrt(pc1Lambda) * 30;
        const b = (Math.random() - 0.5) * Math.sqrt(pc2Lambda) * 30;

        dataPoints.push({
          x: a * pc1x + b * pc2x,
          y: a * pc1y + b * pc2y,
          origX: a * pc1x + b * pc2x,
          origY: a * pc1y + b * pc2y
        });
      }

      // Draw data points
      g.selectAll(".data-point")
        .data(dataPoints)
        .enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 3)
        .attr("fill", theme.palette.primary.light)
        .attr("opacity", 0.5);

      // Draw PC1 (largest eigenvalue - always red)
      g.append("line")
        .attr("class", "pc-line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", pc1x * Math.sqrt(pc1Lambda) * scale / 5)
        .attr("y2", pc1y * Math.sqrt(pc1Lambda) * scale / 5)
        .attr("stroke", "red")
        .attr("stroke-width", 3)
        .attr("marker-end", "url(#eigen-arrow1)");

      // Draw PC2 (smaller eigenvalue - always green)
      g.append("line")
        .attr("class", "pc-line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", pc2x * Math.sqrt(pc2Lambda) * scale / 5)
        .attr("y2", pc2y * Math.sqrt(pc2Lambda) * scale / 5)
        .attr("stroke", "green")
        .attr("stroke-width", 3)
        .attr("marker-end", "url(#eigen-arrow2)");

      // PC labels - show which lambda it corresponds to
      g.append("text")
        .attr("class", "pc-label")
        .attr("x", pc1x * Math.sqrt(pc1Lambda) * scale / 4)
        .attr("y", pc1y * Math.sqrt(pc1Lambda) * scale / 4 - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "red")
        .attr("font-weight", "bold")
        .text("PC1 (λ=" + pc1Lambda.toFixed(1) + ")");

      g.append("text")
        .attr("class", "pc-label")
        .attr("x", pc2x * Math.sqrt(pc2Lambda) * scale / 4)
        .attr("y", pc2y * Math.sqrt(pc2Lambda) * scale / 4 - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "green")
        .attr("font-weight", "bold")
        .text("PC2 (λ=" + pc2Lambda.toFixed(1) + ")");
    };

    // Initial visualization
    updateVisualization(lambda1Value, lambda2Value);

    // Add slider event handlers
    lambda1Slider.on("input", function() {
      lambda1Value = +this.value;
      lambda1Label.text(lambda1Value.toFixed(1));
      updateVisualization(lambda1Value, lambda2Value);
    });

    lambda2Slider.on("input", function() {
      lambda2Value = +this.value;
      lambda2Label.text(lambda2Value.toFixed(1));
      updateVisualization(lambda1Value, lambda2Value);
    });

    // Add arrowhead markers
    svg.append("defs")
      .selectAll("marker")
      .data(["eigen-arrow1", "eigen-arrow2"])
      .enter()
      .append("marker")
      .attr("id", d => d)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", (d, i) => i === 0 ? "red" : "green");

    // Buttons to animate eigenvector exploration
    const buttonContainer = rightCol.append("div")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("margin-top", "20px")
      .style("gap", "10px");

    buttonContainer.append("button")
      .text("Project onto PC1")
      .style("padding", "6px 12px")
      .style("background-color", theme.palette.primary.main)
      .style("color", "white")
      .style("border", "none")
      .style("border-radius", "4px")
      .style("cursor", "pointer")
      .on("click", () => {
        // Project points onto PC1 (direction with largest eigenvalue)
        const pc1 = window.pcaPC1 || { x: baseEv1x, y: baseEv1y };
        g.selectAll(".data-point")
          .transition()
          .duration(1000)
          .attr("cx", d => {
            const dot = d.origX * pc1.x + d.origY * pc1.y;
            return dot * pc1.x;
          })
          .attr("cy", d => {
            const dot = d.origX * pc1.x + d.origY * pc1.y;
            return dot * pc1.y;
          });
      });

    buttonContainer.append("button")
      .text("Reset")
      .style("padding", "6px 12px")
      .style("background-color", theme.palette.grey[500])
      .style("color", "white")
      .style("border", "none")
      .style("border-radius", "4px")
      .style("cursor", "pointer")
      .on("click", () => {
        // Reset visualization to current lambda values
        updateVisualization(lambda1Value, lambda2Value);
      });
  };

  // Check if we're on mobile to adjust the layout
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      {/* Educational Banner */}
      <Alert
        severity="info"
        icon={<SchoolIcon />}
        sx={{ mb: 3, border: 2, borderColor: 'primary.main' }}
        action={
          <Button
            component={RouterLink}
            to="/pca-learn"
            variant="contained"
            size="small"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Start Learning
          </Button>
        }
      >
        <AlertTitle sx={{ fontWeight: 600 }}>🎓 New: Learn PCA Visually!</AlertTitle>
        Want to deeply understand PCA before analyzing data? Check out our <strong>interactive visual lessons</strong>.
        Build geometric intuition with step-by-step derivations and live simulations.
      </Alert>

      <Typography variant="h5" gutterBottom>
        Introduction to Principal Component Analysis (PCA)
      </Typography>

      <Typography paragraph>
        Principal Component Analysis (PCA) is a powerful technique for dimensionality reduction, data visualization, and feature extraction.
        It transforms high-dimensional data into a lower-dimensional space while preserving as much variance as possible.
      </Typography>
      
      <Paper elevation={0} sx={{ mb: 3, p: 2, bgcolor: theme.palette.background.default }}>
        <Typography variant="h6" gutterBottom>
          Key Concepts in PCA
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.paper, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Dimensionality Reduction
              </Typography>
              <Typography variant="body2" color="text.primary">
                PCA finds new variables (principal components) that are linear combinations of the original variables,
                ordered by the amount of variance they capture. By keeping only the first few components, we can represent
                high-dimensional data in a lower-dimensional space with minimal information loss.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.paper, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Principal Components
              </Typography>
              <Typography variant="body2" color="text.primary">
                Principal components are orthogonal directions in the data space along which the data varies the most.
                The first principal component captures the most variance, the second captures the second most, and so on.
                These components are eigenvectors of the data's covariance matrix.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.paper, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Eigenvalues and Eigenvectors
              </Typography>
              <Typography variant="body2" color="text.primary">
                PCA is based on the eigenvectors and eigenvalues of the covariance matrix. The eigenvectors determine the
                directions of the new feature space, and the eigenvalues determine their magnitude (how much variance is
                explained by each principal component).
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.paper, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Variance Explained
              </Typography>
              <Typography variant="body2" color="text.primary">
                The proportion of variance explained by each principal component indicates its importance.
                A scree plot shows eigenvalues in descending order and helps determine how many components to retain.
                Typically, we choose components that cumulatively explain 80-90% of the total variance.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="pca tutorial tabs"
            variant="fullWidth"
          >
            <Tab label="Applications" />
            <Tab label="PCA Visualization" />
            <Tab label="PCA Step-by-Step" />
            <Tab label="Eigenvectors" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Applications of PCA in Biological Data Analysis
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Gene Expression Analysis
                </Typography>
                <Typography variant="body2" paragraph>
                  In gene expression studies, PCA helps identify patterns and sample groups in datasets with thousands of genes.
                  It can reveal biological variations, technical artifacts, and outliers in the data.
                </Typography>
                <Typography variant="body2">
                  PCA plots of gene expression data often show clear separation between disease and control samples,
                  different tissue types, or treatment conditions, providing insights into the underlying biology.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Single-Cell RNA Sequencing
                </Typography>
                <Typography variant="body2" paragraph>
                  PCA is a crucial step in single-cell RNA-seq analysis workflows, used to reduce dimensions before
                  clustering cells into different cell types or states.
                </Typography>
                <Typography variant="body2">
                  By reducing thousands of gene expression measurements to a manageable number of components,
                  PCA enables visualization and clustering of thousands to millions of individual cells.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Genomic Variation Analysis
                </Typography>
                <Typography variant="body2" paragraph>
                  PCA of genomic data (e.g., SNP genotypes) can reveal population structure and ancestry patterns
                  by projecting genetic variation onto major axes of variation.
                </Typography>
                <Typography variant="body2">
                  This approach is widely used in population genetics, genome-wide association studies (GWAS),
                  and for controlling population stratification in genetic analyses.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Proteomics and Metabolomics
                </Typography>
                <Typography variant="body2" paragraph>
                  PCA helps identify patterns in complex proteomics and metabolomics datasets,
                  enabling visualization of sample relationships and biomarker discovery.
                </Typography>
                <Typography variant="body2">
                  It can reveal biochemical pathways that distinguish between different physiological or disease states,
                  and identify key proteins or metabolites driving these differences.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Interactive PCA Visualization
            </Typography>
            
            <Typography variant="body2" paragraph align="center" sx={{ maxWidth: 700 }}>
              This visualization demonstrates how PCA finds the directions of maximum variance in the data.
              The red arrow represents the first principal component (PC1), which captures the most variance.
              The green arrow represents the second principal component (PC2), which is orthogonal to PC1.
            </Typography>
            
            <Box ref={scatterplotRef} sx={{ width: '100%', height: 500, display: 'flex', flexDirection: 'column', alignItems: 'center' }} />
            
            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
              Click the "Project Data onto PC1" button to see how data points are projected onto the first principal component.
            </Typography>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              PCA Step-by-Step Process
            </Typography>
            
            <Typography variant="body2" paragraph align="center" sx={{ maxWidth: 700 }}>
              This animation walks through each step of the PCA process, from data centering to
              finding the covariance matrix, calculating eigenvectors, and projecting data onto the new axes.
            </Typography>
            
            <Box ref={pcaAnimationRef} sx={{ width: '100%', height: 500 }} />
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Eigenvectors and Eigenvalues
            </Typography>
            
            <Typography variant="body2" paragraph align="center" sx={{ maxWidth: 700 }}>
              This visualization demonstrates the concept of eigenvectors and eigenvalues,
              which form the mathematical foundation of PCA. Eigenvectors define the directions
              of maximum variance, while eigenvalues indicate the amount of variance explained.
            </Typography>
            
            <Box ref={eigenVectorsRef} sx={{ width: '100%', height: 500 }} />
          </Box>
        </TabPanel>
      </Box>
      
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={onNext}
        >
          Continue to Data Upload
        </Button>
      </Box>
    </Box>
  );
};

export default PcaIntroduction;