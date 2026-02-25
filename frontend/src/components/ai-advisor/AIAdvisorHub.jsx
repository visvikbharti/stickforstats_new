/**
 * AI Statistical Advisor Hub
 *
 * The main container for StickForStats' AI-powered statistical guidance system.
 * Features:
 * - Natural language Q&A about statistics
 * - Test selection recommendations based on data
 * - Result interpretation and explanation
 * - Assumption violation guidance
 * - Publication-ready reporting suggestions
 *
 * This is the flagship feature that differentiates StickForStats from competitors.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Fab,
  Drawer,
  Badge,
  Tooltip,
  Zoom,
  Collapse,
  Alert,
  Chip,
  Divider,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  SmartToy as AIIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as SparkleIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Lightbulb as LightbulbIcon,
  Chat as ChatIcon,
  Description as DescriptionIcon,
  Shield as ShieldIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

import AIAdvisorChat from './AIAdvisorChat';
import AIAdvisorDataContext from './AIAdvisorDataContext';
import MethodsSectionGenerator from './MethodsSectionGenerator';
import { useAIAdvisor } from './hooks/useAIAdvisor';

/**
 * Quick suggestion categories for the AI advisor
 */
const QUICK_SUGGESTIONS = [
  {
    category: 'Test Selection',
    icon: <ScienceIcon />,
    colorKey: 'primary',
    suggestions: [
      'What statistical test should I use for my data?',
      'How do I compare means between two groups?',
      'Which test is best for categorical data?',
      'Should I use parametric or non-parametric tests?',
    ]
  },
  {
    category: 'Assumptions',
    icon: <AssessmentIcon />,
    colorKey: 'warning',
    suggestions: [
      'How do I check normality assumptions?',
      'What if my data violates homogeneity of variance?',
      'How do I handle non-normal data?',
      'What are the assumptions for ANOVA?',
    ]
  },
  {
    category: 'Interpretation',
    icon: <LightbulbIcon />,
    colorKey: 'success',
    suggestions: [
      'How do I interpret my p-value?',
      'What does effect size mean?',
      'How do I report confidence intervals?',
      'Is my result statistically significant?',
    ]
  },
  {
    category: 'Study Design',
    icon: <SchoolIcon />,
    colorKey: 'secondary',
    suggestions: [
      'How many participants do I need?',
      'What is statistical power?',
      'How do I calculate sample size?',
      'What effect size should I use?',
    ]
  },
];

/**
 * Main AI Advisor Hub Component
 *
 * Props:
 * @param {boolean} embedded - If true, renders without FAB/Drawer (for embedding in pages)
 * @param {boolean} initialOpen - If true, starts with drawer open
 * @param {Object} dataContext - Data context with dataset info and Guardian results
 * @param {Object} guardianReport - Raw Guardian API response to register
 * @param {Function} onTestRecommendation - Callback when AI recommends a test
 * @param {Function} onMethodsGenerate - Callback when methods section is generated
 * @param {Function} onGuardianAsk - Callback when user clicks "Ask AI about Guardian issues"
 */
const AIAdvisorHub = ({
  embedded = false,
  initialOpen = false,
  dataContext = null,
  guardianReport = null,
  onTestRecommendation = null,
  onMethodsGenerate = null,
  onGuardianAsk = null,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [showDataContext, setShowDataContext] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [activeView, setActiveView] = useState('chat'); // 'chat' or 'methods'

  // AI Advisor hook with Guardian integration
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearConversation,
    setDataContext: setAIDataContext,
    guardianWarningStatus,
    askAboutGuardianIssues,
    registerGuardianResult,
  } = useAIAdvisor();

  // Refs
  const fabRef = useRef(null);

  // Handle data context changes
  useEffect(() => {
    if (dataContext) {
      setAIDataContext(dataContext);
    }
  }, [dataContext, setAIDataContext]);

  // Handle Guardian report prop changes - register new Guardian results
  useEffect(() => {
    if (guardianReport) {
      registerGuardianResult(guardianReport);
    }
  }, [guardianReport, registerGuardianResult]);

  // Handle opening the advisor
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasUnreadMessages(false);
  }, []);

  // Handle closing the advisor
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle quick suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    sendMessage(suggestion);
    setActiveCategory(null);
  }, [sendMessage]);

  // Handle test recommendation from AI
  const handleTestRecommendation = useCallback((test) => {
    if (onTestRecommendation) {
      onTestRecommendation(test);
    }
  }, [onTestRecommendation]);

  // Handle view change
  const handleViewChange = useCallback((event, newValue) => {
    setActiveView(newValue);
  }, []);

  // Handle methods generation callback
  const handleMethodsGenerated = useCallback((content) => {
    if (onMethodsGenerate) {
      onMethodsGenerate(content);
    }
  }, [onMethodsGenerate]);

  // Render the floating action button
  const renderFAB = () => (
    <Zoom in={!isOpen}>
      <Tooltip title="Ask StickAI - Your Statistical Advisor" placement="left">
        <Fab
          ref={fabRef}
          color="primary"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.dark} 100%)`,
              transform: 'scale(1.05)',
            },
            transition: 'all 0.3s ease',
            zIndex: 1300,
          }}
        >
          <Badge
            badgeContent={hasUnreadMessages ? '!' : 0}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                animation: hasUnreadMessages ? 'pulse 1.5s infinite' : 'none',
              }
            }}
          >
            <AIIcon sx={{ fontSize: 28 }} />
          </Badge>
        </Fab>
      </Tooltip>
    </Zoom>
  );

  // Render the header
  const renderHeader = () => (
    <Box>
      <Box
        sx={{
          p: 2,
          pb: 1,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 50%, ${theme.palette.primary.dark} 100%)`,
          color: theme.palette.primary.contrastText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PsychologyIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              StickAI
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Your Statistical Advisor
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Data Context">
            <IconButton
              size="small"
              onClick={() => setShowDataContext(!showDataContext)}
              sx={{ color: 'white' }}
            >
              <AssessmentIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* View Tabs */}
      <Tabs
        value={activeView}
        onChange={handleViewChange}
        variant="fullWidth"
        sx={{
          bgcolor: theme.palette.primary.dark,
          '& .MuiTab-root': {
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'none',
            fontWeight: 500,
            minHeight: 44,
            '&.Mui-selected': {
              color: 'white',
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: 'white',
            height: 3,
          },
        }}
      >
        <Tab
          value="chat"
          icon={<ChatIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label="AI Chat"
        />
        <Tab
          value="methods"
          icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label="Methods Writer"
        />
      </Tabs>
    </Box>
  );

  // Render quick suggestions
  const renderQuickSuggestions = () => (
    <Box sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
        <SparkleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
        Quick Questions
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {QUICK_SUGGESTIONS.map((category) => (
          <Chip
            key={category.category}
            icon={category.icon}
            label={category.category}
            onClick={() => setActiveCategory(
              activeCategory === category.category ? null : category.category
            )}
            sx={{
              bgcolor: activeCategory === category.category
                ? theme.palette[category.colorKey].main
                : theme.palette.background.paper,
              color: activeCategory === category.category
                ? theme.palette[category.colorKey].contrastText
                : theme.palette.text.primary,
              '&:hover': {
                bgcolor: activeCategory === category.category
                  ? theme.palette[category.colorKey].main
                  : alpha(theme.palette[category.colorKey].main, 0.12),
              },
              transition: 'all 0.2s',
            }}
          />
        ))}
      </Box>

      <Collapse in={activeCategory !== null}>
        <Box sx={{ mt: 2 }}>
          {QUICK_SUGGESTIONS.find(c => c.category === activeCategory)?.suggestions.map(
            (suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{
                  m: 0.5,
                  bgcolor: theme.palette.background.paper,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.light, 0.2),
                  },
                }}
                size="small"
              />
            )
          )}
        </Box>
      </Collapse>
    </Box>
  );

  // Render welcome message for new conversations
  const renderWelcome = () => (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.light, 0.2),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <PsychologyIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
      </Box>

      <Typography variant="h6" gutterBottom>
        Welcome to StickAI
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        I'm your intelligent statistical advisor. I can help you:
      </Typography>

      <Box sx={{ textAlign: 'left', maxWidth: 300, mx: 'auto' }}>
        {[
          { icon: <ScienceIcon />, text: 'Choose the right statistical test' },
          { icon: <AssessmentIcon />, text: 'Check and fix assumption violations' },
          { icon: <LightbulbIcon />, text: 'Interpret your results clearly' },
          { icon: <SchoolIcon />, text: 'Design adequately powered studies' },
          { icon: <ChatIcon />, text: 'Write publication-ready methods' },
        ].map((item, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 1.5,
              color: 'text.secondary',
            }}
          >
            <Box sx={{ color: theme.palette.primary.main }}>{item.icon}</Box>
            <Typography variant="body2">{item.text}</Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="body2" color="text.secondary">
        Ask me anything about statistics, or select a quick question above!
      </Typography>
    </Box>
  );

  // Handle Guardian "Ask AI" button click
  const handleAskAboutGuardianIssues = useCallback(() => {
    askAboutGuardianIssues();
    // Also trigger parent callback if provided
    if (onGuardianAsk) {
      onGuardianAsk(guardianWarningStatus);
    }
  }, [askAboutGuardianIssues, onGuardianAsk, guardianWarningStatus]);

  // Render Guardian Warning Banner
  const renderGuardianBanner = () => {
    if (!guardianWarningStatus.hasIssues) return null;

    const hasViolations = guardianWarningStatus.violations > 0;
    const severity = hasViolations ? 'error' : 'warning';
    const bgColor = hasViolations
      ? alpha(theme.palette.error.light, isDarkMode ? 0.15 : 0.2)
      : alpha(theme.palette.warning.light, isDarkMode ? 0.15 : 0.2);
    const borderColor = hasViolations ? theme.palette.error.main : theme.palette.warning.main;
    const IconComponent = hasViolations ? ErrorIcon : WarningIcon;

    return (
      <Box
        sx={{
          p: 1.5,
          bgcolor: bgColor,
          borderBottom: `2px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: borderColor,
            flexShrink: 0,
          }}
        >
          <ShieldIcon sx={{ color: 'white', fontSize: 18 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: hasViolations ? theme.palette.error.dark : theme.palette.warning.dark }}>
            Guardian Alert
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {guardianWarningStatus.violations > 0 && `${guardianWarningStatus.violations} violation${guardianWarningStatus.violations > 1 ? 's' : ''}`}
            {guardianWarningStatus.violations > 0 && guardianWarningStatus.warnings > 0 && ', '}
            {guardianWarningStatus.warnings > 0 && `${guardianWarningStatus.warnings} warning${guardianWarningStatus.warnings > 1 ? 's' : ''}`}
          </Typography>
        </Box>

        <Chip
          icon={<IconComponent sx={{ fontSize: 16 }} />}
          label="Ask AI"
          size="small"
          onClick={handleAskAboutGuardianIssues}
          sx={{
            bgcolor: borderColor,
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              bgcolor: hasViolations ? theme.palette.error.dark : theme.palette.warning.dark,
            },
            '& .MuiChip-icon': {
              color: 'white',
            },
          }}
        />
      </Box>
    );
  };

  // Render the Chat view
  const renderChatView = () => (
    <>
      <Collapse in={showDataContext}>
        <AIAdvisorDataContext
          dataContext={dataContext}
          onClose={() => setShowDataContext(false)}
        />
      </Collapse>

      {/* Guardian Warning Banner */}
      {renderGuardianBanner()}

      {messages.length === 0 && !isLoading && (
        <>
          {renderQuickSuggestions()}
          {renderWelcome()}
        </>
      )}

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {(messages.length > 0 || isLoading) && (
          <>
            {renderQuickSuggestions()}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <AIAdvisorChat
                messages={messages}
                isLoading={isLoading}
                onSendMessage={sendMessage}
                onTestRecommendation={handleTestRecommendation}
                onMethodsGenerate={onMethodsGenerate}
              />
            </Box>
          </>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
    </>
  );

  // Render the Methods Generator view
  const renderMethodsView = () => (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
      <MethodsSectionGenerator
        onGenerate={handleMethodsGenerated}
        onClose={() => setActiveView('chat')}
      />
    </Box>
  );

  // Render the main drawer content
  const renderDrawerContent = () => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {renderHeader()}

      {activeView === 'chat' && renderChatView()}
      {activeView === 'methods' && renderMethodsView()}
    </Box>
  );

  // If embedded, render directly without FAB/Drawer
  if (embedded) {
    return (
      <Paper
        elevation={3}
        sx={{
          height: '100%',
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        {renderDrawerContent()}
      </Paper>
    );
  }

  // Render FAB + Drawer for floating mode
  return (
    <>
      {renderFAB()}

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 420,
            maxWidth: '100%',
            borderRadius: isMobile ? 0 : '16px 0 0 16px',
          }
        }}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
      >
        {renderDrawerContent()}
      </Drawer>

      {/* Pulse animation keyframes */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </>
  );
};

export default AIAdvisorHub;
