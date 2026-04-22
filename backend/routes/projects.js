// ============================================================
// ROUTES: Projects - Quản lý dự án
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Helper: generate project code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PRJ-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET /api/projects - Danh sách dự án của user
router.get('/', auth, async (req, res) => {
  try {
    const [projects] = await db.query(`
      SELECT p.*, u.full_name as manager_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.manager_id = u.id
      WHERE p.manager_id = ? OR p.id IN (
        SELECT project_id FROM project_members WHERE user_id = ?
      )
      ORDER BY p.created_at DESC
    `, [req.user.id, req.user.id]);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - Tạo dự án mới
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, startDate, endDate, budget } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên dự án là bắt buộc' });

    // Generate unique code
    let code, exists = true;
    while (exists) {
      code = generateCode();
      const [r] = await db.query('SELECT id FROM projects WHERE code = ?', [code]);
      exists = r.length > 0;
    }

    const [result] = await db.query(
      'INSERT INTO projects (code, name, description, manager_id, start_date, end_date, budget) VALUES (?,?,?,?,?,?,?)',
      [code, name, description || null, req.user.id, startDate || null, endDate || null, budget || 0]
    );

    // Auto-join as manager
    await db.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?)',
      [result.insertId, req.user.id, 'manager']);

    // Create default project settings
    await db.query('INSERT INTO project_settings (project_id, overhead_rate) VALUES (?,?)', [result.insertId, 15]);

    const [proj] = await db.query(`
      SELECT p.*, u.full_name as manager_name FROM projects p
      JOIN users u ON p.manager_id = u.id WHERE p.id = ?
    `, [result.insertId]);
    res.status(201).json(proj[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/join - Tham gia dự án bằng mã  ← MUST be before /:code
router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã dự án' });

    const [projects] = await db.query('SELECT * FROM projects WHERE code = ?', [code.toUpperCase()]);
    if (!projects[0]) return res.status(404).json({ error: 'Mã dự án không hợp lệ' });

    const project = projects[0];
    if (project.manager_id === req.user.id)
      return res.status(400).json({ error: 'Bạn là trưởng dự án này' });

    const [existing] = await db.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [project.id, req.user.id]
    );
    if (existing[0]) return res.status(400).json({ error: 'Bạn đã là thành viên dự án này' });

    await db.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?)',
      [project.id, req.user.id, 'member']);

    res.json({ message: 'Tham gia dự án thành công!', project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:code - Chi tiết dự án
router.get('/:code', auth, async (req, res) => {
  try {
    const [projects] = await db.query(`
      SELECT p.*, u.full_name as manager_name FROM projects p
      JOIN users u ON p.manager_id = u.id WHERE p.code = ?
    `, [req.params.code.toUpperCase()]);

    if (!projects[0]) return res.status(404).json({ error: 'Dự án không tồn tại' });
    const project = projects[0];

    // Check access
    const [access] = await db.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [project.id, req.user.id]
    );
    if (!access[0] && project.manager_id !== req.user.id)
      return res.status(403).json({ error: 'Bạn không có quyền truy cập dự án này' });

    // Get members
    const [members] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email, pm.role
      FROM project_members pm JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [project.id]);

    res.json({ ...project, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:code - Cập nhật dự án
router.put('/:code', auth, async (req, res) => {
  try {
    const [projects] = await db.query('SELECT * FROM projects WHERE code = ?', [req.params.code.toUpperCase()]);
    if (!projects[0]) return res.status(404).json({ error: 'Dự án không tồn tại' });
    if (projects[0].manager_id !== req.user.id)
      return res.status(403).json({ error: 'Chỉ trưởng dự án mới được cập nhật' });

    const { name, description, startDate, endDate, budget, status } = req.body;
    await db.query(
      'UPDATE projects SET name=?, description=?, start_date=?, end_date=?, budget=?, status=? WHERE code=?',
      [name, description || null, startDate || null, endDate || null, budget || 0, status || 'active', req.params.code.toUpperCase()]
    );
    const [updated] = await db.query('SELECT p.*, u.full_name as manager_name FROM projects p JOIN users u ON p.manager_id = u.id WHERE p.code = ?', [req.params.code.toUpperCase()]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:code - Xóa dự án (chỉ trưởng dự án)
router.delete('/:code', auth, async (req, res) => {
  try {
    const [projects] = await db.query('SELECT * FROM projects WHERE code = ?', [req.params.code.toUpperCase()]);
    if (!projects[0]) return res.status(404).json({ error: 'Dự án không tồn tại' });
    if (projects[0].manager_id !== req.user.id)
      return res.status(403).json({ error: 'Chỉ trưởng dự án mới được xóa' });

    const projectId = projects[0].id;
    // Xóa toàn bộ dữ liệu liên quan
    await db.query('DELETE FROM tasks WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM project_members WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM milestones WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM task_schedules WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM expert_estimations WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM cost_items WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM project_settings WHERE project_id = ?', [projectId]);
    await db.query('DELETE FROM projects WHERE id = ?', [projectId]);

    res.json({ message: 'Đã xóa dự án thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:code/members - Danh sách thành viên
router.get('/:code/members', auth, async (req, res) => {
  try {
    const [projects] = await db.query('SELECT id FROM projects WHERE code = ?', [req.params.code.toUpperCase()]);
    if (!projects[0]) return res.status(404).json({ error: 'Dự án không tồn tại' });
    const [members] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email, pm.role
      FROM project_members pm JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [projects[0].id]);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
