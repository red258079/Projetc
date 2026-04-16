
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, email } = req.body;
    if (!username || !password || !fullName)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    if (username.length < 3)
      return res.status(400).json({ error: 'Tên đăng nhập tối thiểu 3 ký tự' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });

    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password, full_name, email) VALUES (?, ?, ?, ?)',
      [username.toLowerCase(), hashed, fullName, email || null]
    );

    const user = { id: result.insertId, username: username.toLowerCase(), fullName, email: email || '' };
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error('/register error:', err);
    res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });

    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: 'Mật khẩu không đúng' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, fullName: user.full_name, email: user.email }
    });
  } catch (err) {
    console.error('/login error:', err);
    res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, full_name, email FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy user' });
    const u = rows[0];
    res.json({ id: u.id, username: u.username, fullName: u.full_name, email: u.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
