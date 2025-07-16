const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./swagger-definition');
const config = require('./src/config/app.config');
const apiRoutes = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/error.middleware');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "NodeJS PDF Service API"
}));

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'NodeJS PDF Service API',
    version: config.service.version,
    description: config.service.description,
    documentation: '/api-docs',
    health: '/api/health',
    features: config.service.features
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  console.log(`🚀 ${config.service.name} uruchomiony na http://${HOST}:${PORT}`);
  console.log(`📖 Dokumentacja API: http://${HOST}:${PORT}/api-docs`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/api/health`);
});

module.exports = app; 