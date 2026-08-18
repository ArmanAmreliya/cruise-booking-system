const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Cruise Booking System API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint Not Found' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

module.exports = app;
