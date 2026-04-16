// ============================================================
// CHỨC NĂNG: Phân Công Công Việc (Task Assignment Board)
// Hiển thị công việc theo từng thành viên
// ============================================================

const Assignment = {
  async render(projectCode) {
    if (!projectCode) return;
    document.getElementById('section-content').innerHTML = `<div class="loading-spinner"></div>`;
    
    try {
      const [tasks, members] = await Promise.all([
        API.get('/projects/' + projectCode + '/tasks'),
        API.get('/projects/' + projectCode + '/members')
      ]);
      this.renderBoard(tasks, members, projectCode);
    } catch (err) {
      document.getElementById('section-content').innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>Lỗi tải dữ liệu</h3><p>${err.message}</p></div>`;
    }
  },

  renderBoard(tasks, members, projectCode) {
    // Nạp dữ liệu
    const memberMap = new Map();
    members.forEach(m => {
      memberMap.set(m.full_name, {
        member: m,
        tasks: []
      });
    });

    // Thêm nhóm "Unassigned" cho công việc chưa giao
    memberMap.set('Unassigned', {
      member: { full_name: 'Chưa phân công', role: '' },
      tasks: []
    });

    // Chỉ chọn các công việc chi tiết (không chọn project parent nếu có cấu trúc cây)
    // Tạm thời coi mọi task đều được tính
    tasks.forEach(t => {
      const assigneeName = t.assignee;
      if (assigneeName && memberMap.has(assigneeName)) {
        memberMap.get(assigneeName).tasks.push(t);
      } else {
        memberMap.get('Unassigned').tasks.push(t);
      }
    });

    const sectionEl = document.getElementById('section-content');
    
    let html = `
      <div class="page-header">
        <div class="page-title">
          <h2>👥 Bảng Phân Công Công Việc</h2>
          <p>Xem toàn cảnh khối lượng công việc được quản lý và xử lý bởi từng thành viên</p>
        </div>
      </div>
      
      <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); margin-top:20px;">
    `;

    // Render từng khối thành viên
    memberMap.forEach((group, key) => {
      // Ẩn nhóm chưa phân công nếu trống
      if (key === 'Unassigned' && group.tasks.length === 0) return;

      const m = group.member;
      const mTasks = group.tasks;
      
      const done = mTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
      const inprog = mTasks.filter(t => t.status === 'inprogress' || t.status === 'review').length;
      const todo = mTasks.length - done - inprog;
      const progress = mTasks.length > 0 ? Math.round((done / mTasks.length) * 100) : 0;
      
      // Chữ viết tắt avatar
      const initials = (m.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      
      html += `
        <div class="card" style="display:flex;flex-direction:column;gap:16px;">
          <!-- Header người dùng -->
          <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border);padding-bottom:16px;">
            <div class="user-avatar" style="width:48px;height:48px;font-size:1.1rem;background:${key === 'Unassigned' ? 'var(--bg-input)' : 'var(--gradient-main)'}">${initials}</div>
            <div style="flex:1">
              <h4 style="margin:0">${m.full_name}</h4>
              <div class="text-xs text-muted" style="margin-top:2px;">${m.role === 'manager' ? '👑 Trưởng dự án' : (key === 'Unassigned' ? 'Công việc cần được phân bổ' : '👤 Thành viên')}</div>
            </div>
            <div title="Tổng công việc" style="background:var(--bg-input);padding:4px 10px;border-radius:100px;font-size:0.8rem;font-weight:bold;color:var(--text-secondary)">
              ${mTasks.length} tasks
            </div>
          </div>
          
          <!-- Thống kê nhỏ -->
          <div class="stats-row" style="margin:0;gap:8px;grid-template-columns: repeat(3, 1fr)">
            <div class="stat-card" style="padding:10px;justify-content:center;flex-direction:column;gap:4px">
              <div class="text-xs text-muted">Sắp làm</div>
              <div class="font-bold text-lg">${todo}</div>
            </div>
            <div class="stat-card" style="padding:10px;justify-content:center;flex-direction:column;gap:4px;background:rgba(37,99,235,0.05);border-color:rgba(37,99,235,0.2)">
              <div class="text-xs" style="color:#60a5fa">Đang xử lý</div>
              <div class="font-bold text-lg text-primary">${inprog}</div>
            </div>
            <div class="stat-card" style="padding:10px;justify-content:center;flex-direction:column;gap:4px;background:rgba(16,185,129,0.05);border-color:rgba(16,185,129,0.2)">
              <div class="text-xs" style="color:#34d399">Hoàn thành</div>
              <div class="font-bold text-lg text-primary">${done}</div>
            </div>
          </div>

          <!-- Thanh tiến độ -->
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <div class="progress-bar" style="flex:1;height:6px;margin:0;"><div class="progress-fill" style="width:${progress}%;background:var(--gradient-green)"></div></div>
            <span class="text-xs text-muted font-bold">${progress}%</span>
          </div>
          
          <!-- Danh sách Task cuộn -->
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding-right:4px;margin-top:8px;">
      `;

      if (mTasks.length === 0) {
        html += `<div class="text-center text-muted text-sm" style="padding:32px 0">Thực sự quá rảnh rỗi! 😎</div>`;
      } else {
        // Sắp xếp: Doing/Todo lên đầu, Done xuống dưới cùng
        mTasks.sort((a,b) => {
          const wA = (a.status==='done'||a.status==='completed')?1:0;
          const wB = (b.status==='done'||b.status==='completed')?1:0;
          return wA - wB;
        }).forEach(t => {
          let badge = '';
          if (t.status === 'done' || t.status === 'completed') badge = '✅';
          else if (t.status === 'inprogress') badge = '🔵';
          else if (t.status === 'review') badge = '🟡';
          else badge = '⬜';

          let priColor = t.priority === 'high' ? 'var(--accent-red)' : (t.priority === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)');

          html += `
            <div style="background:var(--bg-card);padding:12px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;display:flex;align-items:center;justify-content:space-between;opacity:${(t.status==='done'||t.status==='completed')?0.5:1};transition:transform 0.2s;cursor:default;">
              <div style="display:flex;align-items:flex-start;gap:10px;overflow:hidden">
                <span title="Status" style="font-size:1.1rem">${badge}</span>
                <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden">
                  <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500" title="${t.title}">${t.title}</div>
                  <div class="text-xs text-muted" style="display:flex;gap:10px;">
                    <span style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:50%;background:${priColor}"></div> Ưu tiên</span>
                    <span>⏱️ ${t.estimated_hours || 0}h</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
      }

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
    sectionEl.innerHTML = html;
  }
};
