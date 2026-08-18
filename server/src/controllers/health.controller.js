const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Cruise Booking System API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
};

module.exports = {
  getHealthStatus,
};
