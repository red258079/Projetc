
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();



const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request Logger ──
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    if (originalUrl.startsWith('/api') && status >= 400) {
      const color = status >= 500 ? '\x1b[31m' : '\x1b[33m'; // đỏ=500, vàng=400
      console.log(`${color}[ERROR] ${method} ${originalUrl} → ${status} (${ms}ms)\x1b[0m`);
    }
  });
  next();
});

// ── Serve static frontend ──
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/projects', require('./routes/data'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server đang chạy!', time: new Date().toISOString() });
});

app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// ── Start Server ──
app.listen(PORT, async () => {
  console.log('');
  console.log('');
  console.log('ProjectManager Pro - Server đang chạy!       ');
  console.log(`Truy cập: http://localhost:${PORT}`);
  console.log('Database: MySQL (Laragon)');
  console.log('');
  console.log('');

});

module.exports = app;
