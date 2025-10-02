import React, { createContext, useState, useContext, useEffect } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(() => {
    const saved = localStorage.getItem('onboardingCompleted');
    return saved ? JSON.parse(saved) : [];
  });

  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome to StickForStats',
      description: 'Your comprehensive statistical analysis platform',
      target: null
    },
    {
      id: 'modules',
      title: 'Statistical Modules',
      description: 'Explore our powerful analysis modules',
      target: '.navigation-modules'
    },
    {
      id: 'data',
      title: 'Data Management',
      description: 'Upload and manage your datasets',
      target: '.data-upload-button'
    },
    {
      id: 'analysis',
      title: 'Run Analysis',
      description: 'Perform statistical analysis with ease',
      target: '.analysis-button'
    },
    {
      id: 'reports',
      title: 'Generate Reports',
      description: 'Create professional reports from your results',
      target: '.reports-button'
    }
  ];

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem('hasVisitedBefore', 'true');
    }
  }, []);

  const startOnboarding = () => {
    setIsOnboardingActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipOnboarding = () => {
    setIsOnboardingActive(false);
    setCurrentStep(0);
  };

  const completeOnboarding = () => {
    const allStepIds = onboardingSteps.map(step => step.id);
    setCompletedSteps(allStepIds);
    localStorage.setItem('onboardingCompleted', JSON.stringify(allStepIds));
    setIsOnboardingActive(false);
    setCurrentStep(0);
  };

  const resetOnboarding = () => {
    setCompletedSteps([]);
    localStorage.removeItem('onboardingCompleted');
    setCurrentStep(0);
  };

  const value = {
    isFirstVisit,
    isOnboardingActive,
    currentStep,
    completedSteps,
    onboardingSteps,
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    resetOnboarding,
    currentStepData: onboardingSteps[currentStep]
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;