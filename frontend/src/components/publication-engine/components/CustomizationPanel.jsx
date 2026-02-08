/**
 * CustomizationPanel - Tabbed right sidebar for plot customization
 */

import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper, useTheme } from '@mui/material';
import { usePlotConfig } from '../context/PlotConfigContext';
import TitleAxisPanel from './panels/TitleAxisPanel';
import ColorPalettePanel from './panels/ColorPalettePanel';
import ErrorBarPanel from './panels/ErrorBarPanel';
import LegendGridPanel from './panels/LegendGridPanel';
import DimensionsPanel from './panels/DimensionsPanel';
import JournalPresets from './JournalPresets';

const TabPanel = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 1.5 }}>
    {value === index && children}
  </Box>
);

const CustomizationPanel = () => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Customize
      </Typography>
      <JournalPresets />
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 32,
          '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.7rem', minWidth: 'auto', px: 1 },
        }}
      >
        <Tab label="Title/Axes" />
        <Tab label="Colors" />
        <Tab label="Error Bars" />
        <Tab label="Legend" />
        <Tab label="Size" />
      </Tabs>
      <TabPanel value={tab} index={0}><TitleAxisPanel /></TabPanel>
      <TabPanel value={tab} index={1}><ColorPalettePanel /></TabPanel>
      <TabPanel value={tab} index={2}><ErrorBarPanel /></TabPanel>
      <TabPanel value={tab} index={3}><LegendGridPanel /></TabPanel>
      <TabPanel value={tab} index={4}><DimensionsPanel /></TabPanel>
    </Box>
  );
};

export default CustomizationPanel;
