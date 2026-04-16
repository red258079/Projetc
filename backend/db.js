// ============================================================
// DATABASE CONNECTION - MySQL via Laragon
// ============================================================
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quan_ly_du_an',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: process.env.DB_HOST?.includes('aivencloud.com') ? { rejectUnauthorized: false } : undefined
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log(' Kết nối MySQL thành công!');
    conn.release();
  })
  .catch(err => {
    console.error(' Lỗi kết nối MySQL:', err.message);
    console.error(' Hãy đảm bảo Laragon đang chạy và database "quan_ly_du_an" đã được tạo');
  });

module.exports = pool;
