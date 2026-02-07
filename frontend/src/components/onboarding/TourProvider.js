import React, { createContext, useState, useContext } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTheme } from '@mui/material';

const TourContext = createContext();

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

const TourProvider = ({ children }) => {
  const theme = useTheme();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourSteps, setTourSteps] = useState([
    {
      target: '.navigation-drawer',
      content: 'Navigate through different statistical analysis modules here.',
      placement: 'right',
    },
    {
      target: '.upload-button',
      content: 'Upload your data files using this button.',
      placement: 'bottom',
    },
    {
      target: '.analysis-panel',
      content: 'Configure and run your analysis in this panel.',
      placement: 'left',
    },
    {
      target: '.results-section',
      content: 'View your analysis results and download reports here.',
      placement: 'top',
    },
  ]);

  const startTour = () => {
    setRun(true);
    setStepIndex(0);
  };

  const stopTour = () => {
    setRun(false);
  };

  const handleJoyrideCallback = (data) => {
    const { status, index } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      setStepIndex(0);
    } else {
      setStepIndex(index);
    }
  };

  const value = {
    startTour,
    stopTour,
    setTourSteps,
    stepIndex,
    run,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      <Joyride
        steps={tourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: theme.palette.primary.main,
            textColor: theme.palette.text.primary,
            backgroundColor: theme.palette.background.paper,
            arrowColor: theme.palette.background.paper,
            width: 300,
            zIndex: 10000,
          },
          spotlight: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      />
    </TourContext.Provider>
  );
};

export default TourProvider;