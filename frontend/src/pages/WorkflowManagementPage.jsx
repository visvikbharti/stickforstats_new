import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  WorkflowList, 
  WorkflowDetail, 
  WorkflowStepForm, 
  WorkflowExecution, 
  WorkflowImportExport 
} from '../components/workflow';
import { Container } from '@mui/material';

/**
 * Workflow Management Page
 * 
 * Container component that handles routing for workflow management components
 */
const WorkflowManagementPage = () => {
  return (
    <Container maxWidth="xl">
      <Routes>
        {/* Workflow List */}
        <Route path="/" element={<WorkflowList />} />
        
        {/* Import/Export */}
        <Route path="/import-export" element={<WorkflowImportExport />} />
        
        {/* New Workflow (to be implemented) */}
        <Route path="/new" element={<div>Workflow Create Form</div>} />
        
        {/* Workflow Detail */}
        <Route path="/:workflowId" element={<WorkflowDetail />} />
        
        {/* Workflow Execution */}
        <Route path="/:workflowId/execution" element={<WorkflowExecution />} />
        
        {/* Add/Edit Step */}
        <Route path="/:workflowId/steps/new" element={<WorkflowStepForm />} />
        <Route path="/:workflowId/steps/:stepId/edit" element={<WorkflowStepForm />} />
        
        {/* Step Results (to be implemented) */}
        <Route path="/:workflowId/steps/:stepId/results" element={<div>Step Results Page</div>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/workflows" replace />} />
      </Routes>
    </Container>
  );
};

export default WorkflowManagementPage;