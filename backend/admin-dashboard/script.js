// ========================================
// FRESH HOT BREAD - ADMIN DASHBOARD
// With Order Sound Notifications + Image Manager
// ========================================

const API_URL = window.location.origin;
let authToken = localStorage.getItem('adminToken');
let currentFilter = 'all';
let lastOrderCount = 0;
let lastOrderId = 0;
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false'; // Default ON
let audioContext = null;

// ========== AUTH CHECK ==========
async function checkAuth() {
  if (!authToken) {
    window.location.href = 'index.html';
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    if (!data.valid) {
      localStorage.removeItem('adminToken');
      window.location.href = 'index.html';
      return false;
    }
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await checkAuth();
  if (!isAuth) return;
  
  setupNavigation();
  setupMobileMenu();
  setupLogout();
  setupForms();
  setupModal();
  setupFilters();
  setupSpecialPreview();
  setupSpecialToggle();
  setupRevenueControls();
  setupSoundToggle();
  setupImageUploads();
  
  // Initialize audio on first user interaction
  document.body.addEventListener('click', initAudio, { once: true });
  document.body.addEventListener('keydown', initAudio, { once: true });
  
  loadStats();
  loadOrders();
  loadContent();
  loadImagePreviews();
  
  // Auto-refresh every 30 seconds
  setInterval(() => {
    loadStats();
    loadOrders(currentFilter);
  }, 30000);
});

// ========== SOUND NOTIFICATION SYSTEM ==========
function initAudio() {
  if (audioContext) return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('🔔 Audio initialized - order notifications ready');
  } catch (e) {
    console.log('Audio not supported');
  }
}

function playNotificationSound() {
  if (!soundEnabled || !audioContext) return;
  
  try {
    // Create a pleasant chime sound
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Two-tone chime
    oscillator1.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator2.frequency.setValueAtTime(1108.73, audioContext.currentTime); // C#6
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime + 0.1);
    oscillator1.stop(audioContext.currentTime + 0.8);
    oscillator2.stop(audioContext.currentTime + 0.9);
    
    // Play second chime
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const osc4 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      
      osc3.connect(gain2);
      osc4.connect(gain2);
      gain2.connect(audioContext.destination);
      
      osc3.frequency.setValueAtTime(1318.51, audioContext.currentTime); // E6
      osc4.frequency.setValueAtTime(1567.98, audioContext.currentTime); // G6
      
      osc3.type = 'sine';
      osc4.type = 'sine';
      
      gain2.gain.setValueAtTime(0, audioContext.currentTime);
      gain2.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      osc3.start(audioContext.currentTime);
      osc4.start(audioContext.currentTime + 0.1);
      osc3.stop(audioContext.currentTime + 1);
      osc4.stop(audioContext.currentTime + 1.1);
    }, 300);
    
  } catch (e) {
    console.log('Sound play failed:', e);
  }
}

function setupSoundToggle() {
  updateSoundUI();
  
  // Mobile toggle
  document.getElementById('sound-toggle')?.addEventListener('click', toggleSound);
  // Desktop toggle
  document.getElementById('sound-toggle-desktop')?.addEventListener('click', toggleSound);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', soundEnabled);
  updateSoundUI();
  
  // Play test sound when enabling
  if (soundEnabled) {
    initAudio();
    setTimeout(playNotificationSound, 100);
    showToast('🔔 Sound notifications ON');
  } else {
    showToast('🔕 Sound notifications OFF');
  }
}

function updateSoundUI() {
  const toggles = document.querySelectorAll('.sound-toggle, .sound-toggle-desktop');
  toggles.forEach(toggle => {
    const soundOn = toggle.querySelector('.sound-on');
    const soundOff = toggle.querySelector('.sound-off');
    const label = toggle.querySelector('.sound-label');
    
    if (soundEnabled) {
      toggle.classList.remove('muted');
      if (soundOn) soundOn.style.display = 'block';
      if (soundOff) soundOff.style.display = 'none';
      if (label) label.textContent = 'Sound On';
    } else {
      toggle.classList.add('muted');
      if (soundOn) soundOn.style.display = 'none';
      if (soundOff) soundOff.style.display = 'block';
      if (label) label.textContent = 'Sound Off';
    }
  });
}

function showNewOrderAlert(order) {
  const alert = document.getElementById('new-order-alert');
  const info = document.getElementById('alert-order-info');
  
  if (alert && info) {
    info.textContent = `Order #${order.id} - $${parseFloat(order.total).toFixed(2)}`;
    alert.classList.add('show');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      alert.classList.remove('show');
    }, 10000);
  }
}

// ========== NAVIGATION ==========
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = item.dataset.section;
      
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      sections.forEach(section => section.classList.remove('active'));
      document.getElementById(`section-${sectionId}`)?.classList.add('active');
      
      document.getElementById('sidebar')?.classList.remove('open');
    });
  });
  
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.goto;
      document.querySelector(`[data-section="${target}"]`)?.click();
    });
  });
}

function setupMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  
  toggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  
  document.addEventListener('click', (e) => {
    if (sidebar && toggle && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    window.location.href = 'index.html';
  });
}

// ========== LOAD DATA ==========
let lastStats = null;

async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/api/orders/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) return;
    
    const stats = await response.json();
    lastStats = stats;
    
    document.getElementById('stat-today-orders').textContent = stats.today_orders || 0;
    document.getElementById('stat-today-revenue').textContent = `$${(stats.today_revenue || 0).toFixed(2)}`;
    document.getElementById('stat-pending').textContent = stats.pending || 0;
    document.getElementById('stat-total-revenue').textContent = `$${(stats.total_revenue || 0).toFixed(2)}`;
    
    // Revenue page stats
    const onlineRevenue = (stats.total_revenue || 0) - (stats.manual_revenue || 0);
    document.getElementById('online-revenue').textContent = `$${onlineRevenue.toFixed(2)}`;
    document.getElementById('manual-revenue').textContent = `$${(stats.manual_revenue || 0).toFixed(2)}`;
    document.getElementById('combined-revenue').textContent = `$${(stats.total_revenue || 0).toFixed(2)}`;
    
    const badge = document.getElementById('pending-badge');
    if (badge) {
      badge.textContent = stats.pending || 0;
      badge.style.display = stats.pending > 0 ? 'inline' : 'none';
    }
  } catch (error) {
    console.log('Stats loading skipped');
  }
}

async function loadOrders(filter = 'all') {
  currentFilter = filter;
  
  try {
    let url = `${API_URL}/api/orders`;
    if (filter !== 'all') url += `?status=${filter}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) {
      setEmptyOrders();
      return;
    }
    
    const orders = await response.json();
    
    // Check for new orders
    if (orders.length > 0) {
      const newestOrder = orders[0];
      if (lastOrderId > 0 && newestOrder.id > lastOrderId) {
        // New order detected!
        playNotificationSound();
        showNewOrderAlert(newestOrder);
      }
      lastOrderId = newestOrder.id;
    }
    
    renderOrders(orders.slice(0, 5), 'recent-orders-list');
    renderOrders(orders, 'all-orders-list');
  } catch (error) {
    setEmptyOrders();
  }
}

function setEmptyOrders() {
  const msg = '<p class="empty-state">No orders yet. Orders will appear here when customers place them.</p>';
  document.getElementById('recent-orders-list').innerHTML = msg;
  document.getElementById('all-orders-list').innerHTML = msg;
}

function renderOrders(orders, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!orders || orders.length === 0) {
    container.innerHTML = '<p class="empty-state">No orders found</p>';
    return;
  }
  
  container.innerHTML = orders.map(order => {
    const timeStr = formatOrderTime(order.created_at);
    
    return `
      <div class="order-row" data-order-id="${order.id}">
        <span class="order-id">#${order.id}</span>
        <div class="order-customer">
          <span class="name">${escapeHtml(order.customer_name)}</span>
          <span class="phone">${escapeHtml(order.customer_phone)}</span>
        </div>
        <span class="order-total">$${parseFloat(order.total).toFixed(2)}</span>
        <span class="order-time">${timeStr}</span>
        <span class="order-status status-${order.status}">${order.status}</span>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.order-row').forEach((row, index) => {
    row.addEventListener('click', () => showOrderModal(orders[index]));
  });
}

function formatOrderTime(timeStr) {
  if (!timeStr) return 'Unknown';
  
  try {
    if (timeStr.includes(',') || timeStr.includes('/')) {
      const date = new Date(timeStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    const date = new Date(timeStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    });
  } catch (e) {
    return timeStr;
  }
}

async function loadContent() {
  try {
    const response = await fetch(`${API_URL}/api/content`);
    const data = await response.json();
    const content = data.content || data;
    
    if (content) {
      Object.keys(content).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = content[key] === 'true' || content[key] === true;
            if (key === 'special_enabled') {
              toggleSpecialSettings(input.checked);
            }
          } else {
            input.value = content[key] || '';
          }
        }
      });
      updateSpecialPreview();
    }
  } catch (error) {
    console.log('Content loading skipped');
  }
}

// ========== REVENUE CONTROLS ==========
function setupRevenueControls() {
  // Add revenue
  document.getElementById('add-revenue-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('add-revenue-amount');
    const amount = parseFloat(input.value);
    
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', true);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/revenue/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${authToken}` 
        },
        body: JSON.stringify({ amount })
      });
      
      if (response.ok) {
        showToast(`Added $${amount.toFixed(2)} to walk-in sales`);
        input.value = '';
        loadStats();
      } else {
        showToast('Failed to add revenue', true);
      }
    } catch (error) {
      showToast('Failed to add revenue', true);
    }
  });
  
  // Set revenue
  document.getElementById('set-revenue-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('set-revenue-amount');
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount < 0) {
      showToast('Enter a valid amount', true);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/revenue/set`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${authToken}` 
        },
        body: JSON.stringify({ amount })
      });
      
      if (response.ok) {
        showToast(`Walk-in revenue set to $${amount.toFixed(2)}`);
        input.value = '';
        loadStats();
      } else {
        showToast('Failed to set revenue', true);
      }
    } catch (error) {
      showToast('Failed to set revenue', true);
    }
  });
  
  // Reset revenue
  document.getElementById('reset-revenue-btn')?.addEventListener('click', async () => {
    if (!confirm('Reset all walk-in revenue to $0? This cannot be undone.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/revenue/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        showToast('Walk-in revenue reset to $0');
        loadStats();
      } else {
        showToast('Failed to reset revenue', true);
      }
    } catch (error) {
      showToast('Failed to reset revenue', true);
    }
  });
}

// ========== FILTERS ==========
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadOrders(btn.dataset.filter);
    });
  });
  
  document.getElementById('refresh-orders')?.addEventListener('click', () => {
    loadStats();
    loadOrders(currentFilter);
    showToast('Refreshed!');
  });
}

// ========== ORDER MODAL ==========
function setupModal() {
  const modal = document.getElementById('order-modal');
  document.getElementById('modal-close')?.addEventListener('click', () => modal?.classList.remove('show'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal?.classList.remove('show'); });
}

function showOrderModal(order) {
  const modal = document.getElementById('order-modal');
  const detail = document.getElementById('order-detail');
  
  const dateStr = formatOrderTime(order.created_at);
  const phoneClean = order.customer_phone.replace(/[^0-9]/g, '');
  
  detail.innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Customer</div>
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${escapeHtml(order.customer_name)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone</span>
        <span class="detail-value">${escapeHtml(order.customer_phone)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email</span>
        <span class="detail-value">${escapeHtml(order.customer_email || 'Not provided')}</span>
      </div>
    </div>
    
    <div class="detail-section">
      <div class="detail-section-title">Order Details</div>
      <div class="detail-row">
        <span class="detail-label">Items</span>
        <span class="detail-value">${escapeHtml(order.items)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total</span>
        <span class="detail-value" style="font-size:20px;color:var(--burgundy);font-weight:700;">$${parseFloat(order.total).toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${dateStr}</span>
      </div>
      ${order.notes ? `
      <div style="margin-top:12px;background:var(--yellow-light);padding:12px;border-radius:8px;">
        <strong style="color:var(--yellow);">📝 Notes:</strong><br>
        ${escapeHtml(order.notes)}
      </div>` : ''}
    </div>
    
    <div class="detail-section">
      <div class="detail-section-title">Update Status</div>
      <select class="status-select" id="modal-status" style="width:100%;">
        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>🎉 Completed</option>
        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
      </select>
    </div>
    
    <div class="modal-actions">
      <a href="tel:${phoneClean}" class="btn-call">📞 Call</a>
      <button class="btn-delete" id="delete-order-btn">🗑️ Delete</button>
    </div>
  `;
  
  document.getElementById('modal-status')?.addEventListener('change', (e) => updateOrderStatus(order.id, e.target.value));
  document.getElementById('delete-order-btn')?.addEventListener('click', () => deleteOrder(order.id));
  
  modal?.classList.add('show');
}

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ status })
    });
    
    if (response.ok) {
      showToast(`Order #${orderId} → ${status}`);
      loadStats();
      loadOrders(currentFilter);
    } else {
      showToast('Update failed', true);
    }
  } catch (error) {
    showToast('Update failed', true);
  }
}

async function deleteOrder(orderId) {
  if (!confirm(`Delete order #${orderId}?`)) return;
  
  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      document.getElementById('order-modal')?.classList.remove('show');
      showToast(`Order #${orderId} deleted`);
      loadStats();
      loadOrders(currentFilter);
    } else {
      showToast('Delete failed', true);
    }
  } catch (error) {
    showToast('Delete failed', true);
  }
}

// ========== FORMS ==========
function setupForms() {
  document.getElementById('content-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveContent(['hero_title', 'hero_subtitle', 'hero_description', 'product_name', 'product_description']);
  });
  
  document.getElementById('special-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const specialEnabled = document.getElementById('special_enabled')?.checked;
    await saveContent(['special_label', 'special_discount', 'special_text']);
    await saveContent([{ key: 'special_enabled', value: specialEnabled.toString() }]);
  });
  
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveContent(['phone', 'email', 'location', 'business_hours']);
  });
}

async function saveContent(fields) {
  const updates = {};
  
  fields.forEach(field => {
    if (typeof field === 'object') {
      updates[field.key] = field.value;
    } else {
      const input = document.getElementById(field);
      if (input) {
        updates[field] = input.type === 'checkbox' ? input.checked.toString() : input.value;
      }
    }
  });
  
  try {
    let response = await fetch(`${API_URL}/api/content/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ updates })
    });
    
    if (!response.ok) {
      for (const [key, value] of Object.entries(updates)) {
        await fetch(`${API_URL}/api/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ key, value })
        });
      }
    }
    
    showToast('Saved!');
    updateSpecialPreview();
  } catch (error) {
    showToast('Save failed', true);
  }
}

// ========== SPECIAL PREVIEW & TOGGLE ==========
function setupSpecialPreview() {
  ['special_label', 'special_discount', 'special_text'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateSpecialPreview);
  });
}

function updateSpecialPreview() {
  const el = (id, def) => document.getElementById(id)?.value || def;
  document.getElementById('preview-label').textContent = el('special_label', 'Special of the Day');
  document.getElementById('preview-discount').textContent = el('special_discount', '20% OFF');
  document.getElementById('preview-text').textContent = el('special_text', 'TODAY');
}

function setupSpecialToggle() {
  const toggle = document.getElementById('special_enabled');
  toggle?.addEventListener('change', (e) => {
    toggleSpecialSettings(e.target.checked);
  });
}

function toggleSpecialSettings(enabled) {
  const settings = document.getElementById('special-settings');
  if (settings) {
    settings.style.opacity = enabled ? '1' : '0.5';
    settings.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

// ========== IMAGE UPLOADS ==========
function setupImageUploads() {
  // Image mapping: key -> { frontend path, preview element id }
  const imageMap = {
    'hero': { path: 'images/gemeni 3.png', previewId: 'preview-hero' },
    'logo': { path: 'images/logo.jpg', previewId: 'preview-logo' },
    'product': { path: 'images/download (1).jpg', previewId: 'preview-product' },
    'coffee-machine': { path: 'images/coffee-machine.webp', previewId: 'preview-coffee-machine' },
    'coffee-menu': { path: 'images/coffee-menu.webp', previewId: 'preview-coffee-menu' },
    'feature1': { path: 'images/shop.webp', previewId: 'preview-feature1' },
    'feature2': { path: 'images/inside.webp', previewId: 'preview-feature2' },
    'feature3': { path: 'images/bread 4.jpg', previewId: 'preview-feature3' },
    'gallery1': { path: 'images/hq720.jpg', previewId: 'preview-gallery1' },
    'gallery2': { path: 'images/bread 2.jpg', previewId: 'preview-gallery2' },
    'gallery3': { path: 'images/Screenshot 2025-12-04 123539.png', previewId: 'preview-gallery3' },
    'gallery4': { path: 'images/frontview.webp', previewId: 'preview-gallery4' }
  };
  
  // Set up file input handlers
  document.querySelectorAll('input[type="file"][data-image-key]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const imageKey = input.dataset.imageKey;
      const mapping = imageMap[imageKey];
      
      if (!mapping) {
        showToast('Unknown image type', true);
        return;
      }
      
      // Validate file
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', true);
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('Image too large (max 10MB)', true);
        return;
      }
      
      // Show loading state
      const preview = document.getElementById(mapping.previewId);
      if (preview) {
        preview.classList.add('uploading');
      }
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', imageKey);
        formData.append('targetPath', mapping.path);
        
        const response = await fetch(`${API_URL}/api/images/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Update preview with new image
          const img = preview?.querySelector('img');
          if (img) {
            img.src = result.url || `/${mapping.path}?t=${Date.now()}`;
          }
          
          showToast('Image uploaded! Refresh your website to see changes.');
        } else {
          const error = await response.json();
          showToast(error.message || 'Upload failed', true);
        }
      } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed - check console for details', true);
      } finally {
        if (preview) {
          preview.classList.remove('uploading');
        }
        // Reset input so same file can be selected again
        input.value = '';
      }
    });
  });
  
  // Make preview areas clickable
  document.querySelectorAll('.image-preview').forEach(preview => {
    preview.addEventListener('click', () => {
      const id = preview.id.replace('preview-', 'upload-');
      document.getElementById(id)?.click();
    });
  });
}

async function loadImagePreviews() {
  // Load any custom image paths from content storage
  try {
    const response = await fetch(`${API_URL}/api/content`);
    const data = await response.json();
    const content = data.content || data;
    
    // Check for custom image paths
    const imageKeys = ['hero', 'logo', 'product', 'coffee-machine', 'coffee-menu', 
                       'feature1', 'feature2', 'feature3', 
                       'gallery1', 'gallery2', 'gallery3', 'gallery4'];
    
    imageKeys.forEach(key => {
      const customPath = content[`image_${key}`];
      if (customPath) {
        const preview = document.getElementById(`preview-${key}`);
        const img = preview?.querySelector('img');
        if (img) {
          img.src = customPath;
        }
      }
    });
  } catch (error) {
    console.log('Image preview loading skipped');
  }
}

// ========== UTILITIES ==========
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  
  msgEl.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
