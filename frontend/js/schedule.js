// ============================================================
// CHỨC NĂNG 4: Quản Lý Lịch Trình Dự Án (Milestone)
// CHỨC NĂNG 5: Quản Lý Lịch Trình Công Việc (Gantt Chart)
// Author: Ngô Đức Phôn
// ============================================================

// ── SCHEDULE (Milestone) ──────────────────────────────────

const Schedule = {
  async render(projectCode) {
    if (!projectCode) return;
    document.getElementById('section-content').innerHTML = `<div class="loading-spinner"></div>`;
    let milestones = [];
    try { milestones = await API.get('/projects/' + projectCode + '/milestones'); } catch (err) { App.showToast(err.message,'error'); }
    this._renderWithData(projectCode, milestones);
  },

  _renderWithData(projectCode, milestones) {
    // Tự động tính toán lại trạng thái trễ hạn theo ngày thực tế (để sửa lỗi DB lưu sai)
    milestones.forEach(m => {
      if (m.status !== 'completed') {
        const daysLeft = App.getDaysLeft(m.due_date);
        m.status = (daysLeft !== null && daysLeft < 0) ? 'overdue' : 'pending';
      }
    });

    const completed = milestones.filter(m => m.status === 'completed').length;
    const pending = milestones.filter(m => m.status === 'pending').length;
    const overdue = milestones.filter(m => m.status === 'overdue').length;
    const sectionEl = document.getElementById('section-content');
    sectionEl.innerHTML = `
      <div class="page-header">
        <div class="page-title">
          <h2>🗓️ Lịch Trình Dự Án</h2>
          <p>Quản lý các mốc quan trọng (milestone) của dự án</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Schedule.showAddModal('${projectCode}')">➕ Thêm Milestone</button>
        </div>
      </div>

      <div class="stats-row mb-6">
        <div class="stat-card"><div class="stat-icon purple">🎯</div><div class="stat-info"><div class="value">${milestones.length}</div><div class="label">Tổng milestone</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="value">${completed}</div><div class="label">Hoàn thành</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">⏳</div><div class="stat-info"><div class="value">${pending}</div><div class="label">Đang chờ</div></div></div>
        <div class="stat-card"><div class="stat-icon red">⚠️</div><div class="stat-info"><div class="value">${overdue}</div><div class="label">Trễ hạn</div></div></div>
      </div>

      ${milestones.length > 0 ? `
      <div class="card mb-6">
        <div class="flex justify-between items-center mb-3">
          <h4>📈 Tiến Độ Milestone</h4>
          <span class="text-purple font-bold">${milestones.length > 0 ? Math.round(completed/milestones.length*100) : 0}%</span>
        </div>
        <div class="progress-bar" style="height:12px;border-radius:6px">
          <div class="progress-fill" style="width:${milestones.length > 0 ? Math.round(completed/milestones.length*100) : 0}%;height:100%;border-radius:6px"></div>
        </div>
        <div class="flex justify-between text-xs text-muted mt-2">
          <span>✅ ${completed} hoàn thành</span>
          ${overdue > 0 ? `<span class="text-danger">⚠️ ${overdue} trễ hạn</span>` : ''}
          <span>⏳ ${pending} đang chờ</span>
        </div>
      </div>` : ''}

      ${milestones.length === 0 ? `
        <div class="empty-state"><div class="icon">🎯</div><h3>Chưa có milestone nào</h3><p>Thêm các mốc quan trọng để theo dõi tiến độ dự án</p></div>
      ` : `
        <h3 class="mb-4">📅 Timeline Milestone</h3>
        <div class="timeline-container">
          <div class="timeline-line"></div>
          ${milestones.map(m => this.renderMilestoneItem(m, projectCode)).join('')}
        </div>

        <div class="card mt-6">
          <h4 class="mb-4">📋 Danh Sách Milestone</h4>
          <div style="overflow-x:auto">
            <table class="wbs-table">
              <thead>
                <tr><th>STT</th><th class="text-left">Tên Milestone</th><th>Màu</th><th>Ngày Hạn</th><th>Trạng thái</th><th>Thời gian còn lại</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                ${milestones.map((m, i) => {
                  const daysLeft = App.getDaysLeft(m.due_date);
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  return `<tr>
                    <td class="text-muted">${i+1}</td>
                    <td class="text-left"><div class="font-bold">${m.title}</div>${m.description ? `<div class="text-xs text-muted">${m.description}</div>` : ''}</td>
                    <td><div style="width:20px;height:20px;border-radius:50%;background:${m.color};margin:auto"></div></td>
                    <td class="font-mono text-sm">${App.formatDate(m.due_date)}</td>
                    <td>${this.getStatusBadge(m.status)}</td>
                    <td class="${isOverdue?'text-danger':daysLeft!==null&&daysLeft<=7?'text-warning':'text-secondary'} text-sm">
                      ${isOverdue?`⚠️ Trễ ${Math.abs(daysLeft)} ngày`:daysLeft===0?'🔥 Hôm nay!':daysLeft!==null?`📅 Còn ${daysLeft} ngày`:'—'}
                    </td>
                    <td>
                      <div style="display:flex;gap:4px">
                        <button class="btn btn-sm ${m.status==='completed'?'btn-secondary':'btn-success'} btn-icon" onclick="Schedule.toggleComplete('${projectCode}',${m.id})">${m.status==='completed'?'↩️':'✅'}</button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="Schedule.showEditModal('${projectCode}',${m.id})">✏️</button>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="Schedule.deleteItem('${projectCode}',${m.id})">🗑️</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  },

  renderMilestoneItem(m, projectCode) {
    const statusIcons = { completed: '✅', pending: '⏳', overdue: '🔴' };
    const daysLeft = App.getDaysLeft(m.due_date);
    const isOverdue = daysLeft !== null && daysLeft < 0;
    return `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:${m.color};box-shadow:0 0 0 4px ${m.color}33"></div>
        <div class="timeline-content" style="border-left:3px solid ${m.color}">
          <div class="timeline-date">${App.formatDate(m.due_date)}</div>
          <h4 style="margin-bottom:6px">${statusIcons[m.status]||'⏳'} ${m.title}</h4>
          ${m.description ? `<p class="text-sm text-muted" style="margin-bottom:12px">${m.description}</p>` : ''}
          <div class="flex items-center justify-between flex-wrap gap-2">
            ${this.getStatusBadge(m.status)}
            <div style="display:flex;gap:6px">
              ${m.status !== 'completed' ? `<button class="btn btn-sm btn-success" onclick="Schedule.toggleComplete('${projectCode}',${m.id})">✅ Hoàn thành</button>` : `<button class="btn btn-sm btn-secondary" onclick="Schedule.toggleComplete('${projectCode}',${m.id})">↩️ Mở lại</button>`}
              <button class="btn btn-sm btn-secondary" onclick="Schedule.showEditModal('${projectCode}',${m.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="Schedule.deleteItem('${projectCode}',${m.id})">🗑️</button>
            </div>
          </div>
          ${isOverdue&&m.status!=='completed'?`<div class="text-xs text-danger mt-2">⚠️ Trễ ${Math.abs(daysLeft)} ngày</div>`:''}
          ${!isOverdue&&m.status!=='completed'&&daysLeft!==null&&daysLeft<=7?`<div class="text-xs text-warning mt-2">🔥 Sắp đến hạn trong ${daysLeft} ngày!</div>`:''}
        </div>
      </div>
    `;
  },

  getStatusBadge(status) {
    const map = {
      completed: '<span class="badge badge-done">✅ Hoàn thành</span>',
      pending: '<span class="badge badge-pending">⏳ Chờ</span>',
      overdue: '<span class="badge badge-overdue">🔴 Trễ hạn</span>'
    };
    return map[status] || `<span class="badge">${status}</span>`;
  },

  async toggleComplete(projectCode, id) {
    try {
      const milestones = await API.get('/projects/' + projectCode + '/milestones');
      const m = milestones.find(m => m.id == id);
      if (!m) return;
      const newStatus = m.status === 'completed' ? 'pending' : 'completed';
      await API.put('/projects/' + projectCode + '/milestones/' + id, { ...m, status: newStatus, dueDate: m.due_date });
      App.showToast(newStatus === 'completed' ? '🎉 Milestone hoàn thành!' : 'Đã mở lại', newStatus === 'completed' ? 'success' : 'info');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  showAddModal(projectCode) {
    const today = new Date().toISOString().split('T')[0];
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên Milestone *</label>
        <input type="text" id="ms-title" class="form-control" placeholder="VD: Hoàn thành thiết kế hệ thống">
      </div>
      <div class="form-group"><label class="form-label">Mô tả</label>
        <textarea id="ms-desc" class="form-control" rows="2" placeholder="Mô tả chi tiết milestone..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày hạn *</label>
          <input type="date" id="ms-date" class="form-control" value="${today}">
        </div>
        <div class="form-group"><label class="form-label">Màu sắc</label>
          <input type="color" id="ms-color" value="#7c3aed" style="width:100%;height:42px">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Trạng thái</label>
        <select id="ms-status" class="form-control">
          <option value="pending">⏳ Đang chờ</option>
          <option value="completed">✅ Hoàn thành</option>
        </select>
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="Schedule.addItem('${projectCode}')">🎯 Thêm</button>
      </div>
    `, '🎯 Thêm Milestone');
  },

  async addItem(projectCode) {
    const title = document.getElementById('ms-title')?.value?.trim();
    const dueDate = document.getElementById('ms-date')?.value;
    if (!title || !dueDate) { App.showToast('Vui lòng nhập tên và ngày hạn', 'warning'); return; }
    try {
      await API.post('/projects/' + projectCode + '/milestones', {
        title, description: document.getElementById('ms-desc')?.value || '',
        dueDate, status: document.getElementById('ms-status')?.value || 'pending',
        color: document.getElementById('ms-color')?.value || '#7c3aed'
      });
      App.closeModal(); App.showToast('Đã thêm milestone!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async showEditModal(projectCode, id) {
    let milestones = [];
    try { milestones = await API.get('/projects/' + projectCode + '/milestones'); } catch {}
    const m = milestones.find(m => m.id == id);
    if (!m) return;
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên Milestone *</label>
        <input type="text" id="ems-title" class="form-control" value="${m.title}">
      </div>
      <div class="form-group"><label class="form-label">Mô tả</label>
        <textarea id="ems-desc" class="form-control" rows="2">${m.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày hạn *</label>
          <input type="date" id="ems-date" class="form-control" value="${m.due_date?.split('T')[0] || ''}">
        </div>
        <div class="form-group"><label class="form-label">Màu sắc</label>
          <input type="color" id="ems-color" value="${m.color}" style="width:100%;height:42px">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Trạng thái</label>
        <select id="ems-status" class="form-control">
          <option value="pending" ${m.status==='pending'||m.status==='overdue'?'selected':''}>⏳ Đang chờ (Hệ thống tự tính trễ hẹn)</option>
          <option value="completed" ${m.status==='completed'?'selected':''}>✅ Hoàn thành</option>
        </select>
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="Schedule.saveEdit('${projectCode}',${id})">💾 Lưu</button>
      </div>
    `, '✏️ Sửa Milestone');
  },

  async saveEdit(projectCode, id) {
    const title = document.getElementById('ems-title')?.value?.trim();
    const dueDate = document.getElementById('ems-date')?.value;
    if (!title || !dueDate) { App.showToast('Vui lòng nhập đầy đủ', 'warning'); return; }
    try {
      await API.put('/projects/' + projectCode + '/milestones/' + id, {
        title, description: document.getElementById('ems-desc')?.value,
        dueDate, status: document.getElementById('ems-status')?.value,
        color: document.getElementById('ems-color')?.value
      });
      App.closeModal(); App.showToast('Đã cập nhật milestone!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async deleteItem(projectCode, id) {
    if (!confirm('Xóa milestone này?')) return;
    try {
      await API.delete('/projects/' + projectCode + '/milestones/' + id);
      App.showToast('Đã xóa milestone', 'info'); this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  }
};


// ── GANTT CHART ──────────────────────────────────────────

const GanttChart = {
  async render(projectCode) {
    if (!projectCode) return;
    document.getElementById('section-content').innerHTML = `<div class="loading-spinner"></div>`;
    let items = [];
    try { items = await API.get('/projects/' + projectCode + '/schedules'); } catch (err) { App.showToast(err.message,'error'); }
    this._renderWithData(projectCode, items);
  },

  _renderWithData(projectCode, items) {
    const sectionEl = document.getElementById('section-content');
    sectionEl.innerHTML = `
      <div class="page-header">
        <div class="page-title">
          <h2>📊 Lịch Trình Công Việc</h2>
          <p>Gantt chart quản lý thời gian thực hiện từng công việc</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="GanttChart.importFromTasks('${projectCode}')">📥 Import từ công việc</button>
          <button class="btn btn-primary" onclick="GanttChart.showAddModal('${projectCode}')">➕ Thêm</button>
        </div>
      </div>

      ${items.length === 0 ? `
        <div class="empty-state"><div class="icon">📊</div><h3>Chưa có lịch trình công việc</h3><p>Thêm công việc hoặc import từ bảng công việc để tạo Gantt chart</p></div>
      ` : `
        <div class="stats-row mb-6">
          <div class="stat-card"><div class="stat-icon purple">📋</div><div class="stat-info"><div class="value">${items.length}</div><div class="label">Công việc</div></div></div>
          <div class="stat-card"><div class="stat-icon red">🔴</div><div class="stat-info"><div class="value">${items.filter(t=>t.isCritical||t.is_critical).length}</div><div class="label">Critical path</div></div></div>
          <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="value">${items.filter(t=>t.progress===100).length}</div><div class="label">Hoàn thành</div></div></div>
        </div>

        <div class="flex gap-4 mb-4 flex-wrap">
          <div class="chip">🟣 Bình thường</div>
          <div class="chip" style="border-color:#ef444440;color:#f87171">🔴 Critical path</div>
          <div class="chip" style="border-color:#10b98140;color:#34d399">🟢 Hoàn thành 100%</div>
        </div>

        ${this.buildGanttHTML(items)}

        <div class="card mt-6">
          <h4 class="mb-4">📋 Danh Sách Lịch Trình</h4>
          <div style="overflow-x:auto">
            <table class="wbs-table">
              <thead>
                <tr><th>STT</th><th class="text-left">Tên Công Việc</th><th>Phụ trách</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thời lượng</th><th>Tiến độ</th><th>Critical</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                ${items.map((t, i) => {
                  const start = new Date(t.start_date), end = new Date(t.end_date);
                  const duration = Math.ceil((end - start) / (1000*60*60*24)) + 1;
                  const isCrit = t.isCritical || t.is_critical;
                  return `<tr>
                    <td class="text-muted">${i+1}</td>
                    <td class="text-left font-bold">${t.task_name || t.taskName}</td>
                    <td class="text-sm text-secondary">${t.assignee || '—'}</td>
                    <td class="font-mono text-sm">${App.formatDate(t.start_date)}</td>
                    <td class="font-mono text-sm">${App.formatDate(t.end_date)}</td>
                    <td class="text-sm">${duration} ngày</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <div class="progress-bar" style="width:80px;height:6px"><div class="progress-fill" style="width:${t.progress}%"></div></div>
                        <span class="text-xs">${t.progress}%</span>
                      </div>
                    </td>
                    <td>${isCrit?'<span class="badge badge-overdue">🔴 Critical</span>':'<span class="badge">—</span>'}</td>
                    <td>
                      <div style="display:flex;gap:4px">
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="GanttChart.showEditModal('${projectCode}',${t.id})">✏️</button>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="GanttChart.deleteItem('${projectCode}',${t.id})">🗑️</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  },

  buildGanttHTML(items) {
    if (items.length === 0) return '';
    const startDates = items.map(t => new Date(t.start_date));
    const endDates = items.map(t => new Date(t.end_date));
    const minDate = new Date(Math.min(...startDates));
    const maxDate = new Date(Math.max(...endDates));
    minDate.setDate(1);
    const months = [];
    const cur = new Date(minDate);
    while (cur <= maxDate) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    if (months.length < 2) months.push(new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1));
    const ganttEndDate = new Date(months[months.length-1].getFullYear(), months[months.length-1].getMonth() + 1, 1);
    const totalDays = (ganttEndDate - minDate) / (1000*60*60*24);
    const monthHeaders = `<div style="display:flex;width:100%">${months.map((m, i) => {
      const nextM = i < months.length - 1 ? months[i+1] : new Date(months[months.length-1].getFullYear(), months[months.length-1].getMonth() + 1, 1);
      const mDays = (nextM - m) / (1000*60*60*24);
      return `<div class="gantt-month" style="flex:none;width:${mDays/totalDays*100}%;border-bottom:none">${m.toLocaleDateString('vi-VN',{month:'short',year:'numeric'})}</div>`;
    }).join('')}</div>`;
    let weeksHTML = `<div style="display:flex;width:100%">`;
    const curWeek = new Date(minDate);
    let weekIndex = 1;
    while (curWeek < ganttEndDate) {
      const nextWeek = new Date(curWeek);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const end = nextWeek > ganttEndDate ? ganttEndDate : nextWeek;
      const wDays = (end - curWeek) / (1000*60*60*24);
      weeksHTML += `<div style="flex:none;width:${wDays/totalDays*100}%;border-right:1px solid rgba(255,255,255,0.04);padding:4px;font-size:0.75rem;color:var(--text-muted);text-align:center;border-top:1px solid rgba(255,255,255,0.04)">Tuần ${weekIndex}</div>`;
      curWeek.setDate(curWeek.getDate() + 7);
      weekIndex++;
    }
    weeksHTML += `</div>`;
    const today = new Date();
    const todayPct = Math.max(0, Math.min(100, (today - minDate) / (1000*60*60*24) / totalDays * 100));
    const rows = items.map(t => {
      const taskStart = new Date(t.start_date), taskEnd = new Date(t.end_date);
      const offsetPct = Math.max(0, (taskStart - minDate) / (1000*60*60*24) / totalDays * 100);
      const widthPct = Math.max(1, (taskEnd - taskStart + 86400000) / (1000*60*60*24) / totalDays * 100);
      const initials = t.assignee ? t.assignee.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?';
      const isCrit = t.isCritical || t.is_critical;
      const name = t.task_name || t.taskName;
      const barClass = t.progress === 100 ? 'completed' : isCrit ? 'critical' : '';
      return `
        <div class="gantt-row">
          <div class="gantt-task-name">
            ${isCrit ? '<span style="color:var(--accent-red)">🔴</span>' : ''}
            <div class="mini-avatar" title="${t.assignee||''}">${initials}</div>
            <span class="text-sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${name}">${name}</span>
          </div>
          <div class="gantt-bars">
            <div class="gantt-bar ${barClass}" style="left:${offsetPct}%;width:${widthPct}%" title="${name}: ${App.formatDate(t.start_date)} → ${App.formatDate(t.end_date)} (${t.progress}%)">
              ${widthPct > 6 ? `<span>${name}</span>` : ''}
            </div>
            <div style="position:absolute;left:${offsetPct}%;width:${widthPct*t.progress/100}%;height:28px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border-radius:6px;pointer-events:none"></div>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="gantt-container">
        <div class="gantt-header">
          <div class="gantt-task-col" style="display:flex;align-items:center;">Công việc</div>
          <div class="gantt-timeline" style="flex-direction:column;">
            ${monthHeaders}
            ${weeksHTML}
          </div>
        </div>
        <div style="position:relative">
          <div style="position:absolute;left:calc(240px + (100% - 240px)*${todayPct}/100);top:0;bottom:0;width:2px;background:var(--accent-red);z-index:5;pointer-events:none">
            <span style="position:absolute;top:0;left:4px;background:var(--accent-red);color:white;font-size:0.65rem;padding:2px 6px;border-radius:4px;white-space:nowrap">Hôm nay</span>
          </div>
          ${rows}
        </div>
      </div>
    `;
  },

  async showAddModal(projectCode) {
    const today = new Date().toISOString().split('T')[0];
    const membersOpts = await App.getMembersOptions();
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên công việc *</label>
        <input type="text" id="gs-name" class="form-control" placeholder="VD: Phát triển API">
      </div>
      <div class="form-group"><label class="form-label">Phụ trách</label>
        <select id="gs-assignee" class="form-control"><option value="">— Chưa phân công —</option>${membersOpts}</select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày bắt đầu *</label>
          <input type="date" id="gs-start" class="form-control" value="${today}">
        </div>
        <div class="form-group"><label class="form-label">Ngày kết thúc *</label>
          <input type="date" id="gs-end" class="form-control">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Tiến độ (%)</label>
        <input type="range" id="gs-progress" min="0" max="100" value="0" oninput="document.getElementById('gs-prog-val').textContent=this.value+'%'">
        <span id="gs-prog-val" class="text-sm text-purple">0%</span>
      </div>
      <div class="form-group"><label style="display:flex;gap:10px;align-items:center;cursor:pointer">
        <input type="checkbox" id="gs-critical"> Là công việc Critical Path
      </label></div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="GanttChart.addItem('${projectCode}')">📊 Thêm</button>
      </div>
    `, '➕ Thêm Công Việc Lịch Trình');
  },

  async addItem(projectCode) {
    const taskName = document.getElementById('gs-name')?.value?.trim();
    const startDate = document.getElementById('gs-start')?.value;
    const endDate = document.getElementById('gs-end')?.value;
    if (!taskName || !startDate || !endDate) { App.showToast('Vui lòng nhập đầy đủ thông tin', 'warning'); return; }
    if (new Date(endDate) < new Date(startDate)) { App.showToast('Ngày kết thúc phải sau ngày bắt đầu', 'warning'); return; }
    try {
      await API.post('/projects/' + projectCode + '/schedules', {
        taskName, assignee: document.getElementById('gs-assignee')?.value || '',
        startDate, endDate,
        progress: parseInt(document.getElementById('gs-progress')?.value) || 0,
        isCritical: document.getElementById('gs-critical')?.checked || false
      });
      App.closeModal(); App.showToast('Đã thêm lịch trình!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async showEditModal(projectCode, id) {
    let items = [];
    try { items = await API.get('/projects/' + projectCode + '/schedules'); } catch {}
    const t = items.find(t => t.id == id);
    if (!t) return;
    const membersOpts = await App.getMembersOptions(t.assignee);
    const isCrit = t.isCritical || t.is_critical;
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên công việc *</label>
        <input type="text" id="ogs-name" class="form-control" value="${t.task_name || t.taskName}">
      </div>
      <div class="form-group"><label class="form-label">Phụ trách</label>
        <select id="ogs-assignee" class="form-control"><option value="">—</option>${membersOpts}</select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày bắt đầu *</label>
          <input type="date" id="ogs-start" class="form-control" value="${t.start_date?.split('T')[0] || ''}">
        </div>
        <div class="form-group"><label class="form-label">Ngày kết thúc *</label>
          <input type="date" id="ogs-end" class="form-control" value="${t.end_date?.split('T')[0] || ''}">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Tiến độ (%)</label>
        <input type="range" id="ogs-progress" min="0" max="100" value="${t.progress}" oninput="document.getElementById('ogs-prog-val').textContent=this.value+'%'">
        <span id="ogs-prog-val" class="text-sm text-purple">${t.progress}%</span>
      </div>
      <div class="form-group"><label style="display:flex;gap:10px;align-items:center;cursor:pointer">
        <input type="checkbox" id="ogs-critical" ${isCrit?'checked':''}> Là công việc Critical Path
      </label></div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="GanttChart.saveEdit('${projectCode}',${id})">💾 Lưu</button>
      </div>
    `, '✏️ Sửa Lịch Trình');
  },

  async saveEdit(projectCode, id) {
    const taskName = document.getElementById('ogs-name')?.value?.trim();
    const startDate = document.getElementById('ogs-start')?.value;
    const endDate = document.getElementById('ogs-end')?.value;
    if (!taskName || !startDate || !endDate) { App.showToast('Vui lòng nhập đầy đủ', 'warning'); return; }
    try {
      await API.put('/projects/' + projectCode + '/schedules/' + id, {
        taskName, assignee: document.getElementById('ogs-assignee')?.value || '',
        startDate, endDate,
        progress: parseInt(document.getElementById('ogs-progress')?.value) || 0,
        isCritical: document.getElementById('ogs-critical')?.checked || false
      });
      App.closeModal(); App.showToast('Đã cập nhật!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async deleteItem(projectCode, id) {
    if (!confirm('Xóa lịch trình này?')) return;
    try {
      await API.delete('/projects/' + projectCode + '/schedules/' + id);
      App.showToast('Đã xóa', 'info'); this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async importFromTasks(projectCode) {
    try {
      const [tasks, existing] = await Promise.all([
        API.get('/projects/' + projectCode + '/tasks'),
        API.get('/projects/' + projectCode + '/schedules')
      ]);
      const existingNames = existing.map(t => t.task_name || t.taskName);
      const eligible = tasks.filter(t => !t.parent_id && t.start_date && t.end_date);
      if (eligible.length === 0) { App.showToast('Không có công việc nào có ngày bắt đầu/kết thúc', 'warning'); return; }
      let added = 0;
      for (const task of eligible) {
        if (!existingNames.includes(task.title)) {
          await API.post('/projects/' + projectCode + '/schedules', {
            taskName: task.title, assignee: task.assignee || '',
            startDate: task.start_date, endDate: task.end_date,
            progress: task.progress || 0, isCritical: task.priority === 'high'
          });
          added++;
        }
      }
      if (added > 0) { App.showToast(`Đã import ${added} công việc!`, 'success'); this.render(projectCode); }
      else App.showToast('Tất cả công việc đã có lịch trình rồi', 'info');
    } catch (err) { App.showToast(err.message, 'error'); }
  }
};
