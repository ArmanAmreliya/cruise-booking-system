const { getPool } = require('../utils/db');

const getCruises = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM cruises');
    
    // Map database columns to camelCase for the frontend
    const cruises = rows.map(row => ({
      id: row.id,
      line: row.line,
      name: row.name,
      destination: row.destination,
      durationNights: row.duration_nights,
      baseAdultFare: parseFloat(row.base_adult_fare),
      capacity: row.capacity,
      availableSeats: row.available_seats,
    }));

    res.json(cruises);
  } catch (error) {
    console.error('Error fetching cruises:', error);
    res.status(500).json({ error: 'Failed to fetch cruises' });
  }
};

module.exports = {
  getCruises,
};
