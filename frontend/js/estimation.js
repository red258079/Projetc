// ============================================================
// CHỨC NĂNG 2: Ước Lượng Thời Gian Expert (3 điểm O-M-P)
// Author: Bùi Đức Thuần
// ============================================================

const Estimation = {
  async render(projectCode) {
    if (!projectCode) return;
    // Show loading
    const sEl = document.getElementById('section-content');
    if (sEl) sEl.innerHTML = `<div class="loading-spinner"></div>`;
    let items = [];
    try { items = await API.get('/projects/' + projectCode + '/estimations'); } catch (e) { App.showToast(e.message,'error'); }
    this._renderWithData(projectCode, items);
  },
  _renderWithData(projectCode, items) {

    // Calculate totals
    const totalE = items.reduce((s, i) => s + i.expected, 0);
    const totalVariance = items.reduce((s, i) => s + i.variance, 0);
    const totalSD = Math.sqrt(totalVariance);
    const ci95Low = totalE - 1.96 * totalSD;
    const ci95High = totalE + 1.96 * totalSD;

    const sectionEl = document.getElementById('section-content');
    sectionEl.innerHTML = `
      <div class="page-header">
        <div class="page-title">
          <h2>⏱️ Ước Lượng Thời Gian Expert</h2>
          <p>Phương pháp ước lượng 3 điểm (O-M-P): E = (O + 4M + P) / 6</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="Estimation.importFromTasks('${projectCode}')">📥 Import từ công việc</button>
          <button class="btn btn-primary" onclick="Estimation.showAddModal('${projectCode}')">➕ Thêm ước lượng</button>
        </div>
      </div>


      <!-- Summary Stats -->
      ${items.length > 0 ? `
      <div class="stats-row mb-6">
        <div class="stat-card">
          <div class="stat-icon purple">📋</div>
          <div class="stat-info"><div class="value">${items.length}</div><div class="label">Số công việc</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">⏰</div>
          <div class="stat-info">
            <div class="value">${totalE.toFixed(1)}</div>
            <div class="label">Tổng E (${items[0]?.unit || 'ngày'})</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">🎯</div>
          <div class="stat-info">
            <div class="value text-sm">${ci95Low.toFixed(1)} – ${ci95High.toFixed(1)}</div>
            <div class="label">CI 95% (${items[0]?.unit || 'ngày'})</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Estimation Table -->
      <div class="card" style="overflow-x:auto">
        ${items.length === 0 ? `
          <div class="empty-state">
            <div class="icon">⏱️</div>
            <h3>Chưa có ước lượng nào</h3>
            <p>Thêm ước lượng Expert hoặc import từ danh sách công việc</p>
          </div>
        ` : `
          <div class="flex justify-between items-center mb-4">
            <h4>📊 Bảng Ước Lượng Chi Tiết</h4>
            <button class="btn btn-sm btn-secondary" onclick="Estimation.printTable()">🖨️ In báo cáo</button>
          </div>
          <table class="estimation-table">
            <thead>
              <tr>
                <th class="text-left">STT</th>
                <th class="text-left" style="min-width:180px">Tên công việc</th>
                <th>Đơn vị</th>
                <th title="Optimistic - Lạc quan nhất">O (Lạc quan)</th>
                <th title="Most Likely - Khả năng cao nhất">M (Khả năng)</th>
                <th title="Pessimistic - Bi quan nhất">P (Bi quan)</th>
                <th title="E = (O+4M+P)/6">E (Kỳ vọng)</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr>
                  <td class="text-secondary">${idx + 1}</td>
                  <td class="text-left font-bold">${item.taskName}</td>
                  <td>${item.unit}</td>
                  <td style="color:var(--accent-green)">${item.optimistic}</td>
                  <td style="color:var(--accent-cyan)">${item.mostLikely}</td>
                  <td style="color:var(--accent-red)">${item.pessimistic}</td>
                  <td class="result-highlight">${item.expected}</td>
                  <td class="text-left text-sm text-muted">${item.note || '—'}</td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-sm btn-secondary btn-icon" onclick="Estimation.showEditModal('${projectCode}','${item.id}')">✏️</button>
                      <button class="btn btn-sm btn-danger btn-icon" onclick="Estimation.deleteItem('${projectCode}','${item.id}')">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="text-left font-bold">TỔNG CỘNG</td>
                <td class="result-highlight">${totalE.toFixed(2)}</td>
                <td colspan="2"></td>
              </tr>
              <tr>
                <td colspan="6" class="text-left font-bold" style="color:var(--accent-green)">Khoảng tin cậy 95%</td>
                <td colspan="3" class="result-highlight" style="text-align:left">
                  [${ci95Low.toFixed(2)} ; ${ci95High.toFixed(2)}] ${items[0]?.unit || 'ngày'}
                </td>
              </tr>
            </tfoot>
          </table>
        `}
      </div>

      <!-- Interpretation -->
      ${items.length > 0 ? `
      <div class="card mt-4">
        <h4 class="mb-4">📝 Diễn Giải Kết Quả</h4>
        <div style="display:grid;gap:12px">
          <div style="display:flex;align-items:flex-start;gap:12px;padding:16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius)">
            <span style="font-size:1.4rem">✅</span>
            <div>
              <div class="font-bold text-success mb-1">Thời gian ước lượng: ${totalE.toFixed(1)} ${items[0]?.unit || 'ngày'}</div>
              <div class="text-sm text-secondary">Đây là thời gian kỳ vọng của toàn bộ dự án theo phương pháp PERT 3 điểm</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;padding:16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius)">
            <span style="font-size:1.4rem">⚠️</span>
            <div>
              <div class="font-bold text-warning mb-1">Độ không chắc chắn: ±${(1.96 * totalSD).toFixed(1)} ${items[0]?.unit || 'ngày'}</div>
              <div class="text-sm text-secondary">Với xác suất 95%, dự án sẽ hoàn thành trong ${ci95Low.toFixed(1)} đến ${ci95High.toFixed(1)} ${items[0]?.unit || 'ngày'}</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;padding:16px;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:var(--radius)">
            <span style="font-size:1.4rem">💡</span>
            <div>
              <div class="font-bold text-purple mb-1">Khuyến nghị: Thêm ${Math.ceil(totalSD * 1.5).toFixed(0)} ${items[0]?.unit || 'ngày'} dự phòng</div>
              <div class="text-sm text-secondary">Nên lập kế hoạch với thời gian dự phòng ≈ 1.5SD để tăng độ tin cậy</div>
            </div>
          </div>
        </div>
      </div>
      ` : ''}
    `;
  },

  showAddModal(projectCode) {
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên công việc *</label>
        <input type="text" id="est-taskname" class="form-control" placeholder="VD: Phân tích yêu cầu">
      </div>
      <div class="form-group"><label class="form-label">Đơn vị thời gian</label>
        <select id="est-unit" class="form-control">
          <option value="ngày">Ngày</option>
        </select>
      </div>
      <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:var(--radius);padding:16px;margin-bottom:20px">
        <div class="text-xs text-muted mb-3">💡 O = Lạc quan nhất &nbsp;|&nbsp; M = Khả năng cao nhất &nbsp;|&nbsp; P = Bi quan nhất</div>
        <div class="form-row">
          <div class="form-group" style="margin:0">
            <label class="form-label" style="color:var(--accent-green)">O - Lạc quan *</label>
            <input type="number" id="est-o" class="form-control number-input" placeholder="0" min="0" step="0.5" oninput="Estimation.calcPreview()">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label" style="color:var(--accent-cyan)">M - Khả năng nhất *</label>
            <input type="number" id="est-m" class="form-control number-input" placeholder="0" min="0" step="0.5" oninput="Estimation.calcPreview()">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label" style="color:var(--accent-red)">P - Bi quan *</label>
            <input type="number" id="est-p" class="form-control number-input" placeholder="0" min="0" step="0.5" oninput="Estimation.calcPreview()">
          </div>
        </div>
      </div>
      <!-- Live Preview -->
      <div id="est-preview" style="display:none;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:var(--radius);padding:16px;margin-bottom:16px">
        <div class="text-sm font-bold text-purple mb-2">📊 Kết quả tính toán</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;text-align:center">
          <div><div class="font-mono font-bold text-purple" id="preview-e">—</div><div class="text-xs text-muted">E (kỳ vọng)</div></div>
          <div><div class="font-mono font-bold text-warning" id="preview-sd">—</div><div class="text-xs text-muted">SD (lệch chuẩn)</div></div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Ghi chú</label>
        <input type="text" id="est-note" class="form-control" placeholder="Ghi chú thêm...">
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="Estimation.addItem('${projectCode}')">✅ Thêm</button>
      </div>
    `, '➕ Thêm Ước Lượng Expert');
  },

  calcPreview() {
    const O = parseFloat(document.getElementById('est-o')?.value) || 0;
    const M = parseFloat(document.getElementById('est-m')?.value) || 0;
    const P = parseFloat(document.getElementById('est-p')?.value) || 0;
    if (O || M || P) {
      const E = (O + 4 * M + P) / 6;
      const SD = (P - O) / 6;
      document.getElementById('est-preview').style.display = 'block';
      document.getElementById('preview-e').textContent = E.toFixed(2);
      document.getElementById('preview-sd').textContent = SD.toFixed(2);
      document.getElementById('preview-var').textContent = (SD * SD).toFixed(2);
    }
  },

  async addItem(projectCode) {
    const taskName = document.getElementById('est-taskname')?.value?.trim();
    const O = parseFloat(document.getElementById('est-o')?.value);
    const M = parseFloat(document.getElementById('est-m')?.value);
    const P = parseFloat(document.getElementById('est-p')?.value);
    if (!taskName) { App.showToast('Vui lòng nhập tên công việc', 'warning'); return; }
    if (isNaN(O) || isNaN(M) || isNaN(P)) { App.showToast('Vui lòng nhập đầy đủ O, M, P', 'warning'); return; }
    if (O > M || M > P) { App.showToast('Phải có O ≤ M ≤ P', 'warning'); return; }
    try {
      await API.post('/projects/' + projectCode + '/estimations', {
        taskName, optimistic: O, mostLikely: M, pessimistic: P,
        unit: document.getElementById('est-unit')?.value || 'ngày',
        note: document.getElementById('est-note')?.value || ''
      });
      App.closeModal();
      App.showToast('Đã thêm ước lượng!', 'success');
      this.render(projectCode);
    } catch(err) { App.showToast(err.message,'error'); }
  },

  async showEditModal(projectCode, id) {
    let items = [];
    try { items = await API.get('/projects/' + projectCode + '/estimations'); } catch {}
    const item = items.find(e => e.id == id);
    if (!item) return;
    App.openModal(`
      <div class="form-group"><label class="form-label">Tên công việc *</label>
        <input type="text" id="eest-taskname" class="form-control" value="${item.taskName}">
      </div>
      <div class="form-group"><label class="form-label">Đơn vị</label>
        <select id="eest-unit" class="form-control">
          <option value="ngày">Ngày</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" style="color:var(--accent-green)">O (Lạc quan)</label>
          <input type="number" id="eest-o" class="form-control number-input" value="${item.optimistic}" step="0.5">
        </div>
        <div class="form-group"><label class="form-label" style="color:var(--accent-cyan)">M (Khả năng nhất)</label>
          <input type="number" id="eest-m" class="form-control number-input" value="${item.mostLikely}" step="0.5">
        </div>
        <div class="form-group"><label class="form-label" style="color:var(--accent-red)">P (Bi quan)</label>
          <input type="number" id="eest-p" class="form-control number-input" value="${item.pessimistic}" step="0.5">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Ghi chú</label>
        <input type="text" id="eest-note" class="form-control" value="${item.note || ''}">
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="Estimation.saveEdit('${projectCode}','${id}')">💾 Lưu</button>
      </div>
    `, '✏️ Sửa Ước Lượng');
  },

  async saveEdit(projectCode, id) {
    const taskName = document.getElementById('eest-taskname')?.value?.trim();
    const O = parseFloat(document.getElementById('eest-o')?.value);
    const M = parseFloat(document.getElementById('eest-m')?.value);
    const P = parseFloat(document.getElementById('eest-p')?.value);
    if (!taskName || isNaN(O) || isNaN(M) || isNaN(P)) { App.showToast('Vui lòng nhập đầy đủ', 'warning'); return; }
    try {
      await API.put('/projects/' + projectCode + '/estimations/' + id, {
        taskName, optimistic: O, mostLikely: M, pessimistic: P,
        unit: document.getElementById('eest-unit')?.value,
        note: document.getElementById('eest-note')?.value
      });
      App.closeModal();
      App.showToast('Đã cập nhật!', 'success');
      this.render(projectCode);
    } catch(err) { App.showToast(err.message,'error'); }
  },

  async deleteItem(projectCode, id) {
    if (!confirm('Xóa mục ước lượng này?')) return;
    try {
      await API.delete('/projects/' + projectCode + '/estimations/' + id);
      App.showToast('Đã xóa', 'info');
      this.render(projectCode);
    } catch(err) { App.showToast(err.message,'error'); }
  },

  async importFromTasks(projectCode) {
    try {
      const tasks = await API.get('/projects/' + projectCode + '/tasks');
      const items = await API.get('/projects/' + projectCode + '/estimations');
      const existing = items.map(e => e.taskName || e.task_name);
      const eligible = tasks.filter(t => !t.parent_id && (t.estimated_hours||0) > 0);
      if (eligible.length === 0) { App.showToast('Không có công việc nào có giờ ước tính', 'warning'); return; }
      let added = 0;
      for (const task of eligible) {
        if (!existing.includes(task.title)) {
          const h = parseFloat(task.estimated_hours);
          await API.post('/projects/' + projectCode + '/estimations', {
            taskName: task.title,
            optimistic: Math.round(h*0.7*10)/10,
            mostLikely: h,
            pessimistic: Math.round(h*1.5*10)/10,
            unit: 'ngày', note: 'Import từ bảng công việc'
          });
          added++;
        }
      }
      if (added > 0) { App.showToast(`Đã import ${added} công việc!`, 'success'); this.render(projectCode); }
      else App.showToast('Tất cả công việc đã có ước lượng rồi', 'info');
    } catch(err) { App.showToast(err.message,'error'); }
  },

  printTable() {
    window.print();
  }
};
