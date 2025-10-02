import React, { useState, Suspense } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Divider,
  Container,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  QuestionAnswer as QuestionAnswerIcon,
  Source as SourceIcon,
  History as HistoryIcon
} from '@mui/icons-material';

// Use lazy-loaded components for better performance
import { 
  LazyQueryInterface as QueryInterface,
  LazySourcesExplorer as SourcesExplorer,
  LazyConversationHistory as ConversationHistory 
} from './LazyRAGComponents';

// Loading component for Suspense fallback
const ComponentLoader = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      height: '100%',
      width: '100%',
      p: 4
    }}
  >
    <CircularProgress />
  </Box>
);

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rag-tabpanel-${index}`}
      aria-labelledby={`rag-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const RAGDashboard = ({ moduleContext = null }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        data-testid="rag-dashboard"
        sx={{ 
          p: 0, 
          display: 'flex', 
          flexDirection: 'column',
          height: '700px',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            aria-label="RAG system tabs"
            centered
          >
            <Tab 
              data-testid="questions-tab"
              icon={<QuestionAnswerIcon />} 
              label="Ask Questions" 
              id="rag-tab-0"
              aria-controls="rag-tabpanel-0"
            />
            <Tab 
              data-testid="knowledge-base-tab"
              icon={<SourceIcon />} 
              label="Knowledge Base" 
              id="rag-tab-1"
              aria-controls="rag-tabpanel-1"
            />
            <Tab 
              data-testid="history-tab"
              icon={<HistoryIcon />} 
              label="Conversation History" 
              id="rag-tab-2"
              aria-controls="rag-tabpanel-2"
            />
          </Tabs>
        </Box>
        
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <TabPanel value={activeTab} index={0}>
            <Suspense fallback={<ComponentLoader />}>
              <QueryInterface 
                data-testid="query-interface"
                moduleContext={moduleContext} 
              />
            </Suspense>
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <Suspense fallback={<ComponentLoader />}>
              <SourcesExplorer 
                data-testid="sources-explorer"
              />
            </Suspense>
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <Suspense fallback={<ComponentLoader />}>
              <ConversationHistory 
                data-testid="conversation-history"
                moduleContext={moduleContext} 
              />
            </Suspense>
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};

export default RAGDashboard;