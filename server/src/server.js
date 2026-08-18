require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./utils/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Attempt DB connection if MONGO_URI is set or locally default
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Cruise Booking API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
