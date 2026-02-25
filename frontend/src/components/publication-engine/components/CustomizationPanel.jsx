/**
 * CustomizationPanel - Tabbed right sidebar for plot customization
 */

import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, useTheme } from '@mui/material';
import { usePlotConfig } from '../context/PlotConfigContext';
import TitleAxisPanel from './panels/TitleAxisPanel';
import ColorPalettePanel from './panels/ColorPalettePanel';
import ErrorBarPanel from './panels/ErrorBarPanel';
import LegendGridPanel from './panels/LegendGridPanel';
import DimensionsPanel from './panels/DimensionsPanel';
import ChartSpecificPanel from './panels/ChartSpecificPanel';
import JournalPresets from './JournalPresets';

const CHART_OPTIONS_TYPES = [
  'scatter', 'kaplanmeier', 'doseresponse', 'blandaltman', 'waterfall', 'forest',
];

const TabPanel = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 1.5 }}>
    {value === index && children}
  </Box>
);

const CustomizationPanel = () => {
  const theme = useTheme();
  const { state } = usePlotConfig();
  const [tab, setTab] = useState(0);

  const hasChartOptions = CHART_OPTIONS_TYPES.includes(state.plotType);

  // Build tab list dynamically
  const tabs = [
    { label: 'Title/Axes', panel: <TitleAxisPanel /> },
    { label: 'Colors', panel: <ColorPalettePanel /> },
    { label: 'Error Bars', panel: <ErrorBarPanel /> },
  ];

  if (hasChartOptions) {
    tabs.push({ label: 'Chart Options', panel: <ChartSpecificPanel /> });
  }

  tabs.push({ label: 'Legend', panel: <LegendGridPanel /> });
  tabs.push({ label: 'Size', panel: <DimensionsPanel /> });

  // Clamp tab index
  const safeTab = Math.min(tab, tabs.length - 1);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Customize
      </Typography>
      <JournalPresets />
      <Tabs
        value={safeTab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 32,
          '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.7rem', minWidth: 'auto', px: 1 },
        }}
      >
        {tabs.map((t, i) => (
          <Tab key={t.label} label={t.label} />
        ))}
      </Tabs>
      {tabs.map((t, i) => (
        <TabPanel key={t.label} value={safeTab} index={i}>{t.panel}</TabPanel>
      ))}
    </Box>
  );
};

export default CustomizationPanel;
