/**
 * Validation System Backend Routes
 * API endpoints for audit logs, metrics, and compliance data
 *
 * @module validationRoutes
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');
const ValidationController = require('../controllers/validationController');

// Initialize controller
const validationController = new ValidationController();

/**
 * @route POST /api/validation/audit-logs
 * @desc Store audit log entries
 * @access Private
 */
router.post('/audit-logs',
  authenticateToken,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('entries').isArray().withMessage('Entries must be an array'),
    body('entries.*.action').notEmpty().withMessage('Action is required'),
    body('entries.*.timestamp').isNumeric().withMessage('Valid timestamp required'),
    body('metadata').isObject().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await validationController.storeAuditLogs(req.body, req.user);
      res.json({
        success: true,
        stored: result.stored,
        failed: result.failed,
        syncId: result.syncId
      });
    } catch (error) {
      console.error('Error storing audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to store audit logs'
      });
    }
  }
);

/**
 * @route GET /api/validation/audit-logs
 * @desc Retrieve audit log entries
 * @access Private (Admin/Auditor)
 */
router.get('/audit-logs',
  authenticateToken,
  authorizeRoles(['admin', 'auditor']),
  [
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional(),
    query('limit').isInt({ min: 1, max: 1000 }).optional(),
    query('offset').isInt({ min: 0 }).optional(),
    query('level').isIn(['info', 'warning', 'error', 'success', 'security']).optional(),
    query('module').isString().optional(),
    query('userId').isString().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const logs = await validationController.getAuditLogs(req.query);
      res.json({
        success: true,
        logs: logs.entries,
        total: logs.total,
        filtered: logs.filtered
      });
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs'
      });
    }
  }
);

/**
 * @route POST /api/validation/metrics
 * @desc Store validation metrics
 * @access Private
 */
router.post('/metrics',
  authenticateToken,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('metrics').isArray().withMessage('Metrics must be an array'),
    body('aggregates').isObject().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await validationController.storeMetrics(req.body, req.user);
      res.json({
        success: true,
        stored: result.stored,
        aggregated: result.aggregated
      });
    } catch (error) {
      console.error('Error storing metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to store metrics'
      });
    }
  }
);

/**
 * @route GET /api/validation/metrics
 * @desc Get validation metrics
 * @access Private (Admin)
 */
router.get('/metrics',
  authenticateToken,
  authorizeRoles(['admin']),
  [
    query('timeRange').isIn(['1h', '24h', '7d', '30d']).optional(),
    query('groupBy').isIn(['hour', 'day', 'week']).optional(),
    query('module').isString().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const metrics = await validationController.getMetrics(req.query);
      res.json({
        success: true,
        metrics: metrics.data,
        summary: metrics.summary,
        timeSeries: metrics.timeSeries
      });
    } catch (error) {
      console.error('Error retrieving metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  }
);

/**
 * @route POST /api/validation/compliance
 * @desc Update compliance status
 * @access Private
 */
router.post('/compliance',
  authenticateToken,
  [
    body('auditTrailActive').isBoolean(),
    body('digitalSignaturesEnabled').isBoolean(),
    body('dataIntegrityVerified').isBoolean(),
    body('retentionPolicyEnforced').isBoolean(),
    body('accessControlConfigured').isBoolean(),
    body('complianceScore').isInt({ min: 0, max: 100 }).optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await validationController.updateComplianceStatus(req.body, req.user);
      res.json({
        success: true,
        updated: result.updated,
        complianceId: result.complianceId
      });
    } catch (error) {
      console.error('Error updating compliance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update compliance status'
      });
    }
  }
);

/**
 * @route GET /api/validation/compliance
 * @desc Get compliance status
 * @access Private (Admin/Auditor)
 */
router.get('/compliance',
  authenticateToken,
  authorizeRoles(['admin', 'auditor']),
  async (req, res) => {
    try {
      const compliance = await validationController.getComplianceStatus();
      res.json({
        success: true,
        compliance: compliance.current,
        history: compliance.history,
        nextAudit: compliance.nextAudit
      });
    } catch (error) {
      console.error('Error retrieving compliance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve compliance status'
      });
    }
  }
);

/**
 * @route GET /api/validation/export
 * @desc Export validation data
 * @access Private (Admin/Auditor)
 */
router.get('/export',
  authenticateToken,
  authorizeRoles(['admin', 'auditor']),
  [
    query('type').isIn(['audit-logs', 'metrics', 'compliance', 'full']).notEmpty(),
    query('format').isIn(['json', 'csv', 'pdf']).optional(),
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const exportData = await validationController.exportData(req.query);

      // Set appropriate headers based on format
      const format = req.query.format || 'json';
      const filename = `validation-export-${Date.now()}.${format}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(exportData, null, 2));
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.send(exportData);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(exportData);
      }

    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }
);

/**
 * @route GET /api/validation/integrity-check
 * @desc Verify audit log integrity
 * @access Private (Admin/Auditor)
 */
router.get('/integrity-check',
  authenticateToken,
  authorizeRoles(['admin', 'auditor']),
  [
    query('startId').isString().optional(),
    query('endId').isString().optional(),
    query('deep').isBoolean().optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await validationController.verifyIntegrity(req.query);
      res.json({
        success: true,
        valid: result.valid,
        checked: result.checked,
        errors: result.errors,
        report: result.report
      });
    } catch (error) {
      console.error('Error verifying integrity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify integrity'
      });
    }
  }
);

/**
 * @route POST /api/validation/retention-cleanup
 * @desc Clean up old audit logs per retention policy
 * @access Private (Admin)
 */
router.post('/retention-cleanup',
  authenticateToken,
  authorizeRoles(['admin']),
  [
    body('dryRun').isBoolean().optional(),
    body('retentionDays').isInt({ min: 365 }).optional() // Minimum 1 year
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await validationController.performRetentionCleanup(req.body);
      res.json({
        success: true,
        cleaned: result.cleaned,
        archived: result.archived,
        dryRun: result.dryRun
      });
    } catch (error) {
      console.error('Error performing cleanup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform retention cleanup'
      });
    }
  }
);

/**
 * @route GET /api/validation/status
 * @desc Get validation system status
 * @access Private
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const status = await validationController.getSystemStatus();
      res.json({
        success: true,
        status: status.operational ? 'operational' : 'degraded',
        services: status.services,
        metrics: status.metrics,
        uptime: status.uptime
      });
    } catch (error) {
      console.error('Error getting status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system status'
      });
    }
  }
);

/**
 * @route POST /api/validation/signature/verify
 * @desc Verify digital signature
 * @access Private
 */
router.post('/signature/verify',
  authenticateToken,
  [
    body('data').notEmpty().withMessage('Data is required'),
    body('signature').notEmpty().withMessage('Signature is required'),
    body('publicKey').optional()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await validationController.verifySignature(req.body);
      res.json({
        success: true,
        valid: result.valid,
        signer: result.signer,
        timestamp: result.timestamp
      });
    } catch (error) {
      console.error('Error verifying signature:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify signature'
      });
    }
  }
);

/**
 * WebSocket endpoint for real-time sync
 */
router.ws('/sync', (ws, req) => {
  // Authenticate WebSocket connection
  const token = req.query.token || req.headers.authorization?.split(' ')[1];

  if (!token || !validationController.validateWebSocketToken(token)) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // Handle WebSocket messages
  ws.on('message', async (msg) => {
    try {
      const message = JSON.parse(msg);

      switch (message.type) {
        case 'AUTH':
          // Validate auth token
          const isValid = await validationController.validateWebSocketAuth(message.token);
          ws.send(JSON.stringify({
            type: 'AUTH_RESPONSE',
            authenticated: isValid
          }));
          break;

        case 'AUDIT_LOG':
          // Store audit log in real-time
          const result = await validationController.storeRealtimeAuditLog(message.payload);
          ws.send(JSON.stringify({
            type: 'SYNC_ACK',
            payload: { id: message.payload.id, stored: result.success }
          }));
          break;

        case 'METRICS':
          // Store metrics in real-time
          await validationController.storeRealtimeMetrics(message.payload);
          break;

        case 'PING':
          // Keep-alive
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;

        default:
          console.log('Unknown WebSocket message type:', message.type);
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Invalid message'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  // Send initial configuration
  ws.send(JSON.stringify({
    type: 'CONFIG',
    config: {
      syncInterval: 30000,
      batchSize: 100,
      compressionEnabled: true
    }
  }));
});

module.exports = router;