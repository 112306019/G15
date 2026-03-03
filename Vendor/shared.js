// ===== KOCMART — Shared JS =====

function renderSidebar(activePage) {
  const nav = [
    { section: '總覽' },
    { id: 'dashboard',  icon: '📊', label: '數據儀表板', href: 'dashboard.html' },
    { section: '行銷管理' },
    { id: 'coupon',     icon: '🎟', label: '優惠碼管理', href: 'coupon.html', badge: '12' },
    { id: 'koc',        icon: '🌟', label: 'KOC 管理',   href: 'koc.html' },
    { id: 'campaign',   icon: '🚀', label: '活動企劃',    href: 'campaign.html' },
    { id: 'chat',       icon: '💬', label: '訊息中心',    href: 'chat.html',  badge: '6' },
    { section: '商品' },
    { id: 'products',   icon: '📦', label: '商品列表',    href: 'products.html' },
    { id: 'category',   icon: '🗂',  label: '商品分類',    href: 'category.html' },
    { id: 'inventory',  icon: '📋', label: '庫存管理',    href: 'inventory.html' },
    { section: '財務' },
    { id: 'orders',     icon: '💰', label: '訂單收入',    href: 'orders.html' },
    { id: 'commission', icon: '🤝', label: 'KOC 傭金',   href: 'commission.html' },
    { id: 'reports',    icon: '📄', label: '報表下載',    href: 'reports.html' },
    { section: '設定' },
    { id: 'settings',   icon: '⚙️', label: '帳號設定',    href: 'settings.html' },
    { id: 'notify',     icon: '🔔', label: '通知設定',    href: 'notify.html' },
  ];

  let html = `
    <div class="logo">
      <div class="logo-text">KOCMART</div>
      <div class="logo-sub">廠商管理後台</div>
    </div>
    <div class="vendor-badge">
      <div class="vendor-avatar">美</div>
      <div>
        <div class="vendor-name">美妍國際</div>
        <div class="vendor-plan">★ Pro 方案</div>
      </div>
    </div>
    <nav>`;

  for (const item of nav) {
    if (item.section) {
      html += `<div class="nav-section-label">${item.section}</div>`;
    } else {
      const isActive = item.id === activePage ? ' active' : '';
      const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
      html += `<a class="nav-item${isActive}" href="${item.href}">
        <span class="nav-icon">${item.icon}</span>${item.label}${badge}
      </a>`;
    }
  }

  html += `</nav>
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="showToast('已登出')">登出帳號</button>
    </div>`;

  const mount = document.getElementById('sidebar-mount');
  if (mount) mount.innerHTML = html;
}

// Global toast
function showToast(msg, color) {
  let t = document.getElementById('global-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'global-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderColor = color || '';
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); t.style.borderColor = ''; }, 3000);
}

// Modal helpers
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
