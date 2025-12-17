/**
 * SettingsContext.js
 * ==================
 * Global settings context for StickForStats application.
 *
 * Provides user preferences including:
 * - Expert Mode: Allows users to bypass Guardian blocking for critical violations
 * - Other future settings can be added here
 *
 * Settings are persisted to localStorage with the 'stickforstats_' prefix.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { createContext, useState, useContext, useEffect } from 'react';

// Default settings
const DEFAULT_SETTINGS = {
  // Expert Mode: When enabled, allows proceeding with tests even when
  // Guardian detects critical assumption violations. Default is OFF
  // for maximum protection of novice users.
  expertMode: false,

  // Show advanced statistical options in UI
  showAdvancedOptions: false,

  // Show mathematical equations alongside results
  showEquations: true,

  // Auto-run Guardian check when data is entered
  autoRunGuardian: true,

  // Show educational tooltips
  showEducationalContent: true,
};

// Create the context
const SettingsContext = createContext();

/**
 * Custom hook to access settings
 * @returns {Object} Settings context value
 * @throws {Error} If used outside SettingsProvider
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

/**
 * Settings Provider Component
 * Wraps application to provide global settings access
 */
export const SettingsProvider = ({ children }) => {
  // Initialize settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('stickforstats_settings');
      if (savedSettings) {
        // Merge saved settings with defaults (in case new settings were added)
        return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('stickforstats_settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  /**
   * Toggle Expert Mode
   * When Expert Mode is ON, Guardian warnings for critical violations
   * can be bypassed (though warnings are still shown).
   */
  const toggleExpertMode = () => {
    setSettings(prev => ({
      ...prev,
      expertMode: !prev.expertMode
    }));
  };

  /**
   * Set Expert Mode explicitly
   * @param {boolean} value - New expert mode value
   */
  const setExpertMode = (value) => {
    setSettings(prev => ({
      ...prev,
      expertMode: Boolean(value)
    }));
  };

  /**
   * Update a single setting
   * @param {string} key - Setting key
   * @param {any} value - New value
   */
  const updateSetting = (key, value) => {
    if (key in DEFAULT_SETTINGS) {
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));
    } else {
      console.warn(`Unknown setting key: ${key}`);
    }
  };

  /**
   * Update multiple settings at once
   * @param {Object} newSettings - Object with settings to update
   */
  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(newSettings).filter(([key]) => key in DEFAULT_SETTINGS)
      )
    }));
  };

  /**
   * Reset all settings to defaults
   */
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  /**
   * Check if Guardian should block tests
   * Returns false (don't block) if Expert Mode is enabled
   * @param {boolean} hasViolations - Whether there are violations
   * @param {boolean} hasCriticalViolations - Whether there are critical violations
   * @returns {boolean} Whether the test should be blocked
   */
  const shouldBlockTest = (hasViolations, hasCriticalViolations) => {
    // In Expert Mode, never block (but still show warnings)
    if (settings.expertMode) {
      return false;
    }
    // In normal mode, block on critical violations
    return hasViolations && hasCriticalViolations;
  };

  const value = {
    // All settings
    settings,

    // Expert Mode specific
    expertMode: settings.expertMode,
    toggleExpertMode,
    setExpertMode,

    // Guardian blocking logic
    shouldBlockTest,

    // Generic setting updates
    updateSetting,
    updateSettings,
    resetSettings,

    // Convenience accessors for common settings
    showAdvancedOptions: settings.showAdvancedOptions,
    showEquations: settings.showEquations,
    autoRunGuardian: settings.autoRunGuardian,
    showEducationalContent: settings.showEducationalContent,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
