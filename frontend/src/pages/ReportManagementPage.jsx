import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  ReportList, 
  ReportGenerator, 
  ReportViewer 
} from '../components/reports';
import { Container } from '@mui/material';

/**
 * Report Management Page
 * 
 * Container component that handles routing for report management components
 */
const ReportManagementPage = () => {
  return (
    <Container maxWidth="xl">
      <Routes>
        {/* Report List */}
        <Route path="/" element={<ReportList />} />
        
        {/* Report Generator */}
        <Route path="/new" element={<ReportGenerator />} />
        
        {/* Report Viewer */}
        <Route path="/:reportId" element={<ReportViewer />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/reports" replace />} />
      </Routes>
    </Container>
  );
};

export default ReportManagementPage;