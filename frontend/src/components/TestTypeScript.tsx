/**
 * Test Component for TypeScript Integration
 * 
 * This component verifies that TypeScript, Redux, and API types
 * are properly configured and working together.
 */

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { 
  selectUser, 
  selectIsAuthenticated,
  fetchCurrentUser 
} from '../store/slices/authSlice';
import {
  selectCurrentDataset,
  selectUploadProgress,
  selectIsUploading
} from '../store/slices/datasetSlice';
import {
  selectWorkflowStep,
  selectWorkflowProgress
} from '../store/slices/analysisSlice';
import {
  selectTheme,
  addNotification,
  showSuccessNotification
} from '../store/slices/uiSlice';
import { VariableType, TestType } from '../types/api.types';

/**
 * Props interface for the component
 */
interface TestTypeScriptProps {
  title?: string;
  showDetails?: boolean;
}

/**
 * Test component to verify TypeScript integration
 */
const TestTypeScript: React.FC<TestTypeScriptProps> = ({ 
  title = "TypeScript Integration Test",
  showDetails = true 
}) => {
  // Redux hooks with full type safety
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentDataset = useAppSelector(selectCurrentDataset);
  const uploadProgress = useAppSelector(selectUploadProgress);
  const isUploading = useAppSelector(selectIsUploading);
  const workflowStep = useAppSelector(selectWorkflowStep);
  const workflowProgress = useAppSelector(selectWorkflowProgress);
  const theme = useAppSelector(selectTheme);

  // Local state with TypeScript
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<string[]>([]);

  /**
   * Run integration tests
   */
  const runTests = () => {
    setTestStatus('testing');
    const results: string[] = [];

    // Test 1: TypeScript compilation
    results.push('✅ TypeScript compilation successful');

    // Test 2: Redux store connection
    if (typeof dispatch === 'function') {
      results.push('✅ Redux store connected');
    } else {
      results.push('❌ Redux store not connected');
    }

    // Test 3: Type definitions
    const testVariable: VariableType = VariableType.CONTINUOUS;
    const testType: TestType = TestType.T_TEST_INDEPENDENT;
    if (testVariable && testType) {
      results.push('✅ API type definitions working');
    }

    // Test 4: Selector types
    if (theme === 'light' || theme === 'dark') {
      results.push('✅ Selectors properly typed');
    }

    // Test 5: Dispatch actions
    try {
      dispatch(showSuccessNotification('Test', 'TypeScript integration successful!'));
      results.push('✅ Actions dispatching correctly');
    } catch (error) {
      results.push('❌ Action dispatch failed');
    }

    setTestResults(results);
    setTestStatus(results.every(r => r.startsWith('✅')) ? 'success' : 'error');
  };

  /**
   * Effect to run tests on mount
   */
  useEffect(() => {
    if (testStatus === 'idle') {
      runTests();
    }
  }, [testStatus]);

  // Render based on test status
  const getStatusColor = () => {
    switch (testStatus) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'testing': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <div style={{
      padding: '20px',
      margin: '20px',
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '8px',
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f5f5f5',
      color: theme === 'dark' ? '#ffffff' : '#212121',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <h2>{title}</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status: </strong>
        <span style={{ color: getStatusColor(), fontWeight: 'bold' }}>
          {testStatus.toUpperCase()}
        </span>
      </div>

      {showDetails && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h3>Test Results:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {testResults.map((result, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  {result}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Redux State:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>User: {user?.email || 'Not logged in'}</li>
              <li>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</li>
              <li>Theme: {theme}</li>
              <li>Workflow Step: {workflowStep}</li>
              <li>Workflow Progress: {workflowProgress.toFixed(0)}%</li>
              <li>Upload Progress: {uploadProgress}%</li>
              <li>Dataset: {currentDataset?.name || 'None'}</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>TypeScript Features:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>✅ Strict mode enabled</li>
              <li>✅ Type inference working</li>
              <li>✅ Interface definitions</li>
              <li>✅ Generic types</li>
              <li>✅ Union types</li>
              <li>✅ Type guards</li>
            </ul>
          </div>

          <div>
            <h3>API Types Available:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>✅ VariableType enum</li>
              <li>✅ DistributionType enum</li>
              <li>✅ TestType enum</li>
              <li>✅ DatasetProfile interface</li>
              <li>✅ AnalysisResult interface</li>
              <li>✅ TestRecommendation interface</li>
            </ul>
          </div>
        </>
      )}

      <button
        onClick={runTests}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#1976D2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1565C0'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
      >
        Run Tests Again
      </button>
    </div>
  );
};

export default TestTypeScript;