const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const cruisesRoutes = require('./routes/cruises.routes');
const servicesRoutes = require('./routes/services.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const promotionsRoutes = require('./routes/promotions.routes');
const monitoringRoutes = require('./routes/monitoring.routes');

const monitoringMiddleware = require('./middleware/monitoring.middleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(monitoringMiddleware);

// Routes
app.use('/api', healthRoutes);
app.use('/api/cruises', cruisesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/monitoring', monitoringRoutes);

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
