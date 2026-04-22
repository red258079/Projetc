
const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

// Helper: parse JSON safely (tránh lỗi "Unexpected end of JSON input")
function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// Helper: get project by code with access check
async function getProject(code, userId) {
  const [rows] = await db.query('SELECT * FROM projects WHERE code = ?', [code.toUpperCase()]);
  if (!rows[0]) throw { status: 404, message: 'Dự án không tồn tại' };
  const [access] = await db.query(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
    [rows[0].id, userId]
  );
  if (!access[0] && rows[0].manager_id !== userId)
    throw { status: 403, message: 'Bạn không có quyền truy cập dự án này' };
  return rows[0];
}

// ── TASKS (Bảng công việc) ──────────────────────────────────

// GET /api/projects/:code/tasks
router.get('/:code/tasks', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const [tasks] = await db.query('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC', [project.id]);
    res.json(tasks);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/projects/:code/tasks
router.post('/:code/tasks', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { title, description, assignee, status, priority, progress, startDate, endDate, estimatedHours, parentId, wbsId } = req.body;
    if (!title) return res.status(400).json({ error: 'Tên công việc là bắt buộc' });
    const [result] = await db.query(
      `INSERT INTO tasks (project_id, parent_id, wbs_id, title, description, assignee, status, priority, progress, start_date, end_date, estimated_hours)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [project.id, parentId || null, wbsId || null, title, description || null, assignee || null,
       status || 'todo', priority || 'medium', progress || 0, startDate ? String(startDate).substring(0, 10) : null, endDate ? String(endDate).substring(0, 10) : null, estimatedHours || 0]
    );
    const [task] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(task[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /api/projects/:code/tasks/:id
router.put('/:code/tasks/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { title, description, assignee, status, priority, progress, startDate, endDate, estimatedHours } = req.body;
    await db.query(
      `UPDATE tasks SET title=?, description=?, assignee=?, status=?, priority=?, progress=?, 
       start_date=?, end_date=?, estimated_hours=? WHERE id=? AND project_id=?`,
      [title, description || null, assignee || null, status, priority, progress || 0,
       startDate ? String(startDate).substring(0, 10) : null, endDate ? String(endDate).substring(0, 10) : null, estimatedHours || 0, req.params.id, project.id]
    );
    const [task] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(task[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /api/projects/:code/tasks/:id
router.delete('/:code/tasks/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    // Delete children first
    await db.query('DELETE FROM tasks WHERE parent_id = ? AND project_id = ?', [req.params.id, project.id]);
    await db.query('DELETE FROM tasks WHERE id = ? AND project_id = ?', [req.params.id, project.id]);
    res.json({ message: 'Đã xóa công việc' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── EXPERT ESTIMATION ──────────────────────────────────────

// GET /api/projects/:code/estimations
router.get('/:code/estimations', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const [items] = await db.query('SELECT * FROM expert_estimations WHERE project_id = ? ORDER BY created_at ASC', [project.id]);
    const mapped = items.map(i => ({
      ...i,
      taskName: i.task_name,
      optimistic: parseFloat(i.optimistic),
      mostLikely: parseFloat(i.most_likely),
      pessimistic: parseFloat(i.pessimistic),
      expected: parseFloat(i.expected_time),
      stdDev: parseFloat(i.std_dev),
      variance: parseFloat(i.variance),
      unit: i.time_unit,
      note: i.note || ''
    }));
    res.json(mapped);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});


// POST /api/projects/:code/estimations
router.post('/:code/estimations', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { taskName, optimistic, mostLikely, pessimistic, unit, note } = req.body;
    if (!taskName || optimistic == null || mostLikely == null || pessimistic == null)
      return res.status(400).json({ error: 'Thiếu thông tin ước lượng' });
    const O = parseFloat(optimistic), M = parseFloat(mostLikely), P = parseFloat(pessimistic);
    if (O > M || M > P) return res.status(400).json({ error: 'Phải có O ≤ M ≤ P' });
    const [result] = await db.query(
      'INSERT INTO expert_estimations (project_id, task_name, optimistic, most_likely, pessimistic, time_unit, note) VALUES (?,?,?,?,?,?,?)',
      [project.id, taskName, O, M, P, unit || 'ngày', note || null]
    );
    const [item] = await db.query('SELECT * FROM expert_estimations WHERE id = ?', [result.insertId]);
    const i = item[0];
    res.status(201).json({
      ...i, taskName: i.task_name, mostLikely: i.most_likely, expected: i.expected_time, stdDev: i.std_dev, unit: i.time_unit
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /api/projects/:code/estimations/:id
router.put('/:code/estimations/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { taskName, optimistic, mostLikely, pessimistic, unit, note } = req.body;
    const O = parseFloat(optimistic), M = parseFloat(mostLikely), P = parseFloat(pessimistic);
    await db.query(
      'UPDATE expert_estimations SET task_name=?, optimistic=?, most_likely=?, pessimistic=?, time_unit=?, note=? WHERE id=? AND project_id=?',
      [taskName, O, M, P, unit || 'ngày', note || null, req.params.id, project.id]
    );
    const [item] = await db.query('SELECT * FROM expert_estimations WHERE id = ?', [req.params.id]);
    const i = item[0];
    res.json({ ...i, taskName: i.task_name, mostLikely: i.most_likely, expected: i.expected_time, stdDev: i.std_dev, unit: i.time_unit });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /api/projects/:code/estimations/:id
router.delete('/:code/estimations/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    await db.query('DELETE FROM expert_estimations WHERE id = ? AND project_id = ?', [req.params.id, project.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── COST ESTIMATION ────────────────────────────────────────

// GET /api/projects/:code/costs
router.get('/:code/costs', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const [items] = await db.query('SELECT * FROM cost_items WHERE project_id = ? ORDER BY category, created_at ASC', [project.id]);
    const [settings] = await db.query('SELECT overhead_rate FROM project_settings WHERE project_id = ?', [project.id]);
    const overheadRate = settings[0]?.overhead_rate || 15;
    const mapped = items.map(i => ({
      ...i,
      unitPrice: parseFloat(i.unit_price),
      quantity: parseFloat(i.quantity),
      total: parseFloat(i.quantity) * parseFloat(i.unit_price)
    }));
    res.json({ items: mapped, overheadRate });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/projects/:code/costs
router.post('/:code/costs', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { category, name, unit, quantity, unitPrice, note } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên khoản chi là bắt buộc' });
    const [result] = await db.query(
      'INSERT INTO cost_items (project_id, category, name, unit, quantity, unit_price, note) VALUES (?,?,?,?,?,?,?)',
      [project.id, category || 'labor', name, unit || '', parseFloat(quantity) || 0, parseInt(unitPrice) || 0, note || null]
    );
    const [item] = await db.query('SELECT * FROM cost_items WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...item[0], unitPrice: item[0].unit_price });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /api/projects/:code/costs/:id
router.put('/:code/costs/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { category, name, unit, quantity, unitPrice, note } = req.body;
    await db.query(
      'UPDATE cost_items SET category=?, name=?, unit=?, quantity=?, unit_price=?, note=? WHERE id=? AND project_id=?',
      [category, name, unit || '', parseFloat(quantity) || 0, parseInt(unitPrice) || 0, note || null, req.params.id, project.id]
    );
    const [item] = await db.query('SELECT * FROM cost_items WHERE id = ?', [req.params.id]);
    res.json({ ...item[0], unitPrice: item[0].unit_price });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /api/projects/:code/costs/:id
router.delete('/:code/costs/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    await db.query('DELETE FROM cost_items WHERE id = ? AND project_id = ?', [req.params.id, project.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /api/projects/:code/costs/overhead - Cập nhật overhead
router.put('/:code/costs/overhead/rate', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { rate } = req.body;
    await db.query(
      'INSERT INTO project_settings (project_id, overhead_rate) VALUES (?,?) ON DUPLICATE KEY UPDATE overhead_rate=?',
      [project.id, rate || 15, rate || 15]
    );
    res.json({ overheadRate: rate });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── MILESTONES ─────────────────────────────────────────────

// GET /api/projects/:code/milestones
router.get('/:code/milestones', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    // Auto-update overdue
    await db.query(
      "UPDATE milestones SET status='overdue' WHERE project_id=? AND status='pending' AND due_date < CURDATE()",
      [project.id]
    );
    const [items] = await db.query('SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC', [project.id]);
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/projects/:code/milestones
router.post('/:code/milestones', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { title, description, dueDate, status, color } = req.body;
    if (!title || !dueDate) return res.status(400).json({ error: 'Tên và ngày hạn là bắt buộc' });
    const [result] = await db.query(
      'INSERT INTO milestones (project_id, title, description, due_date, status, color) VALUES (?,?,?,?,?,?)',
      [project.id, title, description || null, dueDate ? String(dueDate).substring(0, 10) : null, status || 'pending', color || '#7c3aed']
    );
    const [item] = await db.query('SELECT * FROM milestones WHERE id = ?', [result.insertId]);
    res.status(201).json(item[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /api/projects/:code/milestones/:id
router.put('/:code/milestones/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { title, description, dueDate, status, color } = req.body;
    await db.query(
      'UPDATE milestones SET title=?, description=?, due_date=?, status=?, color=? WHERE id=? AND project_id=?',
      [title, description || null, dueDate ? String(dueDate).substring(0, 10) : null, status, color || '#7c3aed', req.params.id, project.id]
    );
    const [item] = await db.query('SELECT * FROM milestones WHERE id = ?', [req.params.id]);
    res.json(item[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /api/projects/:code/milestones/:id
router.delete('/:code/milestones/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    await db.query('DELETE FROM milestones WHERE id = ? AND project_id = ?', [req.params.id, project.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── TASK SCHEDULES (Gantt) ─────────────────────────────────

// GET /api/projects/:code/schedules
router.get('/:code/schedules', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const [items] = await db.query('SELECT * FROM task_schedules WHERE project_id = ? ORDER BY start_date ASC', [project.id]);
    const mapped = items.map(i => ({
      ...i, taskName: i.task_name, isCritical: !!i.is_critical,
      dependencies: safeJsonParse(i.dependencies)
    }));
    res.json(mapped);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/projects/:code/schedules
router.post('/:code/schedules', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { taskName, assignee, startDate, endDate, progress, isCritical, dependencies, color } = req.body;
    if (!taskName || !startDate || !endDate) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    const [result] = await db.query(
      'INSERT INTO task_schedules (project_id, task_name, assignee, start_date, end_date, progress, is_critical, dependencies, color) VALUES (?,?,?,?,?,?,?,?,?)',
      [project.id, taskName, assignee || null, startDate ? String(startDate).substring(0, 10) : null, endDate ? String(endDate).substring(0, 10) : null, progress || 0, isCritical ? 1 : 0,
       JSON.stringify(dependencies || []), color || null]
    );
    const [item] = await db.query('SELECT * FROM task_schedules WHERE id = ?', [result.insertId]);
    const i = item[0];
    res.status(201).json({ ...i, taskName: i.task_name, isCritical: !!i.is_critical, dependencies: safeJsonParse(i.dependencies) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /api/projects/:code/schedules/:id
router.put('/:code/schedules/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    const { taskName, assignee, startDate, endDate, progress, isCritical, dependencies, color } = req.body;
    await db.query(
      'UPDATE task_schedules SET task_name=?, assignee=?, start_date=?, end_date=?, progress=?, is_critical=?, dependencies=?, color=? WHERE id=? AND project_id=?',
      [taskName, assignee || null, startDate ? String(startDate).substring(0, 10) : null, endDate ? String(endDate).substring(0, 10) : null, progress || 0, isCritical ? 1 : 0,
       JSON.stringify(dependencies || []), color || null, req.params.id, project.id]
    );
    const [item] = await db.query('SELECT * FROM task_schedules WHERE id = ?', [req.params.id]);
    const i = item[0];
    res.json({ ...i, taskName: i.task_name, isCritical: !!i.is_critical, dependencies: safeJsonParse(i.dependencies) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /api/projects/:code/schedules/:id
router.delete('/:code/schedules/:id', auth, async (req, res) => {
  try {
    const project = await getProject(req.params.code, req.user.id);
    await db.query('DELETE FROM task_schedules WHERE id = ? AND project_id = ?', [req.params.id, project.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
