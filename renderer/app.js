// ============================================================
// 快递管理 — 前端逻辑 (Web 版)
// ============================================================

// ============================================================
// 粒子特效系统
// ============================================================
(function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['#007AFF', '#5AC8FA', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FFD60A'];

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 8;
      this.vy = (Math.random() - 0.5) * 8 - 2;
      this.radius = Math.random() * 5 + 2;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.life = 1;
      this.decay = Math.random() * 0.02 + 0.015;
      this.gravity = 0.06;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.98;
      this.life -= this.decay;
      this.radius *= 0.985;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.life;
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    get dead() { return this.life <= 0; }
  }

  function spawn(x, y, count = 18) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y));
    }
    if (!animId) loop();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => !p.dead);
    particles.forEach(p => {
      p.update();
      p.draw(ctx);
    });
    if (particles.length > 0) {
      animId = requestAnimationFrame(loop);
    } else {
      animId = null;
    }
  }

  // 在可交互元素点击时触发粒子
  document.addEventListener('click', (e) => {
    const target = e.target;
    const interactive = target.closest('.btn, .card, .card-status, .date-item, .btn-copy, .detail-status-badge');
    if (interactive) {
      spawn(e.clientX, e.clientY, 14);
    }
  });

  // 暴露 API 供主动调用
  window._particles = { spawn };
})();

// --- API 封装 ---
const API = {
  async request(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[API]', url, err);
      throw err;
    }
  },

  getPackages() { return this.request('/api/packages'); },

  searchPackages(keyword) {
    return this.request(`/api/packages/search?q=${encodeURIComponent(keyword)}`);
  },

  getDates() { return this.request('/api/packages/dates'); },

  insertPackage(pkg) {
    return this.request('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pkg),
    });
  },

  updatePackage(id, pkg) {
    return this.request(`/api/packages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pkg),
    });
  },

  deletePackage(id) {
    return this.request(`/api/packages/${id}`, { method: 'DELETE' });
  },

  toggleStatus(id) {
    return this.request(`/api/packages/${id}/toggle`, { method: 'PATCH' });
  },

  uploadPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64 = reader.result.split(',')[1];
          const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
          fetch('/api/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: base64, ext }),
          })
            .then(r => r.json())
            .then(resolve)
            .catch(reject);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  deletePhoto(photoPath) {
    return this.request('/api/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: photoPath }),
    });
  },
};

// ============================================================
// State
// ============================================================
let allPackages = [];
let filteredPackages = [];
let currentFilter = 'all';
let editingId = null;
let pendingPhotoPath = null; // 当前正在上传的照片路径

// ============================================================
// DOM helpers
// ============================================================
function $(sel) {
  const el = document.querySelector(sel);
  if (!el) console.warn('[DOM] Element not found:', sel);
  return el;
}
function $$(sel) { return document.querySelectorAll(sel); }

// ============================================================
// 初始化
// ============================================================
async function init() {
  console.log('[Init] Starting...');
  try {
    await loadData();
    console.log('[Init] Data loaded:', allPackages.length, 'records');
    renderDateList();
    renderContent();
    bindEvents();
    console.log('[Init] Ready');
  } catch (err) {
    console.error('[Init] Failed:', err);
    showToast('初始化失败，请刷新页面重试');
  }
}

async function loadData() {
  allPackages = await API.getPackages();
  if (!Array.isArray(allPackages)) {
    console.error('[Load] Invalid data:', allPackages);
    allPackages = [];
  }
  applyFilter();
}

function applyFilter() {
  const keyword = (searchInput.value || '').trim().toLowerCase();
  let list = allPackages;

  if (currentFilter !== 'all') {
    list = list.filter(p => p.created_date === currentFilter);
  }

  if (keyword) {
    list = list.filter(p =>
      (p.recipient || '').toLowerCase().includes(keyword) ||
      (p.phone || '').toLowerCase().includes(keyword) ||
      (p.pickup_code || '').toLowerCase().includes(keyword) ||
      (p.tracking_number || '').toLowerCase().includes(keyword)
    );
  }

  filteredPackages = list;
}

// ============================================================
// 渲染
// ============================================================
function renderDateList() {
  const dates = new Set(allPackages.map(p => p.created_date));
  const sorted = [...dates].sort().reverse();
  const months = new Map();

  sorted.forEach(d => {
    const m = d.slice(0, 7);
    if (!months.has(m)) months.set(m, []);
    months.get(m).push(d);
  });

  let html = '<li class="date-item active" data-date="all">全部</li>';
  months.forEach((days, month) => {
    html += `<li class="date-month-label">${month}</li>`;
    days.forEach(day => {
      html += `<li class="date-item" data-date="${day}">${day.slice(8)} 日</li>`;
    });
  });

  dateListEl.innerHTML = html;
  dateListEl.querySelectorAll('.date-item').forEach(el => {
    if (el.dataset.date === currentFilter) el.classList.add('active');
  });
}

function renderContent() {
  if (!filteredPackages.length) {
    contentEl.innerHTML = '';
    contentEl.appendChild(createEmptyState());
    return;
  }

  contentEl.innerHTML = '';
  const groups = new Map();
  filteredPackages.forEach(p => {
    if (!groups.has(p.created_date)) groups.set(p.created_date, []);
    groups.get(p.created_date).push(p);
  });

  groups.forEach((pkgs, date) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'date-group';
    groupEl.innerHTML = `
      <div class="date-group-header">
        <span>${date}</span>
        <span class="date-group-count">${pkgs.length} 件</span>
      </div>
      <div class="card-grid">${pkgs.map(p => renderCard(p)).join('')}</div>
    `;
    contentEl.appendChild(groupEl);
  });

  // 卡片点击 → 详情
  contentEl.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('card-status')) return;
      const id = parseInt(card.dataset.id);
      const pkg = allPackages.find(p => p.id === id);
      if (pkg) showDetail(pkg);
    });
  });

  // 状态角标点击 → 切换状态
  contentEl.querySelectorAll('.card-status').forEach(badge => {
    badge.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(badge.dataset.id);
      try {
        const result = await API.toggleStatus(id);
        if (result.success) {
          const pkg = allPackages.find(p => p.id === id);
          if (pkg) pkg.status = result.status;
          applyFilter();
          renderContent();
        }
      } catch (err) {
        showToast('状态切换失败');
      }
    });
  });
}

function renderCard(pkg) {
  const statusLabel = pkg.status === 'picked' ? '已取' : '未取';
  const shortCode = pkg.pickup_code || '—';
  return `
    <div class="card" data-id="${pkg.id}">
      <div class="card-header">
        <span class="card-recipient">${esc(pkg.recipient)}</span>
        <span class="card-status ${pkg.status}" data-id="${pkg.id}">${statusLabel}</span>
      </div>
      <div class="card-info">
        <div class="card-info-row"><span class="card-info-label">取件码</span><span>${esc(shortCode)}</span></div>
        ${pkg.tracking_number ? `<div class="card-info-row"><span class="card-info-label">编号</span><span>${esc(pkg.tracking_number)}</span></div>` : ''}
      </div>
      ${pkg.photo_path ? `<img class="card-photo-thumb" src="/${esc(pkg.photo_path)}" alt="照片">` : ''}
    </div>
  `;
}

function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  const kw = (searchInput.value || '').trim();
  if (kw || currentFilter !== 'all') {
    div.innerHTML = `<div class="empty-icon">🔍</div><p class="empty-text">没有找到匹配的快递</p><p class="empty-hint">试试其他关键词或清除筛选条件</p>`;
  } else {
    div.innerHTML = `<div class="empty-icon">📭</div><p class="empty-text">还没有快递记录</p><p class="empty-hint">点击左侧"＋ 新增快递"开始使用</p>`;
  }
  return div;
}

// ============================================================
// 弹窗
// ============================================================
const contentEl = document.getElementById('content');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const dateListEl = document.getElementById('date-list');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const btnAdd = document.getElementById('btn-add');

function showModal(html) {
  modalContent.innerHTML = html;
  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  // 弹窗打开时的粒子效果
  if (window._particles) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    window._particles.spawn(cx, cy, 20);
  }
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalContent.innerHTML = '';
  document.body.style.overflow = '';
  editingId = null;
  pendingPhotoPath = null;
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.style.display === 'flex') closeModal();
});

// ============================================================
// 详情弹窗
// ============================================================
function showDetail(pkg) {
  const statusLabel = pkg.status === 'picked' ? '已取' : '未取';
  const photoHtml = pkg.photo_path
    ? `<img class="detail-photo" src="/${esc(pkg.photo_path)}" alt="快递照片">`
    : '';

  showModal(`
    <div class="detail-section">
      <div class="detail-title">
        <h2>${esc(pkg.recipient)}</h2>
        <span class="detail-status-badge ${pkg.status}" id="detail-status">${statusLabel}</span>
      </div>
      <div class="detail-row"><div class="detail-field"><span class="detail-field-label">电话号码</span><span class="detail-field-value">${esc(pkg.phone)}</span></div><button class="btn-copy" data-copy="${esc(pkg.phone)}">📋 复制</button></div>
      <div class="detail-row"><div class="detail-field"><span class="detail-field-label">取件码</span><span class="detail-field-value">${esc(pkg.pickup_code || '—')}</span></div><button class="btn-copy" data-copy="${esc(pkg.pickup_code || '')}">📋 复制</button></div>
      <div class="detail-row"><div class="detail-field"><span class="detail-field-label">快递编号</span><span class="detail-field-value">${esc(pkg.tracking_number || '—')}</span></div><button class="btn-copy" data-copy="${esc(pkg.tracking_number || '')}">📋 复制</button></div>
      <div class="detail-row"><div class="detail-field"><span class="detail-field-label">录入日期</span><span class="detail-field-value">${esc(pkg.created_date)}</span></div></div>
      ${photoHtml}
    </div>
    <div class="detail-actions">
      <button class="btn btn-danger btn-small" id="btn-delete">删除</button>
      <button class="btn btn-secondary btn-small" id="btn-edit">编辑</button>
      <button class="btn btn-primary btn-small" id="btn-close-detail">关闭</button>
    </div>
  `);

  document.getElementById('btn-close-detail').addEventListener('click', closeModal);
  document.getElementById('btn-edit').addEventListener('click', () => showForm(pkg));
  document.getElementById('btn-delete').addEventListener('click', () => deletePackage(pkg.id));
  document.getElementById('detail-status').addEventListener('click', async () => {
    try {
      const result = await API.toggleStatus(pkg.id);
      if (result.success) {
        pkg.status = result.status;
        const idx = allPackages.findIndex(p => p.id === pkg.id);
        if (idx !== -1) allPackages[idx].status = result.status;
        applyFilter();
        renderContent();
        showDetail(pkg);
      }
    } catch (err) {
      showToast('状态切换失败');
    }
  });

  modalContent.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.copy));
  });
}

// ============================================================
// 表单弹窗
// ============================================================
function showForm(pkg = null) {
  const isEdit = !!pkg;
  const title = isEdit ? '编辑快递信息' : '新增快递';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString();

  const data = pkg || {
    recipient: '', phone: '', pickup_code: '', tracking_number: '',
    photo_path: '', status: 'unpicked', created_date: dateStr, created_at: timeStr,
  };

  editingId = isEdit ? pkg.id : null;
  pendingPhotoPath = data.photo_path || null;

  const photoPreview = data.photo_path
    ? `<img class="form-photo-preview" src="/${esc(data.photo_path)}" alt="预览" id="photo-preview-img">`
    : '';

  showModal(`
    <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">${title}</h2>
    <div class="form-group">
      <label class="form-label">收件人 <span class="required">*</span></label>
      <input class="form-input" id="form-recipient" value="${esc(data.recipient)}" placeholder="请输入收件人姓名" autocomplete="off">
      <span class="form-error" id="error-recipient">请输入收件人</span>
    </div>
    <div class="form-group">
      <label class="form-label">电话号码 <span class="required">*</span></label>
      <input class="form-input" id="form-phone" value="${esc(data.phone)}" placeholder="请输入电话号码" autocomplete="off">
      <span class="form-error" id="error-phone">请输入电话号码</span>
    </div>
    <div class="form-group">
      <label class="form-label">取件码</label>
      <input class="form-input" id="form-pickup-code" value="${esc(data.pickup_code)}" placeholder="请输入取件码（选填）" autocomplete="off">
    </div>
    <div class="form-group">
      <label class="form-label">快递编号</label>
      <input class="form-input" id="form-tracking-number" value="${esc(data.tracking_number)}" placeholder="请输入快递编号（选填）" autocomplete="off">
    </div>
    <div class="form-group" id="photo-group">
      <label class="form-label">照片</label>
      <button type="button" class="btn btn-secondary btn-small" id="btn-pick-photo">📷 选择照片</button>
      <input type="file" id="file-input" accept="image/*" style="display:none;">
      <div id="photo-preview-container">${photoPreview}</div>
      ${data.photo_path ? '<button type="button" class="btn btn-danger btn-small" id="btn-remove-photo" style="margin-top:6px;">删除照片</button>' : ''}
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="btn-cancel-form">取消</button>
      <button type="button" class="btn btn-primary" id="btn-submit-form">${isEdit ? '保存修改' : '确认添加'}</button>
    </div>
  `);

  // 照片选择按钮
  const photoBtn = document.getElementById('btn-pick-photo');
  const fileInput = document.getElementById('file-input');

  if (photoBtn && fileInput) {
    photoBtn.addEventListener('click', () => {
      console.log('[Photo] Opening file picker...');
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) {
        console.log('[Photo] No file selected');
        return;
      }
      console.log('[Photo] File selected:', file.name, file.size);
      showToast('正在上传照片...');
      try {
        const result = await API.uploadPhoto(file);
        console.log('[Photo] Upload result:', result);
        if (result.success) {
          pendingPhotoPath = result.path;
          const container = document.getElementById('photo-preview-container');
          if (container) {
            container.innerHTML = `<img class="form-photo-preview" src="/${result.path}" alt="预览" id="photo-preview-img">`;
          }
          ensureRemoveBtn();
          showToast('照片已上传 ✓');
        } else {
          showToast('照片上传失败: ' + (result.error || '未知错误'));
        }
      } catch (err) {
        console.error('[Photo] Upload error:', err);
        showToast('照片上传失败，请重试');
      }
    });
  } else {
    console.error('[Form] Photo elements not found! photoBtn:', photoBtn, 'fileInput:', fileInput);
  }

  // 删除照片按钮
  const removeBtn = document.getElementById('btn-remove-photo');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      pendingPhotoPath = null;
      const container = document.getElementById('photo-preview-container');
      if (container) container.innerHTML = '';
      removeBtn.remove();
    });
  }

  // 取消 & 提交
  document.getElementById('btn-cancel-form').addEventListener('click', closeModal);
  document.getElementById('btn-submit-form').addEventListener('click', async () => {
    await submitForm(isEdit, data);
  });
}

function ensureRemoveBtn() {
  if (document.getElementById('btn-remove-photo')) return;
  const container = document.getElementById('photo-preview-container');
  if (!container) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-danger btn-small';
  btn.id = 'btn-remove-photo';
  btn.textContent = '删除照片';
  btn.style.marginTop = '6px';
  btn.addEventListener('click', () => {
    pendingPhotoPath = null;
    container.innerHTML = '';
    btn.remove();
  });
  const photoGroup = document.getElementById('photo-group');
  if (photoGroup) photoGroup.appendChild(btn);
}

// ============================================================
// 表单提交
// ============================================================
async function submitForm(isEdit, originalData) {
  console.log('[Form] Submitting...', { isEdit, editingId });

  const recipientEl = document.getElementById('form-recipient');
  const phoneEl = document.getElementById('form-phone');
  const pickupEl = document.getElementById('form-pickup-code');
  const trackingEl = document.getElementById('form-tracking-number');

  if (!recipientEl || !phoneEl) {
    console.error('[Form] Form elements missing!');
    showToast('表单加载异常，请关闭后重试');
    return;
  }

  const recipient = recipientEl.value.trim();
  const phone = phoneEl.value.trim();
  const pickupCode = pickupEl ? pickupEl.value.trim() : '';
  const trackingNumber = trackingEl ? trackingEl.value.trim() : '';
  const photoPath = pendingPhotoPath || originalData.photo_path || '';

  // 验证
  let valid = true;

  const errRecipient = document.getElementById('error-recipient');
  if (!recipient) {
    if (errRecipient) errRecipient.classList.add('show');
    if (recipientEl) recipientEl.classList.add('error');
    valid = false;
  } else {
    if (errRecipient) errRecipient.classList.remove('show');
    if (recipientEl) recipientEl.classList.remove('error');
  }

  const errPhone = document.getElementById('error-phone');
  if (!phone) {
    if (errPhone) errPhone.classList.add('show');
    if (phoneEl) phoneEl.classList.add('error');
    valid = false;
  } else {
    if (errPhone) errPhone.classList.remove('show');
    if (phoneEl) phoneEl.classList.remove('error');
  }

  if (!valid) {
    console.log('[Form] Validation failed');
    return;
  }

  const now = new Date();
  const pkgData = {
    recipient,
    phone,
    pickup_code: pickupCode,
    tracking_number: trackingNumber,
    photo_path: photoPath,
    status: originalData.status || 'unpicked',
    created_date: originalData.created_date || now.toISOString().slice(0, 10),
    created_at: originalData.created_at || now.toISOString(),
  };

  console.log('[Form] Package data:', pkgData);

  // 删除旧照片
  if (isEdit && originalData.photo_path && photoPath !== originalData.photo_path) {
    try { await API.deletePhoto(originalData.photo_path); } catch (e) { /* ok */ }
  }

  try {
    let result;
    if (isEdit && editingId !== null) {
      result = await API.updatePackage(editingId, pkgData);
    } else {
      result = await API.insertPackage(pkgData);
    }

    console.log('[Form] Result:', result);

    if (result.success) {
      closeModal();
      showToast(isEdit ? '快递信息已更新 ✓' : '快递已添加 ✓');
      await loadData();
      renderDateList();
      applyFilter();
      renderContent();
    } else {
      showToast('操作失败：' + (result.error || '未知错误'));
    }
  } catch (err) {
    console.error('[Form] Submit error:', err);
    showToast('提交失败，请检查网络后重试');
  }
}

// ============================================================
// 删除
// ============================================================
async function deletePackage(id) {
  if (!confirm('确定要删除这条快递记录吗？此操作不可撤销。')) return;
  try {
    const pkg = allPackages.find(p => p.id === id);
    if (pkg && pkg.photo_path) {
      await API.deletePhoto(pkg.photo_path);
    }
    const result = await API.deletePackage(id);
    if (result.success) {
      closeModal();
      showToast('快递记录已删除 ✓');
      await loadData();
      renderDateList();
      applyFilter();
      renderContent();
    }
  } catch (err) {
    console.error('[Delete] Error:', err);
    showToast('删除失败，请重试');
  }
}

// ============================================================
// 工具
// ============================================================
function copyText(text) {
  if (!text) { showToast('没有可复制的内容'); return; }
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板 ✓');
  }).catch(() => showToast('复制失败，请手动复制'));
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2000);
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ============================================================
// 事件
// ============================================================
function bindEvents() {
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      btnClearSearch.style.display = searchInput.value.trim() ? 'flex' : 'none';
      applyFilter();
      renderContent();
    }, 200);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    applyFilter();
    renderContent();
    searchInput.focus();
  });

  btnAdd.addEventListener('click', () => showForm(null));

  dateListEl.addEventListener('click', (e) => {
    const item = e.target.closest('.date-item');
    if (!item) return;
    currentFilter = item.dataset.date;
    dateListEl.querySelectorAll('.date-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    applyFilter();
    renderContent();
  });
}

// ============================================================
// 启动
// ============================================================
init();
