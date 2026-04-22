// ============================================================
// CHỨC NĂNG 3: Ước Lượng Chi Phí Dự Án
// Author: Phạm Quốc Nguyên
// ============================================================

const CostEst = {
  normalizeUnit(unit) {
    const cleaned = (unit || '').trim();
    if (!cleaned) return 'hạng mục';
    const normalized = cleaned.toLowerCase();
    if (normalized === 'lan' || normalized === 'lần') return 'hạng mục';
    return cleaned;
  },

  async render(projectCode) {
    if (!projectCode) return;
    document.getElementById('section-content').innerHTML = `<div class="loading-spinner"></div>`;
    let items = [], overheadRate = 15;
    try {
      const data = await API.get('/projects/' + projectCode + '/costs');
      items = data.items || [];
      overheadRate = data.overheadRate ?? 15;
    } catch (err) { App.showToast(err.message, 'error'); }
    this._renderWithData(projectCode, items, overheadRate);
  },

  _renderWithData(projectCode, items, overheadRate) {
    const categories = {
      labor: { label: 'Nhân công', icon: '👷', color: '#7c3aed', items: [] },
      tools: { label: 'Công cụ & Phần mềm', icon: '🛠️', color: '#2563eb', items: [] },
      infrastructure: { label: 'Hạ tầng & Server', icon: '🖥️', color: '#06b6d4', items: [] },
      other: { label: 'Khác', icon: '📦', color: '#64748b', items: [] }
    };
    items.forEach(item => {
      const cat = item.category;
      if (categories[cat]) categories[cat].items.push(item);
      else categories.other.items.push(item);
    });
    const catTotals = {};
    Object.keys(categories).forEach(k => {
      catTotals[k] = categories[k].items.reduce((s, i) => s + (parseInt(i.total) || 0), 0);
    });
    const subtotal = Object.values(catTotals).reduce((s, v) => s + v, 0);
    const overheadAmt = subtotal * overheadRate / 100;
    const grandTotal = subtotal + overheadAmt;

    document.getElementById('section-content').innerHTML = `
      <div class="page-header">
        <div class="page-title">
          <h2>💰 Ước Lượng Chi Phí</h2>
          <p>Quản lý và ước tính chi phí toàn bộ dự án</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="CostEst.showOverheadModal('${projectCode}',${overheadRate})">⚙️ Overhead (${overheadRate}%)</button>
          <button class="btn btn-primary" onclick="CostEst.showAddModal('${projectCode}')">➕ Thêm khoản chi</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="cost-summary">
        ${Object.entries(categories).map(([k, cat]) => `
          <div class="card" style="border-color:${cat.color}30;text-align:center">
            <div style="font-size:1.8rem;margin-bottom:8px">${cat.icon}</div>
            <div style="font-size:1.2rem;font-weight:800;color:${cat.color}">${App.formatCurrency(catTotals[k])}</div>
            <div class="text-sm text-muted">${cat.label}</div>
            <div class="text-xs text-secondary mt-1">${categories[k].items.length} khoản</div>
          </div>
        `).join('')}
      </div>

      <!-- Grand Total Banner -->
      <div style="background:var(--gradient-main);border-radius:var(--radius-lg);padding:24px 32px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div>
          <div class="text-sm" style="opacity:0.8">TỔNG CHI PHÍ DỰ ÁN (bao gồm overhead ${overheadRate}%)</div>
          <div style="font-size:2.2rem;font-weight:800;margin-top:4px">${App.formatCurrency(grandTotal)}</div>
        </div>
        <div style="text-align:right">
          <div class="text-sm" style="opacity:0.8">Chi phí trực tiếp: ${App.formatCurrency(subtotal)}</div>
          <div class="text-sm" style="opacity:0.8">Overhead (${overheadRate}%): ${App.formatCurrency(overheadAmt)}</div>
        </div>
      </div>

      <!-- Chart + Breakdown -->
      ${items.length > 0 ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
        <div class="card">
          <h4 class="mb-4">📊 Phân Bổ Chi Phí</h4>
          <canvas id="cost-chart" width="300" height="250"></canvas>
        </div>
        <div class="card">
          <h4 class="mb-4">📈 Tỷ Lệ Chi Phí</h4>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            ${Object.entries(categories).map(([k, cat]) => {
              const pct = grandTotal > 0 ? (catTotals[k] / grandTotal * 100).toFixed(1) : 0;
              return catTotals[k] > 0 ? `
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span>${cat.icon} ${cat.label}</span>
                    <span style="color:${cat.color}">${pct}% — ${App.formatCurrency(catTotals[k])}</span>
                  </div>
                  <div class="progress-bar" style="height:8px"><div style="height:100%;width:${pct}%;background:${cat.color};border-radius:4px;transition:width 0.4s"></div></div>
                </div>` : '';
            }).join('')}
            ${overheadAmt > 0 ? `
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span>🏢 Overhead (${overheadRate}%)</span>
                <span style="color:var(--accent-yellow)">${(overheadAmt/grandTotal*100).toFixed(1)}% — ${App.formatCurrency(overheadAmt)}</span>
              </div>
              <div class="progress-bar" style="height:8px"><div style="height:100%;width:${(overheadAmt/grandTotal*100)}%;background:var(--accent-yellow);border-radius:4px"></div></div>
            </div>` : ''}
          </div>
        </div>
      </div>` : ''}

      <!-- Category Tables -->
      ${Object.entries(categories).map(([k, cat]) =>
        cat.items.length > 0 ? `
        <div class="card mb-4">
          <h4 class="mb-4">${cat.icon} ${cat.label}
            <span class="text-sm text-muted font-mono ml-2">${App.formatCurrency(catTotals[k])}</span>
          </h4>
          <div style="overflow-x:auto">
            <table class="wbs-table cost-table">
              <thead>
                <tr><th class="text-center">STT</th><th class="text-left">Tên khoản chi</th><th class="text-left">Đơn vị</th><th class="text-right">Số lượng</th><th class="text-right">Đơn giá</th><th class="text-right">Thành tiền</th><th class="text-left">Ghi chú</th><th class="text-center">Thao tác</th></tr>
              </thead>
              <tbody>
                ${cat.items.map((item, i) => `
                  <tr>
                    <td class="text-center text-muted">${i+1}</td>
                    <td class="text-left font-bold">${item.name}</td>
                    <td class="text-left">${this.normalizeUnit(item.unit)}</td>
                    <td class="text-right">${parseFloat(item.quantity).toLocaleString('vi-VN')}</td>
                    <td class="text-right font-mono">${App.formatCurrency(item.unit_price || item.unitPrice)}</td>
                    <td class="text-right font-bold font-mono" style="color:${cat.color}">${App.formatCurrency(item.total)}</td>
                    <td class="text-left text-sm text-muted">${item.note || '—'}</td>
                    <td class="text-center">
                      <div style="display:flex;gap:4px;justify-content:center">
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="CostEst.showEditModal('${projectCode}',${item.id})">✏️</button>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="CostEst.deleteItem('${projectCode}',${item.id})">🗑️</button>
                      </div>
                    </td>
                  </tr>`).join('')}
                <tr style="background:rgba(255,255,255,0.04)">
                  <td colspan="5" class="text-right font-bold">Tổng ${cat.label}:</td>
                  <td class="text-right font-bold" style="color:${cat.color}">${App.formatCurrency(catTotals[k])}</td>
                  <td colspan="2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>` : ''
      ).join('')}

      <!-- Summary Footer -->
      <div class="card">
        <h4 class="mb-4">📋 Tóm Tắt Chi Phí</h4>
        <table style="width:100%;border-collapse:collapse">
          ${Object.entries(categories).map(([k, cat]) => catTotals[k] > 0 ? `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 0;color:var(--text-secondary)">${cat.icon} ${cat.label}</td>
              <td style="padding:10px 0;text-align:right;font-family:'JetBrains Mono',monospace">${App.formatCurrency(catTotals[k])}</td>
            </tr>` : '').join('')}
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:10px 0;color:var(--text-secondary)">🏢 Overhead (${overheadRate}%)</td>
            <td style="padding:10px 0;text-align:right;color:var(--accent-yellow);font-family:monospace">${App.formatCurrency(overheadAmt)}</td>
          </tr>
          <tr>
            <td style="padding:14px 0;font-weight:800;font-size:1.1rem">💰 TỔNG CHI PHÍ DỰ ÁN</td>
            <td style="padding:14px 0;text-align:right;font-weight:800;font-size:1.2rem;font-family:monospace;background:var(--gradient-main);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${App.formatCurrency(grandTotal)}</td>
          </tr>
        </table>
      </div>

      ${items.length === 0 ? `<div class="empty-state"><div class="icon">💰</div><h3>Chưa có khoản chi phí nào</h3><p>Thêm các khoản chi phí nhân công, công cụ, hạ tầng...</p></div>` : ''}
    `;
    if (items.length > 0) setTimeout(() => this.drawChart(catTotals, grandTotal), 100);
  },

  drawChart(catTotals, total) {
    const canvas = document.getElementById('cost-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const categories = [
      { key: 'labor', label: 'Nhân công', color: '#7c3aed' },
      { key: 'tools', label: 'Công cụ', color: '#2563eb' },
      { key: 'infrastructure', label: 'Hạ tầng', color: '#06b6d4' },
      { key: 'other', label: 'Khác', color: '#64748b' }
    ].filter(c => catTotals[c.key] > 0);
    const cx = W / 2 - 30, cy = H / 2 + 10;
    const radius = Math.min(cx, cy) - 20;
    let startAngle = -Math.PI / 2;
    categories.forEach(cat => {
      const slice = (catTotals[cat.key] / total) * 2 * Math.PI;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.closePath(); ctx.fillStyle = cat.color; ctx.fill();
      ctx.strokeStyle = '#0a0a1a'; ctx.lineWidth = 3; ctx.stroke();
      startAngle += slice;
    });
    ctx.beginPath(); ctx.arc(cx, cy, radius * 0.55, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f0f2a'; ctx.fill();
    ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Chi phí', cx, cy - 6);
    ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 10px Inter'; ctx.fillText('dự án', cx, cy + 10);
    let legendY = 20;
    const legendX = W - 90;
    categories.forEach(cat => {
      ctx.fillStyle = cat.color; ctx.fillRect(legendX, legendY, 12, 12);
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
      ctx.fillText(cat.label, legendX + 16, legendY + 10);
      ctx.fillStyle = cat.color; ctx.font = 'bold 10px Inter';
      ctx.fillText((catTotals[cat.key] / total * 100).toFixed(0) + '%', legendX + 16, legendY + 22);
      legendY += 36;
    });
  },

  showAddModal(projectCode) {
    App.openModal(`
      <div class="form-group"><label class="form-label">Danh mục *</label>
        <select id="cost-cat" class="form-control">
          <option value="labor">👷 Nhân công</option>
          <option value="tools">🛠️ Công cụ & Phần mềm</option>
          <option value="infrastructure">🖥️ Hạ tầng & Server</option>
          <option value="other">📦 Khác</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Tên khoản chi *</label>
        <input type="text" id="cost-name" class="form-control" placeholder="VD: Lương lập trình viên">
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Đơn vị</label>
          <input type="text" id="cost-unit" class="form-control" placeholder="VD: giờ, tháng, bộ">
        </div>
        <div class="form-group"><label class="form-label">Số lượng *</label>
          <input type="number" id="cost-qty" class="form-control number-input" placeholder="0" min="0" step="0.5" oninput="CostEst.calcTotal()">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Đơn giá (₫) *</label>
        <input type="number" id="cost-price" class="form-control number-input" placeholder="0" min="0" oninput="CostEst.calcTotal()">
      </div>
      <div id="cost-total-preview" style="display:none;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:var(--radius);padding:12px;text-align:center;margin-bottom:16px">
        <span class="text-sm text-muted">Thành tiền: </span><span id="cost-total-val" class="font-bold text-purple font-mono">—</span>
      </div>
      <div class="form-group"><label class="form-label">Ghi chú</label>
        <input type="text" id="cost-note" class="form-control" placeholder="Ghi chú...">
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="CostEst.addItem('${projectCode}')">✅ Thêm</button>
      </div>
    `, '➕ Thêm Khoản Chi Phí');
  },

  calcTotal() {
    const qty = parseFloat(document.getElementById('cost-qty')?.value) || 0;
    const price = parseFloat(document.getElementById('cost-price')?.value) || 0;
    const preview = document.getElementById('cost-total-preview');
    const val = document.getElementById('cost-total-val');
    if (qty && price && preview && val) {
      preview.style.display = 'block';
      val.textContent = App.formatCurrency(qty * price);
    }
  },

  async addItem(projectCode) {
    const name = document.getElementById('cost-name')?.value?.trim();
    const qty = parseFloat(document.getElementById('cost-qty')?.value);
    const price = parseFloat(document.getElementById('cost-price')?.value);
    if (!name || isNaN(qty) || isNaN(price)) { App.showToast('Vui lòng nhập đầy đủ thông tin', 'warning'); return; }
    try {
      await API.post('/projects/' + projectCode + '/costs', {
        category: document.getElementById('cost-cat')?.value,
        name, unit: this.normalizeUnit(document.getElementById('cost-unit')?.value),
        quantity: qty, unitPrice: price,
        note: document.getElementById('cost-note')?.value
      });
      App.closeModal(); App.showToast('Đã thêm khoản chi phí!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async showEditModal(projectCode, id) {
    let items = [];
    try { const d = await API.get('/projects/' + projectCode + '/costs'); items = d.items || []; } catch {}
    const item = items.find(c => c.id == id);
    if (!item) return;
    App.openModal(`
      <div class="form-group"><label class="form-label">Danh mục</label>
        <select id="ecost-cat" class="form-control">
          <option value="labor" ${item.category==='labor'?'selected':''}>👷 Nhân công</option>
          <option value="tools" ${item.category==='tools'?'selected':''}>🛠️ Công cụ</option>
          <option value="infrastructure" ${item.category==='infrastructure'?'selected':''}>🖥️ Hạ tầng</option>
          <option value="other" ${item.category==='other'?'selected':''}>📦 Khác</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Tên khoản chi *</label>
        <input type="text" id="ecost-name" class="form-control" value="${item.name}">
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Đơn vị</label>
          <input type="text" id="ecost-unit" class="form-control" value="${item.unit || ''}">
        </div>
        <div class="form-group"><label class="form-label">Số lượng</label>
          <input type="number" id="ecost-qty" class="form-control number-input" value="${item.quantity}">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Đơn giá (₫)</label>
        <input type="number" id="ecost-price" class="form-control number-input" value="${item.unit_price || item.unitPrice}">
      </div>
      <div class="form-group"><label class="form-label">Ghi chú</label>
        <input type="text" id="ecost-note" class="form-control" value="${item.note || ''}">
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="CostEst.saveEdit('${projectCode}',${id})">💾 Lưu</button>
      </div>
    `, '✏️ Sửa Khoản Chi Phí');
  },

  async saveEdit(projectCode, id) {
    const name = document.getElementById('ecost-name')?.value?.trim();
    if (!name) { App.showToast('Vui lòng nhập tên', 'warning'); return; }
    try {
      await API.put('/projects/' + projectCode + '/costs/' + id, {
        category: document.getElementById('ecost-cat')?.value,
        name, unit: this.normalizeUnit(document.getElementById('ecost-unit')?.value),
        quantity: parseFloat(document.getElementById('ecost-qty')?.value) || 0,
        unitPrice: parseFloat(document.getElementById('ecost-price')?.value) || 0,
        note: document.getElementById('ecost-note')?.value
      });
      App.closeModal(); App.showToast('Đã cập nhật!', 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async deleteItem(projectCode, id) {
    if (!confirm('Xóa khoản chi phí này?')) return;
    try {
      await API.delete('/projects/' + projectCode + '/costs/' + id);
      App.showToast('Đã xóa', 'info'); this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  showOverheadModal(projectCode, current) {
    App.openModal(`
      <p class="text-sm text-muted mb-4">Chi phí overhead là chi phí gián tiếp: quản lý, điện, văn phòng, rủi ro... (thường 10–25%)</p>
      <div class="form-group"><label class="form-label">Tỷ lệ Overhead (%)</label>
        <input type="number" id="overhead-rate" class="form-control number-input" value="${current}" min="0" max="100" step="1">
      </div>
      <div class="modal-footer" style="padding:0;border:none;margin-top:20px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="CostEst.saveOverhead('${projectCode}')">💾 Lưu</button>
      </div>
    `, '⚙️ Cài Đặt Overhead');
  },

  async saveOverhead(projectCode) {
    const rate = parseFloat(document.getElementById('overhead-rate')?.value) || 0;
    try {
      await API.put('/projects/' + projectCode + '/costs/overhead/rate', { rate });
      App.closeModal(); App.showToast(`Overhead: ${rate}% đã cập nhật!`, 'success');
      this.render(projectCode);
    } catch (err) { App.showToast(err.message, 'error'); }
  }
};
