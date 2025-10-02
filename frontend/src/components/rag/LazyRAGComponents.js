import { lazy } from 'react';

// Lazy load all RAG components for better performance
export const LazyQueryInterface = lazy(() => 
  import('./QueryInterface' /* webpackChunkName: "rag-query-interface" */)
);

export const LazySourcesExplorer = lazy(() => 
  import('./SourcesExplorer' /* webpackChunkName: "rag-sources-explorer" */)
);

export const LazyConversationHistory = lazy(() => 
  import('./ConversationHistory' /* webpackChunkName: "rag-conversation-history" */)
);

export const LazyRAGDashboard = lazy(() => 
  import('./RAGDashboard' /* webpackChunkName: "rag-dashboard" */)
);

export const LazyRAGPerformanceDashboard = lazy(() => 
  import('./RAGPerformanceDashboard' /* webpackChunkName: "rag-performance-dashboard" */)
);

export const LazyRAGPerformanceMonitorDashboard = lazy(() => 
  import('./RAGPerformanceMonitorDashboard' /* webpackChunkName: "rag-performance-monitor" */)
);

export const LazyRAGWebSocketMonitor = lazy(() => 
  import('./RAGWebSocketMonitor' /* webpackChunkName: "rag-websocket-monitor" */)
);

export const LazyRAGWebSocketStatus = lazy(() => 
  import('./RAGWebSocketStatus' /* webpackChunkName: "rag-websocket-status" */)
);

// Export a loading component for use with Suspense
export const RAGLoadingComponent = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '1.2rem',
    color: '#666'
  }}>
    Loading RAG components...
  </div>
);