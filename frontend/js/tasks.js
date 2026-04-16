// ============================================================
// CHỨC NĂNG 1: Quản lý Bảng Công Việc (Kanban + WBS)
// Author: Nguyễn Hữu Tình (Nhóm Trưởng)
// ============================================================

const TaskBoard = {
  currentView: 'kanban',
  draggedTask: null,
  _tasks: [],

  async render(projectCode) {
    if (!projectCode) return;
    const sectionEl = document.getElementById('section-content');
    sectionEl.innerHTML = `
      <div class="page-header">
        <div class="page-title">
          <h2>📋 Bảng Công Việc</h2>
          <p>Quản lý và theo dõi tiến độ công việc dự án</p>
        </div>
        <div class="page-actions">
          <div class="tabs" style="margin:0;border:none">
            <button class="tab ${this.currentView==='kanban'?'active':''}" onclick="TaskBoard.switchView('kanban')">🗂️ Kanban</button>
            <button class="tab ${this.currentView==='wbs'?'active':''}" onclick="TaskBoard.switchView('wbs')">📊 WBS Table</button>
          </div>
          <button class="btn btn-primary" onclick="TaskBoard.showAddModal()">➕ Thêm công việc</button>
        </div>
      </div>
      <div id="task-board-content"><div class="loading-spinner"></div></div>
    `;
    try {
      this._tasks = await API.get('/projects/' + projectCode + '/tasks');
      this.renderView(projectCode);
    } catch (err) {
      document.getElementById('task-board-content').innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Không tải được dữ liệu</h3><p>${err.message}</p></div>`;
    }
  },

  switchView(view) {
    this.currentView = view;
    const code = App.state.currentProject?.code;
    this.render(code);
  },

  renderView(projectCode) {
    const content = document.getElementById('task-board-content');
    if (!content) return;
    if (this.currentView === 'kanban') this.renderKanban(projectCode, content);
    else this.renderWBS(projectCode, content);
  },

  renderKanban(projectCode, container) {
    const tasks = this._tasks.filter(t => !t.parent_id);
    const columns = [
      { id: 'todo', label: 'Chưa làm', color: '#64748b', icon: '⬜' },
      { id: 'inprogress', label: 'Đang làm', color: '#2563eb', icon: '🔵' },
      { id: 'review', label: 'Đang review', color: '#f59e0b', icon: '🟡' },
      { id: 'done', label: 'Hoàn thành', color: '#10b981', icon: '✅' }
    ];
    container.innerHTML = `
      <div class="kanban-board">
        ${columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return `
            <div class="kanban-column"
              ondragover="TaskBoard.onDragOver(event)"
              ondrop="TaskBoard.onDrop(event, '${col.id}', '${projectCode}')"
              ondragenter="this.style.borderColor='var(--accent-purple)'"
              ondragleave="this.style.borderColor='var(--border)'">
              <div class="kanban-header">
                <div class="kanban-title"><div class="kanban-dot" style="background:${col.color}"></div>${col.icon} ${col.label}</div>
                <span class="kanban-count">${colTasks.length}</span>
              </div>
              ${colTasks.map(task => this.renderTaskCard(task, projectCode)).join('')}
              <button class="btn btn-secondary btn-sm w-full" style="margin-top:8px;opacity:0.6" onclick="TaskBoard.showAddModal('${col.id}')">+ Thêm</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderTaskCard(task, projectCode) {
    const isOverdue = task.end_date && App.isOverdue(task.end_date) && task.status !== 'done';
    const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
    const assignee = task.assignee || '';
    const initials = assignee ? assignee.split(' ').map(w => w[0]).join('').slice(0, 2) : '?';
    return `
      <div class="task-card" draggable="true"
        ondragstart="TaskBoard.onDragStart(event, '${task.id}')"
        ondragend="TaskBoard.onDragEnd(event)"
        onclick="TaskBoard.showEditModal(${task.id},'${projectCode}',event)"
        style="cursor:pointer">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:6px">
            <div class="task-priority" style="background:${priorityColors[task.priority]}"></div>
            <div class="task-title" style="margin:0;pointer-events:none">${task.title}</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" style="padding:3px 6px;font-size:0.7rem;flex-shrink:0"
            onclick="TaskBoard.showEditModal(${task.id},'${projectCode}',event)">⋮</button>
        </div>
        ${task.description ? `<div class="task-desc" style="pointer-events:none">${task.description}</div>` : ''}
        <div class="progress-bar" style="pointer-events:none"><div class="progress-fill" style="width:${task.progress}%"></div></div>
        <div class="task-footer">
          <div class="task-assignee">
            ${assignee ? `<div class="mini-avatar">${initials}</div><span>${assignee.split(' ').pop()}</span>` : '<span class="text-muted">Chưa phân công</span>'}
          </div>
          <div class="task-date ${isOverdue ? 'overdue' : ''}">📅 ${task.end_date ? App.formatDate(task.end_date) : '—'}</div>
        </div>
        <div class="text-xs text-muted" style="margin-top:6px">⏱️ ${task.estimated_hours || 0}h &nbsp; ${task.progress}% hoàn thành</div>
      </div>
    `;
  },

  renderWBS(projectCode, container) {
    const allTasks = this._tasks;
    const rootTasks = allTasks.filter(t => !t.parent_id);
    const rows = [];
    rootTasks.forEach((task, i) => {
      rows.push(this.renderWBSRow(task, 1, task.wbs_id || (i + 1), projectCode));
      const children = allTasks.filter(t => t.parent_id === task.id);
      children.forEach((child, j) => {
        rows.push(this.renderWBSRow(child, 2, child.wbs_id || `${i+1}.${j+1}`, projectCode));
      });
    });
    container.innerHTML = `
      <div class="card" style="overflow-x:auto">
        <table class="wbs-table">
          <thead>
            <tr>
              <th>WBS</th>
              <th class="text-left" style="min-width:200px">Tên công việc</th>
              <th>Phụ trách</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Giờ ước tính</th>
              <th>Tiến độ</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
        ${rows.length === 0 ? '<div class="empty-state"><div class="icon">📭</div><h3>Chưa có công việc nào</h3></div>' : ''}
      </div>
    `;
  },

  renderWBSRow(task, level, wbsId, projectCode) {
    const isOverdue = task.end_date && App.isOverdue(task.end_date) && task.status !== 'done';
    return `
      <tr class="wbs-level-${level}">
        <td class="font-mono text-muted text-xs">${wbsId}</td>
        <td class="${level===2?'':'font-bold'}">${task.title}</td>
        <td class="text-sm text-secondary">${task.assignee || '<span class="text-muted">—</span>'}</td>
        <td>${App.getPriorityBadge(task.priority)}</td>
        <td>${App.getStatusBadge(task.status)}</td>
        <td class="text-sm">${App.formatDate(task.start_date)}</td>
        <td class="text-sm ${isOverdue?'text-danger':''}">${App.formatDate(task.end_date)}</td>
        <td class="text-right text-sm">${task.estimated_hours || 0}h</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;min-width:100px">
            <div class="progress-bar" style="flex:1;height:6px"><div class="progress-fill" style="width:${task.progress}%"></div></div>
            <span class="text-xs">${task.progress}%</span>
          </div>
        </td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-secondary btn-icon" onclick="TaskBoard.showEditModal(${task.id},'${projectCode}',null)">✏️</button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="TaskBoard.deleteTask(${task.id},'${projectCode}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  },

  onDragStart(e, taskId) {
    this.draggedTask = taskId;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  },
  onDragEnd(e) { e.currentTarget.classList.remove('dragging'); },
  onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },

  async onDrop(e, newStatus, projectCode) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--border)';
    if (!this.draggedTask) return;
    const progress = newStatus === 'done' ? 100 : newStatus === 'review' ? 80 : undefined;
    const task = this._tasks.find(t => t.id == this.draggedTask);
    if (!task) return;
    const updates = { ...task, status: newStatus };
    if (progress !== undefined) updates.progress = progress;
    try {
      await API.put(`/projects/${projectCode}/tasks/${this.draggedTask}`, {
        title: task.title, description: task.description, assignee: task.assignee,
        status: newStatus, priority: task.priority, progress: progress ?? task.progress,
        startDate: task.start_date, endDate: task.end_date, estimatedHours: task.estimated_hours
      });
      this.draggedTask = null;
      App.showToast('Cập nhật trạng thái thành công!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async showAddModal(defaultStatus = 'todo') {
    const code = App.state.currentProject?.code;
    const membersOpts = await App.getMembersOptions();
    const rootTasks = this._tasks.filter(t => !t.parent_id);
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên công việc *</label>
        <input type="text" id="task-title" class="form-control" placeholder="VD: Thiết kế database">
      </div>
      <div class="form-group"><label class="form-label">Mô tả</label>
        <textarea id="task-desc" class="form-control" rows="2" placeholder="Mô tả chi tiết..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phụ trách</label>
          <select id="task-assignee" class="form-control"><option value="">— Chưa phân công —</option>${membersOpts}</select>
        </div>
        <div class="form-group"><label class="form-label">Ưu tiên</label>
          <select id="task-priority" class="form-control">
            <option value="medium">🟡 Trung bình</option>
            <option value="high">🔴 Cao</option>
            <option value="low">🟢 Thấp</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Trạng thái</label>
          <select id="task-status" class="form-control">
            <option value="todo" ${defaultStatus==='todo'?'selected':''}>⬜ Chưa làm</option>
            <option value="inprogress" ${defaultStatus==='inprogress'?'selected':''}>🔵 Đang làm</option>
            <option value="review" ${defaultStatus==='review'?'selected':''}>🟡 Review</option>
            <option value="done" ${defaultStatus==='done'?'selected':''}>✅ Hoàn thành</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Giờ ước tính</label>
          <input type="number" id="task-hours" class="form-control number-input" placeholder="0" min="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày bắt đầu</label><input type="date" id="task-start" class="form-control"></div>
        <div class="form-group"><label class="form-label">Ngày kết thúc</label><input type="date" id="task-end" class="form-control"></div>
      </div>
      ${rootTasks.length > 0 ? `
      <div class="form-group"><label class="form-label">Là công việc con của</label>
        <select id="task-parent" class="form-control">
          <option value="">— Không có (cấp gốc) —</option>
          ${rootTasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="TaskBoard.addTask('${code}')">✅ Thêm</button>
      </div>
    `, '➕ Thêm Công Việc');
    document.getElementById('task-title')?.focus();
  },

  async addTask(projectCode) {
    const title = document.getElementById('task-title')?.value?.trim();
    if (!title) { App.showToast('Vui lòng nhập tên công việc', 'warning'); return; }
    try {
      await API.post(`/projects/${projectCode}/tasks`, {
        title,
        description: document.getElementById('task-desc')?.value || '',
        assignee: document.getElementById('task-assignee')?.value || '',
        priority: document.getElementById('task-priority')?.value || 'medium',
        status: document.getElementById('task-status')?.value || 'todo',
        estimatedHours: parseFloat(document.getElementById('task-hours')?.value) || 0,
        startDate: document.getElementById('task-start')?.value || '',
        endDate: document.getElementById('task-end')?.value || '',
        parentId: document.getElementById('task-parent')?.value || null
      });
      App.closeModal();
      App.showToast('Đã thêm công việc!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async showEditModal(taskId, projectCode, e) {
    if (e) e.stopPropagation();
    const task = this._tasks.find(t => t.id == taskId);
    if (!task) return;
    const membersOpts = await App.getMembersOptions(task.assignee);
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên công việc *</label>
        <input type="text" id="etask-title" class="form-control" value="${task.title}">
      </div>
      <div class="form-group"><label class="form-label">Mô tả</label>
        <textarea id="etask-desc" class="form-control" rows="2">${task.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phụ trách</label>
          <select id="etask-assignee" class="form-control"><option value="">— Chưa phân công —</option>${membersOpts}</select>
        </div>
        <div class="form-group"><label class="form-label">Ưu tiên</label>
          <select id="etask-priority" class="form-control">
            <option value="high" ${task.priority==='high'?'selected':''}>🔴 Cao</option>
            <option value="medium" ${task.priority==='medium'?'selected':''}>🟡 Trung bình</option>
            <option value="low" ${task.priority==='low'?'selected':''}>🟢 Thấp</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Trạng thái</label>
          <select id="etask-status" class="form-control">
            <option value="todo" ${task.status==='todo'?'selected':''}>⬜ Chưa làm</option>
            <option value="inprogress" ${task.status==='inprogress'?'selected':''}>🔵 Đang làm</option>
            <option value="review" ${task.status==='review'?'selected':''}>🟡 Review</option>
            <option value="done" ${task.status==='done'?'selected':''}>✅ Hoàn thành</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Tiến độ</label>
          <input type="range" id="etask-progress" min="0" max="100" value="${task.progress}" oninput="document.getElementById('etask-prog-val').textContent=this.value+'%'">
          <span id="etask-prog-val" class="text-sm text-purple">${task.progress}%</span>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày bắt đầu</label>
          <input type="date" id="etask-start" class="form-control" value="${task.start_date?.split('T')[0] || ''}" onchange="TaskBoard.calcProgress()">
        </div>
        <div class="form-group"><label class="form-label">Ngày kết thúc</label>
          <input type="date" id="etask-end" class="form-control" value="${task.end_date?.split('T')[0] || ''}" onchange="TaskBoard.calcProgress()">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Giờ ước tính</label>
        <input type="number" id="etask-hours" class="form-control number-input" value="${task.estimated_hours || 0}">
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-danger btn-sm" onclick="TaskBoard.deleteTask(${taskId},'${projectCode}')">🗑️</button>
        <button class="btn btn-primary" onclick="TaskBoard.saveEdit(${taskId},'${projectCode}')">💾 Lưu</button>
      </div>
    `, '✏️ Chỉnh Sửa Công Việc');
  },

  calcProgress() {
    const startObj = document.getElementById('etask-start');
    const endObj = document.getElementById('etask-end');
    const progObj = document.getElementById('etask-progress');
    const valObj = document.getElementById('etask-prog-val');
    
    if (!startObj || !endObj || !progObj || !valObj) return;
    
    const startStr = startObj.value;
    const endStr = endObj.value;
    if (!startStr || !endStr) return; // Nếu thiếu ngày, thì không tính
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    const today = new Date();
    
    // Set thời gian về 0h để tính đúng số ngày
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const totalDuration = end - start;
    if (totalDuration <= 0) return; // Ngày bắt đầu > kết thúc thì bỏ qua
    
    const passedDuration = today - start;
    
    let pct = Math.round((passedDuration / totalDuration) * 100);
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    
    progObj.value = pct;
    valObj.textContent = pct + '%';
  },

  async saveEdit(taskId, projectCode) {
    const title = document.getElementById('etask-title')?.value?.trim();
    if (!title) { App.showToast('Vui lòng nhập tên công việc', 'warning'); return; }
    try {
      await API.put(`/projects/${projectCode}/tasks/${taskId}`, {
        title,
        description: document.getElementById('etask-desc')?.value || '',
        assignee: document.getElementById('etask-assignee')?.value || '',
        priority: document.getElementById('etask-priority')?.value,
        status: document.getElementById('etask-status')?.value,
        progress: parseInt(document.getElementById('etask-progress')?.value) || 0,
        startDate: document.getElementById('etask-start')?.value || '',
        endDate: document.getElementById('etask-end')?.value || '',
        estimatedHours: parseFloat(document.getElementById('etask-hours')?.value) || 0
      });
      App.closeModal();
      App.showToast('Đã cập nhật công việc!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async deleteTask(taskId, projectCode) {
    if (!confirm('Xóa công việc này? Các công việc con cũng sẽ bị xóa.')) return;
    try {
      await API.delete(`/projects/${projectCode}/tasks/${taskId}`);
      App.closeModal();
      App.showToast('Đã xóa công việc', 'info');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  }
};
