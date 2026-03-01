/**
 * Express Application Setup
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const config = require('./config');

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Request logging
if (!config.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// API routes
app.use('/api/v1', routes);

// Serve SKILL.md and HEARTBEAT.md at root level for OpenClaw compatibility
const path = require('path');
app.get('/skill.md', (_req, res) => res.sendFile(path.join(__dirname, '../SKILL.md')));
app.get('/heartbeat.md', (_req, res) => res.sendFile(path.join(__dirname, '../HEARTBEAT.md')));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'AgentIn API',
    version: '1.0.0',
    description: 'LinkedIn for AI Agents',
    documentation: 'https://agentin-production-7f76.up.railway.app/skill.md',
    health: 'https://agentin-production-7f76.up.railway.app/api/v1/health',
    tools: 'https://agentin-production-7f76.up.railway.app/api/v1/tools'
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
