/**
 * Testing utilities for D3.js simulation components
 * 
 * This file contains helper functions and components to facilitate
 * testing of D3.js enhanced visualizations
 */

import React from 'react';

/**
 * Apply test IDs to a component based on configuration
 * 
 * This HOC wraps a component and applies data-testid attributes
 * to make it easier to test with both RTL and Cypress
 * 
 * @param {React.Component} Component - The component to wrap
 * @param {Object} options - Configuration options
 * @returns {React.Component} - The wrapped component with test IDs
 */
export const withTestIds = (Component, options = {}) => {
  const { prefix = '' } = options;
  
  return React.forwardRef((props, ref) => {
    const testProps = {
      ...props,
      'data-testid': `${prefix}${prefix ? '-' : ''}container`,
    };
    
    return <Component {...testProps} ref={ref} />;
  });
};

/**
 * Testing props for D3.js components
 * 
 * Generates props with test IDs for different component areas
 * 
 * @param {string} componentName - Base name for the component
 * @returns {Object} - Object with test props
 */
export const getTestProps = (componentName) => {
  return {
    container: { 'data-testid': `${componentName}-container` },
    parameters: { 'data-testid': `${componentName}-parameters` },
    chart: { 'data-testid': `${componentName}-chart` },
    controls: { 'data-testid': `${componentName}-controls` },
    results: { 'data-testid': `${componentName}-results` },
    metrics: { 'data-testid': `${componentName}-metrics` },
    educational: { 'data-testid': `${componentName}-educational` },
  };
};

/**
 * Prop generator for test IDs
 * 
 * Generates data-testid props for component elements
 * 
 * @param {string} componentName - Base name for the component
 * @param {string} elementName - Name of the specific element
 * @returns {Object} - Object with data-testid prop
 */
export const testId = (componentName, elementName) => {
  return { 'data-testid': `${componentName}-${elementName}` };
};

/**
 * Add test ID to existing props
 * 
 * @param {Object} props - Existing props object
 * @param {string} componentName - Base name for the component
 * @param {string} elementName - Name of the specific element
 * @returns {Object} - Object with merged props
 */
export const withTestId = (props, componentName, elementName) => {
  return {
    ...props,
    'data-testid': `${componentName}-${elementName}`,
  };
};

/**
 * Prop generator for slider test IDs
 * 
 * @param {string} paramName - Parameter name
 * @returns {Object} - Object with data-testid prop
 */
export const sliderTestId = (paramName) => {
  return { 'data-testid': `${paramName}-slider` };
};

/**
 * Prop generator for button test IDs
 * 
 * @param {string} actionName - Action name
 * @returns {Object} - Object with data-testid prop
 */
export const buttonTestId = (actionName) => {
  return { 'data-testid': `${actionName}-button` };
};

/**
 * Prop generator for input test IDs
 * 
 * @param {string} inputName - Input name
 * @returns {Object} - Object with data-testid prop
 */
export const inputTestId = (inputName) => {
  return { 'data-testid': `${inputName}-input` };
};

/**
 * Prop generator for metric test IDs
 * 
 * @param {string} metricName - Metric name
 * @returns {Object} - Object with data-testid prop
 */
export const metricTestId = (metricName) => {
  return { 'data-testid': `${metricName}-metric` };
};

/**
 * Mock D3 select for testing
 * 
 * Creates a chainable mock object for D3 select methods
 * 
 * @returns {Object} - Mock D3 select object
 */
export const createMockD3Select = () => {
  const mockChain = {
    attr: jest.fn(() => mockChain),
    style: jest.fn(() => mockChain),
    append: jest.fn(() => mockChain),
    data: jest.fn(() => mockChain),
    enter: jest.fn(() => mockChain),
    exit: jest.fn(() => mockChain),
    remove: jest.fn(() => mockChain),
    selectAll: jest.fn(() => mockChain),
    text: jest.fn(() => mockChain),
    call: jest.fn(() => mockChain),
    on: jest.fn(() => mockChain),
    transition: jest.fn(() => mockChain),
    duration: jest.fn(() => mockChain),
  };
  
  return jest.fn(() => mockChain);
};

export default {
  withTestIds,
  getTestProps,
  testId,
  withTestId,
  sliderTestId,
  buttonTestId,
  inputTestId,
  metricTestId,
  createMockD3Select,
};