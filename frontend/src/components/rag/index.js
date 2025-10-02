// Import regular components for backward compatibility
import RAGDashboard from './RAGDashboard';

// Export lazy-loaded components
export {
  LazyQueryInterface as QueryInterface,
  LazySourcesExplorer as SourcesExplorer,
  LazyConversationHistory as ConversationHistory,
  LazyRAGDashboard as RAGDashboard,
  LazyRAGPerformanceDashboard as RAGPerformanceDashboard,
  LazyRAGPerformanceMonitorDashboard as RAGPerformanceMonitorDashboard,
  LazyRAGWebSocketMonitor as RAGWebSocketMonitor,
  LazyRAGWebSocketStatus as RAGWebSocketStatus
} from './LazyRAGComponents';

// For direct imports like "import RAGDashboard from '...'"
export default RAGDashboard;