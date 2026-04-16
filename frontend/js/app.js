// ============================================================
// API CLIENT - Gọi REST API backend
// ============================================================
const API_BASE = window.location.origin + '/api';

const API = {
  token: localStorage.getItem('pm_token'),

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('pm_token', t);
    else localStorage.removeItem('pm_token');
  },

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi server');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },
};

// ============================================================
// APP CORE - Router, State, Utilities
// ============================================================
const App = {
  state: {
    user: null,
    currentProject: null,
    currentSection: 'tasks'
  },

  async init() {
    const token = API.token;
    if (token) {
      try {
        const user = await API.get('/auth/me');
        this.state.user = user;
        this.showAppLayout();
        this.navigateDashboard();
        return;
      } catch {
        API.setToken(null);
      }
    }
    this.showPage('auth-page');
    Auth.init();
  },

  setupGlobalEvents() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown'))
        document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
    });
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) this.closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
  },

  showAppLayout() {
    document.getElementById('navbar').style.display = 'flex';
    const user = this.state.user;
    if (user) {
      const initials = (user.fullName || user.username || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      document.getElementById('user-avatar').textContent = initials;
      document.getElementById('user-name-display').textContent = user.fullName || user.username;
      const disp = document.getElementById('current-username-display');
      if (disp) disp.textContent = '@' + user.username;
    }
  },

  login(user, token) {
    this.state.user = user;
    API.setToken(token);
    this.showAppLayout();
    this.navigateDashboard();
  },

  logout() {
    API.setToken(null);
    this.state.user = null;
    this.state.currentProject = null;
    document.getElementById('navbar').style.display = 'none';
    this.showPage('auth-page');
    Auth.init();
  },

  async navigateDashboard() {
    this.state.currentProject = null;
    const backBtn = document.getElementById('btn-back-dashboard');
    if (backBtn) backBtn.style.display = 'none';
    this.showPage('dashboard-page');
    await Dashboard.render();
  },

  async navigateProject(projectCode) {
    try {
      const project = await API.get('/projects/' + projectCode);
      this.state.currentProject = project;
      const backBtn = document.getElementById('btn-back-dashboard');
      if (backBtn) backBtn.style.display = 'flex';
      this.showPage('project-page');
      document.getElementById('project-name-display').textContent = project.name;
      document.getElementById('project-code-display').textContent = project.code;
      this.navigateSection('tasks');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  navigateSection(section) {
    this.state.currentSection = section;
    document.querySelectorAll('.sidebar-link').forEach(l => {
      l.classList.toggle('active', l.dataset.section === section);
    });
    const code = this.state.currentProject?.code;
    switch (section) {
      case 'overview': ProjectHome.render(); break;
      case 'tasks': TaskBoard.render(code); break;
      case 'estimation': Estimation.render(code); break;
      case 'cost': CostEst.render(code); break;
      case 'schedule': Schedule.render(code); break;
      case 'gantt': GanttChart.render(code); break;
      case 'assignment': Assignment.render(code); break;
    }
  },

  openModal(html, title) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    if (title) modalTitle.textContent = title;
    if (html) modalBody.innerHTML = html;
    overlay.classList.add('open');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('modal-body').innerHTML = '';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
  },

  isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  },

  getDaysLeft(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  },

  getStatusBadge(status) {
    const map = {
      todo: '<span class="badge badge-todo">⬜ Chưa làm</span>',
      inprogress: '<span class="badge badge-inprogress">🔵 Đang làm</span>',
      review: '<span class="badge badge-review">🟡 Đang review</span>',
      done: '<span class="badge badge-done">✅ Hoàn thành</span>',
      pending: '<span class="badge badge-pending">⏳ Chờ</span>',
      completed: '<span class="badge badge-done">✅ Hoàn thành</span>',
      overdue: '<span class="badge badge-overdue">🔴 Trễ hạn</span>',
      active: '<span class="badge badge-active">🟣 Đang hoạt động</span>',
      planning: '<span class="badge badge-pending">📋 Lên kế hoạch</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
  },

  getPriorityBadge(priority) {
    const map = {
      high: '<span class="badge" style="background:rgba(239,68,68,0.15);color:#f87171">🔴 Cao</span>',
      medium: '<span class="badge" style="background:rgba(245,158,11,0.15);color:#fbbf24">🟡 Trung bình</span>',
      low: '<span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399">🟢 Thấp</span>',
    };
    return map[priority] || priority;
  },

  async getMembersList() {
    const project = this.state.currentProject;
    if (!project) return [];
    try {
      return await API.get('/projects/' + project.code + '/members');
    } catch { return []; }
  },

  async getMembersOptions(selectedName = '') {
    const members = await this.getMembersList();
    return members.map(m =>
      `<option value="${m.full_name}" ${m.full_name === selectedName ? 'selected' : ''}>${m.full_name}${m.role === 'manager' ? ' (Trưởng)' : ''}</option>`
    ).join('');
  }
};

// ── AUTH ──
const Auth = {
  init() { this.renderLoginForm(); },

  renderLoginForm() {
    document.getElementById('auth-form-container').innerHTML = `
      <div class="form-group">
        <label class="form-label">Tên đăng nhập</label>
        <div class="input-group">
          <span class="input-group-icon">👤</span>
          <input type="text" id="login-username" class="form-control" placeholder="Nhập tên đăng nhập..." value="nhtinh">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mật khẩu</label>
        <div class="input-group">
          <span class="input-group-icon">🔒</span>
          <input type="password" id="login-password" class="form-control" placeholder="Nhập mật khẩu..." value="123456">
        </div>
      </div>
      <button class="btn btn-primary w-full btn-lg" onclick="Auth.login()" id="login-btn">🚀 Đăng Nhập</button>

    `;
    document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') Auth.login(); });
  },

  renderRegisterForm() {
    document.getElementById('auth-form-container').innerHTML = `
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input type="text" id="reg-fullname" class="form-control" placeholder="Nguyễn Văn A">
      </div>
      <div class="form-group">
        <label class="form-label">Tên đăng nhập *</label>
        <input type="text" id="reg-username" class="form-control" placeholder="username (không dấu)">
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="reg-email" class="form-control" placeholder="email@example.com">
      </div>
      <div class="form-group">
        <label class="form-label">Mật khẩu *</label>
        <input type="password" id="reg-password" class="form-control" placeholder="Tối thiểu 6 ký tự">
      </div>
      <button class="btn btn-primary w-full btn-lg" onclick="Auth.register()">✨ Tạo Tài Khoản</button>
    `;
  },

  switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'login') this.renderLoginForm();
    else this.renderRegisterForm();
  },

  async login() {
    const username = document.getElementById('login-username')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    if (!username || !password) { App.showToast('Vui lòng nhập đầy đủ thông tin', 'warning'); return; }
    const btn = document.getElementById('login-btn');
    if (btn) { btn.textContent = '⏳ Đang đăng nhập...'; btn.disabled = true; }
    try {
      const res = await API.post('/auth/login', { username, password });
      App.login(res.user, res.token);
      App.showToast(`Chào mừng, ${res.user.fullName}! 🎉`, 'success');
    } catch (err) {
      App.showToast(err.message, 'error');
      if (btn) { btn.textContent = '🚀 Đăng Nhập'; btn.disabled = false; }
    }
  },

  async register() {
    const fullName = document.getElementById('reg-fullname')?.value?.trim();
    const username = document.getElementById('reg-username')?.value?.trim();
    const email = document.getElementById('reg-email')?.value?.trim();
    const password = document.getElementById('reg-password')?.value;
    if (!fullName || !username || !password) { App.showToast('Vui lòng nhập đầy đủ thông tin', 'warning'); return; }
    try {
      const res = await API.post('/auth/register', { fullName, username, email, password });
      App.login(res.user, res.token);
      App.showToast('Tạo tài khoản thành công!', 'success');
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};

// ── DASHBOARD ──
const Dashboard = {
  async render() {
    const user = App.state.user;
    let projects = [];
    try {
      projects = await API.get('/projects');
    } catch (err) {
      App.showToast('Không tải được danh sách dự án: ' + err.message, 'error');
    }

    const content = document.getElementById('dashboard-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title">
          <h2>🏠 Trang Chủ</h2>
          <p>Chào mừng, <strong>${user.fullName || user.username}</strong>! Bạn có ${projects.length} dự án.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="Dashboard.showJoinModal()">🔑 Tham gia dự án</button>
          <button class="btn btn-primary" onclick="Dashboard.showCreateModal()">➕ Tạo dự án mới</button>
        </div>
      </div>
      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon purple">📁</div><div class="stat-info"><div class="value">${projects.length}</div><div class="label">Tổng dự án</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="value">${projects.filter(p=>p.status==='active').length}</div><div class="label">Đang hoạt động</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">👑</div><div class="stat-info"><div class="value">${projects.filter(p=>p.manager_id===user.id).length}</div><div class="label">Bạn là trưởng</div></div></div>
      </div>
      ${projects.length === 0 ? `
        <div class="empty-state"><div class="icon">📭</div><h3>Chưa có dự án nào</h3><p>Tạo dự án mới hoặc nhập mã dự án để tham gia</p></div>
      ` : `
        <h3 class="mb-4">📋 Danh Sách Dự Án</h3>
        <div class="dashboard-grid">${projects.map(p => this.renderProjectCard(p)).join('')}</div>
      `}
    `;
  },

  renderProjectCard(p) {
    const totalTasks = p.task_count || 0;
    const doneTasks = p.done_count || 0;
    const progress = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
    const daysLeft = App.getDaysLeft(p.end_date);
    const isOverdue = daysLeft !== null && daysLeft < 0;
    return `
      <div class="project-card" onclick="App.navigateProject('${p.code}')">
        <div class="project-code">🔑 ${p.code}</div>
        <h4 style="margin-bottom:8px">${p.name}</h4>
        <p class="text-sm text-muted" style="margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.description || 'Không có mô tả'}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="flex items-center justify-between text-xs text-muted mb-2"><span>Tiến độ</span><span>${progress}%</span></div>
        <div class="project-stats">
          <div class="project-stat"><div class="value">${totalTasks}</div><div class="label">Công việc</div></div>
          <div class="project-stat"><div class="value">${doneTasks}</div><div class="label">Hoàn thành</div></div>
          <div class="project-stat"><div class="value">${(p.member_count||0)+1}</div><div class="label">Thành viên</div></div>
        </div>
        <div class="divider"></div>
        <div class="flex items-center justify-between text-xs text-muted">
          <span>👑 ${p.manager_name || '—'}</span>
          <span style="color:${isOverdue?'var(--accent-red)':'var(--text-muted)'}">
            ${p.end_date ? (isOverdue ? '⚠️ Trễ '+Math.abs(daysLeft)+' ngày' : '📅 Còn '+daysLeft+' ngày') : 'Chưa có deadline'}
          </span>
        </div>
      </div>
    `;
  },

  showCreateModal() {
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên dự án *</label>
        <input type="text" id="proj-name" class="form-control" placeholder="VD: Hệ Thống Quản Lý Sinh Viên">
      </div>
      <div class="form-group"><label class="form-label">Mô tả dự án</label>
        <textarea id="proj-desc" class="form-control" rows="3" placeholder="Mô tả ngắn về mục tiêu dự án..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày bắt đầu</label><input type="date" id="proj-start" class="form-control"></div>
        <div class="form-group"><label class="form-label">Ngày kết thúc</label><input type="date" id="proj-end" class="form-control"></div>
      </div>
      <div class="form-group"><label class="form-label">Ngân sách (₫)</label>
        <input type="number" id="proj-budget" class="form-control number-input" placeholder="0">
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="Dashboard.createProject()">✨ Tạo Dự Án</button>
      </div>
    `, '➕ Tạo Dự Án Mới');
  },

  async createProject() {
    const name = document.getElementById('proj-name')?.value?.trim();
    if (!name) { App.showToast('Vui lòng nhập tên dự án', 'warning'); return; }
    try {
      const proj = await API.post('/projects', {
        name, description: document.getElementById('proj-desc')?.value,
        startDate: document.getElementById('proj-start')?.value,
        endDate: document.getElementById('proj-end')?.value,
        budget: document.getElementById('proj-budget')?.value || 0
      });
      App.closeModal();
      App.showToast(`Tạo dự án thành công! Mã: ${proj.code}`, 'success');
      await this.render();
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  showJoinModal() {
    App.openModal(`
      <div class="form-group">
        <label class="form-label">Nhập mã dự án</label>
        <input type="text" id="join-code" class="form-control font-mono" placeholder="PRJ-XXXXXX" style="font-size:1.4rem;text-align:center;letter-spacing:4px;text-transform:uppercase">
        <p class="text-xs text-muted mt-4">Nhập mã dự án được cấp bởi trưởng nhóm. Demo: <strong>PRJ-DEMO1</strong></p>
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="Dashboard.joinProject()">🔑 Tham Gia</button>
      </div>
    `, '🔑 Tham Gia Dự Án');
    document.getElementById('join-code')?.focus();
  },

  async joinProject() {
    const code = document.getElementById('join-code')?.value?.trim().toUpperCase();
    if (!code) { App.showToast('Vui lòng nhập mã dự án', 'warning'); return; }
    try {
      await API.post('/projects/join', { code });
      App.closeModal();
      App.showToast('Tham gia dự án thành công!', 'success');
      await this.render();
    } catch (err) { App.showToast(err.message, 'error'); }
  }
};

// ── PROJECT HOME ──
const ProjectHome = {
  async render() {
    const project = App.state.currentProject;
    if (!project) return;
    let tasks = [], members = [];
    try {
      [tasks, members] = await Promise.all([
        API.get('/projects/' + project.code + '/tasks'),
        API.get('/projects/' + project.code + '/members')
      ]);
    } catch (err) { console.error(err); }

    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'inprogress').length;
    const totalProgress = tasks.length > 0 ? Math.round(doneTasks / tasks.length * 100) : 0;

    document.getElementById('section-content').innerHTML = `
      <div class="page-header">
        <div class="page-title"><h2>📊 Tổng Quan Dự Án</h2><p>Xem nhanh tình trạng và tiến độ dự án</p></div>
        <button class="btn btn-secondary btn-sm" onclick="ProjectHome.showEditModal()">✏️ Chỉnh sửa</button>
      </div>
      <div class="project-code-display">
        <div><div class="text-xs text-muted mb-2">MÃ DỰ ÁN</div><div class="project-code-value">${project.code}</div></div>
        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${project.code}');App.showToast('Đã sao chép!','success')">📋 Sao chép</button>
        <div style="flex:1"></div>
        ${App.getStatusBadge(project.status)}
      </div>
      <div class="stats-row mb-6">
        <div class="stat-card"><div class="stat-icon purple">📋</div><div class="stat-info"><div class="value">${tasks.length}</div><div class="label">Tổng công việc</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">⚙️</div><div class="stat-info"><div class="value">${inProgress}</div><div class="label">Đang thực hiện</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="value">${doneTasks}</div><div class="label">Hoàn thành</div></div></div>
        <div class="stat-card"><div class="stat-icon yellow">👥</div><div class="stat-info"><div class="value">${members.length}</div><div class="label">Thành viên</div></div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <h4 class="mb-4">📈 Tiến Độ Tổng Thể</h4>
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:3rem;font-weight:800;background:var(--gradient-main);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${totalProgress}%</div>
            <p class="text-muted text-sm">Hoàn thành</p>
          </div>
          <div class="progress-bar" style="height:10px"><div class="progress-fill" style="width:${totalProgress}%;height:100%"></div></div>
        </div>
        <div class="card">
          <h4 class="mb-4">ℹ️ Thông Tin Dự Án</h4>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="flex justify-between"><span class="text-muted text-sm">Mô tả</span><span class="text-sm" style="text-align:right;max-width:60%">${project.description || '—'}</span></div>
            <div class="flex justify-between"><span class="text-muted text-sm">Bắt đầu</span><span class="text-sm">${App.formatDate(project.start_date)}</span></div>
            <div class="flex justify-between"><span class="text-muted text-sm">Kết thúc</span><span class="text-sm">${App.formatDate(project.end_date)}</span></div>
            <div class="flex justify-between"><span class="text-muted text-sm">Ngân sách</span><span class="text-sm text-purple">${project.budget ? App.formatCurrency(project.budget) : '—'}</span></div>
          </div>
        </div>
      </div>
      <div class="card mt-4">
        <div class="flex justify-between items-center mb-4">
          <h4>👥 Đội Dự Án</h4>
          <button class="btn btn-sm btn-secondary" onclick="ProjectHome.showAddMemberModal()">📋 Chia sẻ mã</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
          ${members.map(m => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-input);border-radius:var(--radius)">
              <div class="user-avatar" style="width:40px;height:40px;font-size:0.85rem">${(m.full_name||m.username).split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
              <div>
                <div class="text-sm font-bold">${m.full_name}</div>
                <div class="text-xs text-muted">${m.role === 'manager' ? '👑 Trưởng dự án' : '👤 Thành viên'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.section === 'overview'));
    App.state.currentSection = 'overview';
  },

  showEditModal() {
    const p = App.state.currentProject;
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên dự án *</label>
        <input type="text" id="edit-proj-name" class="form-control" value="${p.name}">
      </div>
      <div class="form-group"><label class="form-label">Mô tả</label>
        <textarea id="edit-proj-desc" class="form-control">${p.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày bắt đầu</label>
          <input type="date" id="edit-proj-start" class="form-control" value="${p.start_date?.split('T')[0] || ''}">
        </div>
        <div class="form-group"><label class="form-label">Ngày kết thúc</label>
          <input type="date" id="edit-proj-end" class="form-control" value="${p.end_date?.split('T')[0] || ''}">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Ngân sách (₫)</label>
        <input type="number" id="edit-proj-budget" class="form-control number-input" value="${p.budget || 0}">
      </div>
      <div class="form-group"><label class="form-label">Trạng thái</label>
        <select id="edit-proj-status" class="form-control">
          <option value="active" ${p.status==='active'?'selected':''}>Đang hoạt động</option>
          <option value="planning" ${p.status==='planning'?'selected':''}>Lên kế hoạch</option>
          <option value="completed" ${p.status==='completed'?'selected':''}>Hoàn thành</option>
        </select>
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="ProjectHome.saveEdit()">💾 Lưu</button>
      </div>
    `, '✏️ Chỉnh Sửa Dự Án');
  },

  async saveEdit() {
    const p = App.state.currentProject;
    try {
      const updated = await API.put('/projects/' + p.code, {
        name: document.getElementById('edit-proj-name')?.value?.trim(),
        description: document.getElementById('edit-proj-desc')?.value,
        startDate: document.getElementById('edit-proj-start')?.value,
        endDate: document.getElementById('edit-proj-end')?.value,
        budget: parseFloat(document.getElementById('edit-proj-budget')?.value) || 0,
        status: document.getElementById('edit-proj-status')?.value
      });
      App.state.currentProject = updated;
      document.getElementById('project-name-display').textContent = updated.name;
      App.closeModal();
      App.showToast('Đã cập nhật dự án!', 'success');
      this.render();
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  showAddMemberModal() {
    const p = App.state.currentProject;
    App.openModal(`
      <p class="text-sm text-muted mb-4">Chia sẻ mã dự án bên dưới cho thành viên. Họ đăng nhập và chọn <strong>"🔑 Tham gia dự án"</strong> để nhập mã.</p>
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:var(--radius);padding:20px;text-align:center">
        <div class="text-xs text-muted mb-2">MÃ DỰ ÁN</div>
        <div class="project-code-value" style="font-size:2rem">${p.code}</div>
      </div>
      <button class="btn btn-primary w-full mt-4" onclick="navigator.clipboard.writeText('${p.code}');App.showToast('Đã sao chép!','success')">📋 Sao chép mã dự án</button>
    `, '👥 Thêm Thành Viên');
  }
};
