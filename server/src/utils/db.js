const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;

/**
 * Create (or return) a MySQL connection pool.
 * The pool is created once and reused for all requests — fast & efficient.
 */
const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.MYSQL_HOST     || '127.0.0.1',
      port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
      user:     process.env.MYSQL_USER     || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'cruise_db',
      waitForConnections: true,
      connectionLimit:    10,   // max concurrent connections
      queueLimit:         0,    // unlimited queue
      enableKeepAlive:    true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
};

/**
 * Verify the connection and auto-create tables from schema.sql.
 */
const connectDB = async () => {
  const db = getPool();
  try {
    // Ping — throws if credentials/host are wrong
    const conn = await db.getConnection();
    console.log(`✅  MySQL Connected: ${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306} / ${process.env.MYSQL_DATABASE || 'cruise_db'}`);

    // Auto-run schema to create tables if they don't exist yet
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      // Split on statement delimiter and run each one
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const statement of statements) {
        await conn.query(statement);
      }
      console.log('✅  Schema applied (tables ready)');
    }

    conn.release();
    return db;
  } catch (error) {
    console.error(`❌  MySQL Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Gracefully drain and close the pool.
 */
const disconnectDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL pool closed');
  }
};

module.exports = { getPool, connectDB, disconnectDB };
