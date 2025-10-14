/**
 * StickForStats API Documentation Configuration
 * Swagger UI Setup for Interactive API Documentation
 *
 * @module swagger-config
 * @requires swagger-ui-express
 * @requires yamljs
 */

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load OpenAPI specification
const openApiDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));

// Swagger UI configuration options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar {
      display: none;
    }
    .swagger-ui {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .swagger-ui .info .title {
      color: #2196F3;
    }
    .swagger-ui .btn.authorize {
      background-color: #4CAF50;
      border-color: #4CAF50;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #45a049;
      border-color: #45a049;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #49cc90;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #61affe;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #fca130;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #f93e3e;
    }
    .swagger-ui select {
      padding: 5px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .swagger-ui .scheme-container {
      background: #f7f7f7;
      padding: 15px;
      border-radius: 4px;
    }
    .swagger-ui .responses-inner h4 {
      color: #2196F3;
    }
    .swagger-ui table tbody tr td {
      padding: 10px;
    }
    .swagger-ui .parameter__name.required::after {
      content: " *";
      color: #f93e3e;
    }
    .swagger-ui .model-title {
      color: #2196F3;
    }
  `,
  customSiteTitle: 'StickForStats API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    displayOperationId: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    },
    requestInterceptor: (request) => {
      // Add timestamp to requests for debugging
      request.headers['X-Request-Time'] = new Date().toISOString();
      return request;
    },
    responseInterceptor: (response) => {
      // Log response times for monitoring
      if (response.headers && response.headers['x-response-time']) {
        console.log(`API Response Time: ${response.headers['x-response-time']}ms`);
      }
      return response;
    },
    onComplete: () => {
      console.log('Swagger UI loaded successfully');
    },
    preauthorizeApiKey: (authDefinitionKey, apiKeyValue) => {
      // Pre-authorize with API key if available
      if (process.env.NODE_ENV === 'development') {
        return process.env.DEV_API_KEY || '';
      }
      return '';
    },
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 2,
    defaultModelRendering: 'model',
    showMutatedRequest: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null // Disable spec validation for performance
  },
  explorer: true,
  customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.1/themes/3.x/theme-material.css'
};

// Express middleware setup
const setupSwagger = (app) => {
  // Serve Swagger UI at /api-docs
  app.use('/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, swaggerOptions)
  );

  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiDocument);
  });

  // Serve OpenAPI spec as YAML
  app.get('/api-docs.yaml', (req, res) => {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.sendFile(path.join(__dirname, 'openapi.yaml'));
  });

  // Redirect root to API docs
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  console.log('📚 API Documentation available at: /api-docs');
  console.log('📄 OpenAPI Spec (JSON): /api-docs.json');
  console.log('📄 OpenAPI Spec (YAML): /api-docs.yaml');
};

// Postman collection generator
const generatePostmanCollection = () => {
  const collection = {
    info: {
      name: 'StickForStats API',
      description: openApiDocument.info.description,
      version: openApiDocument.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{access_token}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'baseUrl',
        value: openApiDocument.servers[0].url,
        type: 'string'
      },
      {
        key: 'access_token',
        value: '',
        type: 'string'
      },
      {
        key: 'refresh_token',
        value: '',
        type: 'string'
      }
    ],
    item: []
  };

  // Convert OpenAPI paths to Postman requests
  Object.entries(openApiDocument.paths).forEach(([path, methods]) => {
    const folder = {
      name: path,
      item: []
    };

    Object.entries(methods).forEach(([method, operation]) => {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const request = {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [],
            url: {
              raw: '{{baseUrl}}' + path,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(Boolean)
            },
            description: operation.description || ''
          }
        };

        // Add request body if present
        if (operation.requestBody) {
          const content = operation.requestBody.content['application/json'];
          if (content && content.schema) {
            request.request.body = {
              mode: 'raw',
              raw: JSON.stringify(
                content.examples ?
                  Object.values(content.examples)[0].value :
                  generateExampleFromSchema(content.schema),
                null,
                2
              ),
              options: {
                raw: {
                  language: 'json'
                }
              }
            };
            request.request.header.push({
              key: 'Content-Type',
              value: 'application/json'
            });
          }
        }

        // Add query parameters
        if (operation.parameters) {
          const queryParams = operation.parameters
            .filter(param => param.in === 'query')
            .map(param => ({
              key: param.name,
              value: param.example || '',
              description: param.description || ''
            }));

          if (queryParams.length > 0) {
            request.request.url.query = queryParams;
          }
        }

        folder.item.push(request);
      }
    });

    if (folder.item.length > 0) {
      collection.item.push(folder);
    }
  });

  return collection;
};

// Helper function to generate example from schema
const generateExampleFromSchema = (schema) => {
  if (!schema) return {};

  if (schema.$ref) {
    const refPath = schema.$ref.split('/').pop();
    if (openApiDocument.components.schemas[refPath]) {
      return generateExampleFromSchema(openApiDocument.components.schemas[refPath]);
    }
  }

  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (prop.example !== undefined) {
        example[key] = prop.example;
      } else if (prop.type === 'string') {
        example[key] = prop.format === 'email' ? 'user@example.com' :
                       prop.format === 'date-time' ? new Date().toISOString() :
                       prop.format === 'uuid' ? 'f47ac10b-58cc-4372-a567-0e02b2c3d479' :
                       'string';
      } else if (prop.type === 'number' || prop.type === 'integer') {
        example[key] = prop.minimum || 0;
      } else if (prop.type === 'boolean') {
        example[key] = false;
      } else if (prop.type === 'array') {
        example[key] = [];
      } else if (prop.type === 'object') {
        example[key] = generateExampleFromSchema(prop);
      }
    });
    return example;
  }

  return {};
};

// Export Postman collection endpoint
const setupPostmanExport = (app) => {
  app.get('/api-docs/postman', (req, res) => {
    const collection = generatePostmanCollection();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="stickforstats-api.postman_collection.json"');
    res.send(JSON.stringify(collection, null, 2));
  });

  console.log('🚀 Postman Collection available at: /api-docs/postman');
};

// API documentation metrics
const setupDocMetrics = (app) => {
  let metrics = {
    visits: 0,
    downloads: {
      json: 0,
      yaml: 0,
      postman: 0
    },
    lastAccessed: null
  };

  // Track documentation access
  app.use('/api-docs*', (req, res, next) => {
    metrics.visits++;
    metrics.lastAccessed = new Date().toISOString();

    if (req.path.endsWith('.json')) {
      metrics.downloads.json++;
    } else if (req.path.endsWith('.yaml')) {
      metrics.downloads.yaml++;
    } else if (req.path.includes('postman')) {
      metrics.downloads.postman++;
    }

    next();
  });

  // Metrics endpoint
  app.get('/api-docs/metrics', (req, res) => {
    res.json(metrics);
  });

  console.log('📊 Documentation metrics available at: /api-docs/metrics');
};

// Main setup function
const setupApiDocumentation = (app) => {
  setupSwagger(app);
  setupPostmanExport(app);
  setupDocMetrics(app);

  console.log('✅ API Documentation setup complete');
};

module.exports = {
  setupApiDocumentation,
  openApiDocument,
  generatePostmanCollection
};