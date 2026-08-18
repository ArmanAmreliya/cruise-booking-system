const { getPool } = require('../utils/db');

const getServices = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM optional_services');
    
    // Map database columns to camelCase for the frontend
    const services = rows.map(row => ({
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      billingModel: row.billing_model,
      description: row.description,
    }));

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

module.exports = {
  getServices,
};
