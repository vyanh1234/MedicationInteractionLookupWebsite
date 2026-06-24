const $ = s => document.querySelector(s), app = $('#app'), token = () => localStorage.token, authDialog = $('#authDialog');
const style = document.createElement('style');
style.innerHTML = `dialog { max-height: 85vh; overflow-y: auto; scrollbar-width: thin; border-radius: 12px; } dialog form { padding-bottom: 20px; }`;
document.head.appendChild(style);
let me = JSON.parse(localStorage.getItem('user') || 'null'), cache = {};

async function api(path, opt = {}) {
  const headers = { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) };
  const r = await fetch('/api' + path, { ...opt, headers: { ...headers, ...opt.headers } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.message || 'Không thể kết nối máy chủ');
  return data;
}

function toast(msg) {
  const x = $('#toast');
  x.textContent = msg;
  x.classList.add('show');
  setTimeout(() => x.classList.remove('show'), 2500);
}

async function updateNav() {
  document.body.classList.toggle('logged', !!me);
  document.querySelectorAll('.private').forEach(x => x.style.display = me?.role === 'BENH_NHAN' ? '' : 'none');
  document.querySelectorAll('.staff').forEach(x => x.style.display = me && me.role !== 'BENH_NHAN' ? '' : 'none');

  if (me && me.role === 'BENH_NHAN') {
    try {
      const diseases = await api('/patient/background-diseases');
      const badge = $('#disease-badge');
      if (badge) {
        badge.textContent = diseases.length;
        badge.style.display = diseases.length ? 'inline-flex' : 'none';
      }
    } catch (e) {
      console.error("Lỗi lấy danh sách bệnh nền để cập nhật badge:", e);
    }
  } else {
    const badge = $('#disease-badge');
    if (badge) badge.style.display = 'none';
  }

  $('#account').innerHTML = me ? `<div class="avatar">${me.fullName?.[0] || 'U'}</div><span>${me.fullName}</span><button class="ghost" onclick="logout()">Thoát</button>` : `<button class="ghost" onclick="showLogin()">Đăng nhập</button><button onclick="showRegister()">Đăng ký</button>`;
  initChatWelcome();
}

function showLogin() {
  authDialog.showModal();
  $('#authContent').innerHTML = `
    <h2>Chào mừng trở lại</h2>
    <p class="muted">Đăng nhập để nhận cảnh báo theo hồ sơ sức khỏe.</p>
    <form onsubmit="login(event)">
      <div class="field"><label>Tên đăng nhập</label><input name="username" required></div>
      <div class="field"><label>Mật khẩu</label><input name="password" type="password" required></div>
      <button style="width:100%">Đăng nhập</button>
    </form>
    <div id="googleArea">
      <div class="divider"><span>hoặc</span></div>
      <div id="googleBtn" style="display: flex; justify-content: center;"></div>
    </div>
    <p style="margin-top: 20px;">Chưa có tài khoản? <a href="#" onclick="showRegister()">Đăng ký</a></p>
  `;
  configureGoogleButton();
}

function showRegister() {
  authDialog.showModal();
  $('#authContent').innerHTML = `
    <h2>Tạo tài khoản</h2>
    <form onsubmit="register(event)">
      <div class="field"><label>Họ và tên</label><input name="fullName" required></div>
      <div class="field"><label>Email hoặc tên đăng nhập</label><input name="username" minlength="4" required></div>
      <div class="field"><label>Mật khẩu</label><input name="password" type="password" minlength="6" required></div>
      <button style="width:100%">Đăng ký</button>
    </form>
    <div id="googleArea">
      <div class="divider"><span>hoặc</span></div>
      <div id="googleBtn" style="display: flex; justify-content: center;"></div>
    </div>
    <p style="margin-top: 20px;">Đã có tài khoản? <a href="#" onclick="showLogin()">Đăng nhập</a></p>
  `;
  configureGoogleButton();
}

async function login(e) {
  e.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(e.target));
    const x = await api('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    localStorage.token = x.token;
    localStorage.user = JSON.stringify(x.user);
    me = x.user;
    authDialog.close();
    await updateNav();
    toast('Đăng nhập thành công');
    location.hash = me.role === 'BENH_NHAN' ? 'lookup' : 'admin';
  } catch (e) {
    toast(e.message);
  }
}

async function register(e) {
  e.preventDefault();
  try {
    await api('/auth/register', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    toast('Đăng ký thành công');
    showLogin();
  } catch (e) {
    toast(e.message);
  }
}

async function configureGoogleButton() {
  try {
    const c = cache.google || await api('/auth/google', { method: 'POST' });
    cache.google = c;
    const area = $('#googleArea');
    if (!area) return;
    
    if (!c.enabled) {
      area.innerHTML = '<p class="muted" style="text-align:center">Chức năng đăng nhập bằng Google hiện chưa được kích hoạt.</p>';
      return;
    }
    
    if (!window.google) {
      await new Promise((ok, no) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = ok;
        s.onerror = no;
        document.head.appendChild(s);
      });
    }
    
    google.accounts.id.initialize({ client_id: c.clientId, callback: handleGoogleCredential });
    
    const btnContainer = $('#googleBtn');
    if (btnContainer) {
      google.accounts.id.renderButton(btnContainer, { 
        theme: 'outline', 
        size: 'large',
        text: location.hash === '#profile' || location.hash === '#register' ? 'signup_with' : 'signin_with',
        width: 300
      });
    }
  } catch (e) {
    const area = $('#googleArea');
    if (area) area.style.display = 'none';
  }
}

async function handleGoogleCredential(x) {
  try {
    const r = await api('/auth/google/callback', { method: 'POST', body: JSON.stringify({ credential: x.credential }) });
    localStorage.token = r.token;
    localStorage.user = JSON.stringify(r.user);
    me = r.user;
    authDialog.close();
    await updateNav();
    toast('Đăng nhập Google thành công');
    location.hash = 'lookup';
  } catch (e) {
    toast(e.message);
  }
}

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch { }
  localStorage.clear();
  me = null;
  await updateNav();
  location.hash = 'home';
}

function home() {
  app.innerHTML = `<section class="section">
    <div class="welcome-banner">
      <div class="welcome-content">
        <h1>Xin chào, ${me ? me.fullName : 'bạn'}</h1>
        <p>Hệ thống hỗ trợ tra cứu tương tác thuốc và bệnh nền. Đảm bảo an toàn khi sử dụng thuốc.</p>
        <div class="welcome-actions">
          <button class="btn-white" onclick="location.hash='lookup'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Tra cứu ngay
          </button>
          <button class="btn-outline" onclick="location.hash='profile'">Cập nhật bệnh nền</button>
        </div>
      </div>
      <div class="welcome-art">
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    </div>
    
    <div class="grid-two">
      <div class="info-card">
        <div class="icon-container orange">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3>Tại sao cần tra cứu?</h3>
        <p>Nhiều loại thuốc có thể gây nguy hiểm hoặc làm trầm trọng thêm tình trạng bệnh nền hiện tại của bạn. Việc tra cứu giúp phòng tránh các rủi ro đáng tiếc.</p>
        <a href="#lookup">Bắt đầu tra cứu →</a>
      </div>
      
      <div class="info-card">
        <div class="icon-container green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <h3>Hồ sơ cá nhân hóa</h3>
        <p>Cập nhật chính xác các bệnh lý đang mắc phải để hệ thống đưa ra cảnh báo tự động khi bạn tìm kiếm bất kỳ loại thuốc nào.</p>
        <a href="#profile">Xem hồ sơ →</a>
      </div>
    </div>
  </section>`;
}

let suggestTimer;

async function lookup() {
  app.innerHTML = `<section class="section">
    <div class="page-header">
      <h2>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        Tra cứu tương tác thuốc
      </h2>
      <p>Nhập tên thuốc để kiểm tra xem có an toàn với các bệnh nền bạn đang mắc phải hay không.</p>
    </div>
    <div class="search-container">
      <div class="search-input-wrapper">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input id="q" autocomplete="off" placeholder="Nhập tên thuốc (VD: Advil, Panadol, Aspirin...)" oninput="onDrugInput(this.value)" onkeydown="if(event.key==='Escape'){ hideSuggestions(); } else if(event.key==='Enter'){ hideSuggestions(); loadDrugs(this.value); }">
      </div>
      <div id="suggestions" class="suggestions" hidden></div>
    </div>
    <div id="drugs" class="drug-list" style="display:none"></div>
    <div id="result"></div>
  </section>`;
}

function onDrugInput(value) {
  clearTimeout(suggestTimer);
  if (value.trim().length < 2) {
    hideSuggestions();
    return;
  }
  const box = $('#suggestions');
  box.hidden = false;
  box.innerHTML = '<div class="suggestion muted">Đang tìm thuốc…</div>';
  suggestTimer = setTimeout(() => loadSuggestions(value), 300);
}

async function loadSuggestions(value) {
  try {
    const r = await api('/drugs/autocomplete?keyword=' + encodeURIComponent(value));
    const box = $('#suggestions');
    if (!box) return;
    box.innerHTML = r.items.length ? r.items.map(x => `<div class="suggestion" data-id="${x.id}"><b>${x.tenThuoc}</b>${x.canKeDon ? '<span class="tag" style="margin-left:8px">Kê đơn</span>' : ''}<small>Hoạt chất: ${x.hoatChat || 'Đang cập nhật'} · ${x.dangBaoChe || 'Chưa rõ dạng'} · ${x.duongDung || 'Chưa rõ đường dùng'}</small></div>`).join('') : '<div class="suggestion muted">Không tìm thấy thuốc phù hợp</div>';
    box.querySelectorAll('[data-id]').forEach((el, i) => el.onclick = () => selectSuggestion(r.items[i]));
    box.hidden = false;
  } catch (e) {
    hideSuggestions();
  }
}

function hideSuggestions() {
  const x = $('#suggestions');
  if (x) x.hidden = true;
}

function selectSuggestion(x) {
  $('#q').value = x.tenThuoc;
  hideSuggestions();
  checkDrug(x.id);
}

async function loadDrugs(q) {
  try {
    const drugsEl = $('#drugs');
    drugsEl.style.display = 'grid';
    drugsEl.innerHTML = '<div class="empty">Đang tải…</div>';
    const xs = await api('/drugs?keyword=' + encodeURIComponent(q));
    cache.drugs = xs;
    
    // Đã thay đổi x.name -> x.TenThuoc, x.description -> x.MoTa, ... để khớp với Backend
    drugsEl.innerHTML = xs.length ? xs.map(x => `
      <article class="card drug" onclick="checkDrug(${x.id})">
        <span class="tag">${x.DangBaoChe || x.dosageForm || 'Thuốc'}</span>
        <h3>${x.TenThuoc || x.name || 'Chưa rõ tên'}</h3>
        <div class="muted">${x.HoatChat || x.ingredients || ''} ${x.HamLuong ? '· ' + x.HamLuong : ''}</div>
        <p>${x.MoTa || x.description || ''}</p>
        <b style="color:var(--primary)">Kiểm tra an toàn →</b>
      </article>
    `).join('') : `<div class="empty">Không tìm thấy thuốc phù hợp.</div>`;
    
  } catch (e) {
    toast(e.message);
  }
}

async function checkDrug(id) {
  if (!me) {
    showLogin();
    return;
  }
  if (me.role !== 'BENH_NHAN') {
    toast('Hãy đăng nhập bằng tài khoản bệnh nhân để tra cứu cá nhân hóa');
    return;
  }
  try {
    const x = await api('/lookup/drug', { method: 'POST', body: JSON.stringify({ drugId: id }) });
    cache.lookup = x;
    $('#drugs').style.display = 'none';
    $('#result').innerHTML = `<button class="ghost" onclick="$('#drugs').style.display='grid';$('#result').innerHTML=''">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:middle;">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Quay lại tra cứu
    </button>
    <article class="card" style="margin-top:16px">
      <div class="result-head">
        <div>
          <div class="eyebrow">Kết quả tra cứu</div>
          <h2>${x.drug.name}</h2>
          <p class="muted">Hoạt chất: ${x.ingredients.map(i => i.name + ' ' + (i.strength || '')).join(', ')}</p>
        </div>
        <span class="severity ${x.highestSeverity}">${labelSeverity(x.highestSeverity)}</span>
      </div>
      ${x.warnings.length ? x.warnings.map((w, i) => `<div class="card warning ${w.severity}">
        <h3>${w.type}: ${w.subject}<span class="severity ${w.severity}">${labelSeverity(w.severity)}</span></h3>
        <p>${w.content}</p>
        <b>Khuyến nghị</b>
        <p>${w.recommendation}</p>
        ${w.source ? `<small class="muted">Nguồn: ${w.source}</small>` : ''}
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="ghost" style="flex:1" onclick="requestAi(${i})">✦ Lưu duyệt giải thích</button>
          <button style="flex:1; background: var(--green); border-color: var(--green);" onclick="chatExplainWarning(${i})">💬 Trò chuyện với AI</button>
        </div>
      </div>`).join('') : `<div class="card" style="background:var(--green-light); border:1.5px solid var(--green); color:var(--ink); margin-top:20px;">
        <h3 style="color:var(--green); margin-top:0;">✓ Chưa phát hiện cảnh báo trong dữ liệu hiện có</h3>
        <p>Điều này không khẳng định thuốc hoàn toàn an toàn. Hãy hỏi nhân viên y tế khi cần.</p>
      </div>`}
      <div class="disclaimer">ⓘ ${x.disclaimer}</div>
    </article>`;
    $('#result').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    toast(e.message);
  }
}

async function requestAi(index) {
  const w = cache.lookup.warnings[index], source = ({ 'Bệnh nền': 'QuyTacCanhBao', 'Dị ứng': 'CanhBaoDiUng_HoatChat', 'Tương tác': 'TuongTacHoatChat' })[w.type];
  try {
    const r = await api('/ai/generate', { method: 'POST', body: JSON.stringify({ question: 'Giải thích cảnh báo này d��� hiểu', input: w.content, source }) });
    toast(r.message);
  } catch (e) {
    toast(e.message);
  }
}

function labelSeverity(s) {
  return ({ Cao: 'Nguy cơ cao', TrungBinh: 'Cần thận trọng', Thap: 'Nguy cơ thấp', ChuaDuDuLieu: 'Chưa đủ dữ liệu' })[s] || s;
}

async function profile() {
  if (!guardPatient()) return;
  app.innerHTML = `<section class="section">
    <div class="page-header">
      <h2>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:8px;">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        Hồ sơ Bệnh Nền
      </h2>
      <p>Quản lý các bệnh lý bạn đang mắc phải để hệ thống đưa ra cảnh báo chính xác nhất.</p>
    </div>
    <div class="tabs">
      <button class="active" onclick="profileTab('basic',this)">Thông tin cá nhân</button>
      <button onclick="profileTab('diseases',this)">Bệnh nền</button>
      <button onclick="profileTab('allergies',this)">Dị ứng</button>
      <button onclick="profileTab('drugs',this)">Thuốc đang dùng</button>
    </div>
    <div id="profileBody"></div>
  </section>`;
  profileTab('basic', $('.tabs button'));
}

function guardPatient() {
  if (!me) {
    showLogin();
    return false;
  }
  if (me.role !== 'BENH_NHAN') {
    location.hash = 'admin';
    return false;
  }
  return true;
}

async function profileTab(tab, btn) {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
  btn?.classList.add('active');
  const body = $('#profileBody');
  body.innerHTML = '<div class="empty">Đang tải…</div>';
  try {
    if (tab === 'basic') {
      const p = await api('/patient/profile');
      body.innerHTML = `<form class="card" onsubmit="saveProfile(event)"><div class="row"><div class="field"><label>Họ tên</label><input name="fullName" value="${p.HoTen || ''}"></div><div class="field"><label>Ngày sinh</label><input type="date" name="birthDate" value="${p.NgaySinh || ''}"></div><div class="field"><label>Giới tính</label><select name="gender"><option>${p.GioiTinh || 'Nam'}</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></div><div class="field"><label>Nhóm máu</label><input name="bloodType" value="${p.NhomMau || ''}"></div><div class="field"><label>Chiều cao (cm)</label><input name="height" type="number" step=".1" value="${p.ChieuCao || ''}"></div><div class="field"><label>Cân nặng (kg)</label><input name="weight" type="number" step=".1" value="${p.CanNang || ''}"></div></div><div class="field"><label>Địa chỉ</label><input name="address" value="${p.DiaChi || ''}"></div><div class="field"><label>Ghi chú sức khỏe</label><textarea name="note">${p.GhiChu || ''}</textarea></div><button>Lưu thay đổi</button></form>`;
    } else {
      await renderHealthList(tab);
    }
  } catch (e) {
    toast(e.message);
  }
}

async function saveProfile(e) {
  e.preventDefault();
  try {
    const formData = Object.fromEntries(new FormData(e.target));

    await api('/patient/profile', { method: 'PUT', body: JSON.stringify(formData) });

    if (me && formData.fullName) {
      me.fullName = formData.fullName;
      localStorage.setItem('user', JSON.stringify(me)); // Lưu lại vào Local Storage
      
      await updateNav(); 
      
      if (location.hash === '' || location.hash === '#home') {
        home();
      }
    }
    
    toast('Đã lưu hồ sơ');
  } catch (e) {
    toast(e.message);
  }
}
window.toggleAddForm = function () {
  const formEl = $('#add-health-form');
  if (formEl) {
    formEl.style.display = formEl.style.display === 'none' ? 'block' : 'none';
    if (formEl.style.display === 'block') {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

async function renderHealthList(tab) {
  const cfg = {
    diseases: ['/patient/background-diseases', '/diseases', 'Chọn bệnh nền', '+ Thêm bệnh nền', 'bệnh lý'],
    allergies: ['/patient/allergies', '/allergies', 'Chọn dị ứng', '+ Thêm dị ứng', 'dị ứng'],
    drugs: ['/patient/current-drugs', '/drugs', 'Chọn thuốc', '+ Thêm thuốc', 'thuốc đang dùng']
  }[tab];

  const [mine, all] = await Promise.all([api(cfg[0]), api(cfg[1])]);

  if (tab === 'diseases') {
    const badge = $('#disease-badge');
    if (badge) {
      badge.textContent = mine.length;
      badge.style.display = mine.length ? 'inline-flex' : 'none';
    }
  }

  const itemsHtml = mine.length ? mine.map(x => {
    if (tab === 'diseases') {
      return `<div class="profile-item">
        <div class="profile-item-info">
          <div class="profile-item-title">
            ${x.name}
            ${x.icd ? `<span class="code-badge">${x.icd}</span>` : ''}
          </div>
          <div class="profile-item-meta">
            ${x.category ? `Nhóm: ${x.category}` : 'Không rõ nhóm'}
            ${x.note ? ` • Ghi chú: <span class="highlight">${x.note}</span>` : ''}
          </div>
        </div>
        <button class="btn-icon-danger" onclick="removeHealth('${tab}',${x.id})" title="Xóa">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>`;
    } else if (tab === 'allergies') {
      return `<div class="profile-item">
        <div class="profile-item-info">
          <div class="profile-item-title">${x.name}</div>
          <div class="profile-item-meta">
            Mức độ: <span class="tag severity ${x.severity || 'Cao'}">${labelSeverity(x.severity || 'Cao')}</span>
          </div>
        </div>
        <button class="btn-icon-danger" onclick="removeHealth('${tab}',${x.id})" title="Xóa">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>`;
    } else {
      return `<div class="profile-item">
        <div class="profile-item-info">
          <div class="profile-item-title">${x.name}</div>
          <div class="profile-item-meta">
            Liều dùng: <span class="highlight">${x.dose || '—'}</span> • Tần suất: <span class="highlight">${x.frequency || '—'}</span>
          </div>
        </div>
        <button class="btn-icon-danger" onclick="removeHealth('${tab}',${x.id})" title="Xóa">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>`;
    }
  }).join('') : '<div class="empty">Chưa có thông tin</div>';

  $('#profileBody').innerHTML = `
    <div class="profile-list-card">
      <div class="profile-list-header">
        <h3>Danh sách ${cfg[4]} (${mine.length})</h3>
        <button onclick="toggleAddForm()">${cfg[3]}</button>
      </div>
      <div class="profile-items-container">
        ${itemsHtml}
      </div>
    </div>
    
    <div id="add-health-form" class="card" style="display:none; margin-top:20px;">
      <h2>Thêm ${cfg[4]} mới</h2>
      <form onsubmit="addHealth(event,'${tab}')">
        <div class="field">
          <label>${cfg[2]}</label>
          <select name="${tab === 'drugs' ? 'drugId' : 'id'}">
            ${all.map(x => `<option value="${x.id}">${x.name}</option>`).join('')}
          </select>
        </div>
        ${tab === 'drugs' ? `
          <div class="field"><label>Liều dùng</label><input name="dose" placeholder="Ví dụ: 1 viên"></div>
          <div class="field"><label>Tần suất</label><input name="frequency" placeholder="Ví dụ: Sau ăn sáng"></div>
        ` : tab === 'allergies' ? `
          <div class="field">
            <label>Mức độ phản ứng</label>
            <select name="severity">
              <option value="Cao">Nguy cơ cao (Nguy hiểm)</option>
              <option value="TrungBinh">Trung bình (Cần thận trọng)</option>
              <option value="Thap">Nguy cơ thấp (Nhẹ)</option>
            </select>
          </div>
        ` : `
          <div class="field"><label>Ghi chú</label><input name="note" placeholder="Ví dụ: Phát hiện năm 2022..."></div>
        `}
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
          <button type="button" class="ghost" onclick="toggleAddForm()">Hủy</button>
          <button type="submit">Thêm vào hồ sơ</button>
        </div>
      </form>
    </div>
  `;
}

async function addHealth(e, tab) {
  e.preventDefault();
  const paths = { diseases: 'background-diseases', allergies: 'allergies', drugs: 'current-drugs' };
  try {
    await api('/patient/' + paths[tab], { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    toast('Đã thêm vào hồ sơ');
    await updateNav(); // Update navigation badge count
    profileTab(tab, document.querySelectorAll('.tabs button')[{ diseases: 1, allergies: 2, drugs: 3 }[tab]]);
  } catch (e) {
    toast(e.message);
  }
}

async function removeHealth(tab, id) {
  const paths = { diseases: 'background-diseases', allergies: 'allergies', drugs: 'current-drugs' };
  try {
    await api('/patient/' + paths[tab] + '/' + id, { method: 'DELETE' });
    toast('Đã xóa');
    await updateNav(); // Update navigation badge count
    profileTab(tab, document.querySelectorAll('.tabs button')[{ diseases: 1, allergies: 2, drugs: 3 }[tab]]);
  } catch (e) {
    toast(e.message);
  }
}

async function history() {
  if (!guardPatient()) return;
  // Đã dời <section class="section"> lên đầu
  app.innerHTML = `<section class="section"><div class="page-head"><h1>Lịch sử tra cứu</h1></div><div id="history" class="card"><div class="empty">Đang tải…</div></div></section>`;
  try {
    const xs = await api('/lookup/history');
    $('#history').innerHTML = xs.length ? xs.map(x => `<div class="list-row"><div class="icon">⌕</div><div class="grow"><b>${x.drug}</b><div class="muted">${new Date(x.time).toLocaleString('vi-VN')} · ${x.warningCount} cảnh báo</div></div><span class="severity ${x.severity}">${labelSeverity(x.severity)}</span></div>`).join('') : '<div class="empty">Bạn chưa có lần tra cứu nào.</div>';
  } catch (e) {
    toast(e.message);
  }
}

async function notifications() {
  if (!guardPatient()) return;
  // Đã dời <section class="section"> lên đầu
  app.innerHTML = `<section class="section"><div class="page-head"><h1>Thông báo</h1></div><div id="notices" class="card"><div class="empty">Đang tải…</div></div></section>`;
  try {
    const xs = await api('/ai/approved');
    $('#notices').innerHTML = xs.length ? xs.map(x => `<div class="list-row"><div class="icon">✓</div><div class="grow"><b>Giải thích chuyên môn đã được duyệt</b><p>${x.content}</p><small class="muted">Nguồn: ${x.dataSource}</small></div></div>`).join('') : '<div class="empty">Bạn chưa có thông báo mới.</div>';
  } catch (e) {
    toast(e.message);
  }
}

async function admin() {
  if (!me) {
    showLogin();
    return;
  }
  if (me.role === 'BENH_NHAN') {
    location.hash = 'lookup';
    return;
  }
  if (me.role === 'ADMIN') return adminDashboard();
  professionalDashboard();
}

async function professionalDashboard() {
  // Đã dời <section class="section"> lên đầu và nhóm lại gọn gàng
  app.innerHTML = `<section class="section">
        <div class="page-head"><h1>Trung tâm chuyên môn</h1><p class="muted">Quản lý quy tắc, duyệt nội dung AI và quản lý dữ liệu.</p></div>
        
        <div class="grid" style="margin-bottom: 30px;">
          <div class="card" style="cursor:pointer; padding: 24px; text-align: center; border: 2px solid var(--primary-light); border-radius: 12px; transition: all 0.2s;" onclick="manageDrugs()">
            <div style="font-size: 32px; margin-bottom: 8px;">💊</div>
            <h3 style="margin: 0 0 4px;">Quản lý Thuốc</h3>
            <p style="margin: 0; color: var(--muted); font-size: 12px;">Thêm, sửa, xóa thuốc</p>
          </div>
          <div class="card" style="cursor:pointer; padding: 24px; text-align: center; border: 2px solid var(--primary-light); border-radius: 12px; transition: all 0.2s;" onclick="manageIngredients()">
            <div style="font-size: 32px; margin-bottom: 8px;">⚗️</div>
            <h3 style="margin: 0 0 4px;">Quản lý Hoạt Chất</h3>
            <p style="margin: 0; color: var(--muted); font-size: 12px;">Quản lý thành phần hoạt tính</p>
          </div>
          <div class="card" style="cursor:pointer; padding: 24px; text-align: center; border: 2px solid var(--primary-light); border-radius: 12px; transition: all 0.2s;" onclick="manageDiseases()">
            <div style="font-size: 32px; margin-bottom: 8px;">🏥</div>
            <h3 style="margin: 0 0 4px;">Quản lý Bệnh Nền</h3>
            <p style="margin: 0; color: var(--muted); font-size: 12px;">Quản lý danh mục bệnh nền</p>
          </div>
          <div class="card" style="cursor:pointer; padding: 24px; text-align: center; border: 2px solid var(--primary-light); border-radius: 12px; transition: all 0.2s;" onclick="manageAllergies()">
            <div style="font-size: 32px; margin-bottom: 8px;">🚫</div>
            <h3 style="margin: 0 0 4px;">Quản lý Dị Ứng</h3>
            <p style="margin: 0; color: var(--muted); font-size: 12px;">Quản lý dị ứng và phản ứng</p>
          </div>
          <div class="card" style="cursor:pointer; padding: 24px; text-align: center; border: 2px solid var(--primary-light); border-radius: 12px; transition: all 0.2s;" onclick="manageInteractions()">
            <div style="font-size: 32px; margin-bottom: 8px;">🔗</div>
            <h3 style="margin: 0 0 4px;">Tương Tác Thuốc</h3>
            <p style="margin: 0; color: var(--muted); font-size: 12px;">Quản lý tương tác giữa thuốc</p>
          </div>
        </div>

        <h2>Nội dung AI chờ duyệt</h2>
        <div id="aiReview" class="card"><div class="empty">Đang tải…</div></div>
        
        <div class="result-head" style="margin-top:35px; margin-bottom:15px; align-items: center;">
            <h2 style="margin:0;">Quy tắc cảnh báo</h2>
            <button onclick="openRuleModal()">+ Thêm mới</button>
        </div>
        <div id="rules" class="card" style="padding:0;"><div class="empty">Đang tải…</div></div>
    </section>

    <dialog id="ruleDialog">
        <button class="close" onclick="document.getElementById('ruleDialog').close()">×</button>
        <div id="ruleContentWrapper">
            <h2 id="ruleModalTitle" style="margin-top: 0;">Thêm Quy Tắc Mới</h2>
            <form id="ruleForm" onsubmit="event.preventDefault(); saveRule();">
                <div class="row">
                    <div class="field"><label>Hoạt chất</label><select id="ruleIngredient" required><option>Đang tải...</option></select></div>
                    <div class="field"><label>Bệnh nền</label><select id="ruleDisease" required><option>Đang tải...</option></select></div>
                </div>
                <div class="field"><label>Mức độ cảnh báo</label><select id="ruleSeverity" required><option value="Cao">Nguy cơ cao</option><option value="TrungBinh">Cần thận trọng</option><option value="Thap">Nguy cơ thấp</option></select></div>
                <div class="field"><label>Nội dung chi tiết</label><textarea id="ruleContentText" required></textarea></div>
                <div class="row">
                    <div class="field"><label>Khuyến nghị</label><input type="text" id="ruleRecommendation"></div>
                    <div class="field"><label>Nguồn tài liệu</label><input type="text" id="ruleSource"></div>
                </div>
                <div class="field" style="text-align: right; margin-top: 20px;">
                    <button type="button" class="ghost" onclick="document.getElementById('ruleDialog').close()" style="margin-right: 10px;">Hủy</button>
                    <button type="submit">Lưu quy tắc</button>
                </div>
            </form>
        </div>
    </dialog>`;

  try {
    const [r, a] = await Promise.all([api('/warning-rules'), api('/ai/suggestions/pending')]);
    renderAiReview(a);

    $('#rules').innerHTML = `<table>
            <thead>
                <tr>
                    <th>Hoạt chất</th>
                    <th>Bệnh nền</th>
                    <th>Mức độ</th>
                    <th>Trạng thái</th>
                    <th style="text-align: right;">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${r.map(x => `<tr>
                    <td>${x.ingredient || '—'}</td>
                    <td>${x.disease || '—'}</td>
                    <td><span class="severity ${x.severity}">${labelSeverity(x.severity)}</span></td>
                    <td>${x.status || 'DaDuyet'}</td>
                    <td style="text-align: right;">
                        <button class="ghost" style="padding: 7px 10px; margin-right: 4px;" onclick="openRuleModal(${x.id})">Sửa</button>
                        <button class="danger" onclick="deleteRule(${x.id})">Xóa</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
  } catch (e) {
    toast(e.message);
  }
}

async function adminDashboard() {
  app.innerHTML = `<section class="section"><div class="page-head"><h1>Dashboard quản trị</h1><p class="muted">Tài khoản, phân quyền, nhật ký và thống kê hệ thống.</p></div><div id="stats" class="stats"></div><div class="grid" style="margin-top:24px"><div class="card"><h2>Thuốc bị cảnh báo nhiều</h2><div id="topDrugs"></div></div><div class="card"><h2>Cảnh báo theo mức độ</h2><div id="warningChart"></div></div></div><h2 style="margin-top:35px">Quản lý tài khoản</h2><div id="users" class="card"></div></section>`;
  try {
    const [s, u] = await Promise.all([api('/admin/dashboard/summary'), api('/admin/users')]);
    $('#stats').innerHTML = [['Tổng tài khoản', s.tongTaiKhoan], ['Bệnh nhân', s.tongBenhNhan], ['Lượt tra cứu', s.tongLuotTraCuu]].map(x => `<div class="card stat"><div class="muted">${x[0]}</div><b>${x[1]}</b></div>`).join('');
    $('#topDrugs').innerHTML = s.thuocBiCanhBaoNhieuNhat.length ? s.thuocBiCanhBaoNhieuNhat.map(x => `<div class="list-row"><span class="grow">${x.tenThuoc}</span><b>${x.soLan}</b></div>`).join('') : '<div class="empty">Chưa có dữ liệu</div>';
    const max = Math.max(1, ...s.canhBaoTheoMucDo.map(x => x.soLuong));
    $('#warningChart').innerHTML = s.canhBaoTheoMucDo.map(x => `<div style="margin:12px 0"><div>${labelSeverity(x.mucDoCanhBao)} — ${x.soLuong}</div><div style="height:10px;background:var(--line);border-radius:9px"><div style="height:100%;width:${x.soLuong / max * 100}%;background:var(--primary);border-radius:9px"></div></div></div>`).join('') || '<div class="empty">Chưa có dữ liệu</div>';
    renderUsers(u);
  } catch (e) {
    toast(e.message);
  }
}

function renderUsers(u) {
  $('#users').innerHTML = `<table><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${u.map(x => `<tr><td><b>${x.username}</b><br><small>${x.fullName || ''}</small></td><td><select onchange="changeRole(${x.id},this.value)">${['BENH_NHAN', 'DUOC_SI', 'BAC_SI', 'ADMIN'].map(r => `<option ${r === x.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td><td>${x.active ? 'Hoạt động' : 'Đã khóa'}</td><td><button class="${x.active ? 'danger' : 'ghost'}" onclick="toggleUser(${x.id},${x.active})">${x.active ? 'Khóa' : 'Mở khóa'}</button></td></tr>`).join('')}</tbody></table>`;
}

async function changeRole(id, role) {
  try {
    const r = await api(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
    toast(r.message);
  } catch (e) {
    toast(e.message);
    adminDashboard();
  }
}

async function toggleUser(id, active) {
  try {
    const r = await api(`/admin/users/${id}/${active ? 'lock' : 'unlock'}`, { method: 'PUT' });
    toast(r.message);
    adminDashboard();
  } catch (e) {
    toast(e.message);
  }
}

function renderAiReview(items) {
  $('#aiReview').innerHTML = items.length ? items.map(x => `<div class="card ai-review" style="margin-bottom:12px"><span class="tag">${x.dataSource}</span><p><b>Nội dung gốc:</b> ${x.originalContent}</p><p><b>AI diễn giải:</b> ${x.aiContent}</p><div class="ai-actions"><button onclick="decideAi(${x.id},'approve')">Duyệt</button><button class="danger" onclick="decideAi(${x.id},'reject')">Từ chối</button></div></div>`) : '<div class="empty">Không có nội dung AI chờ duyệt.</div>';
}

async function decideAi(id, action) {
  try {
    const r = await api('/ai/' + action, { method: 'POST', body: JSON.stringify({ id }) });
    toast(r.message);
    admin();
  } catch (e) {
    toast(e.message);
  }
}

// --- ADMIN MANAGEMENT FUNCTIONS ---

async function manageDrugs() {
  if (!me || (me.role !== 'DUOC_SI' && me.role !== 'BAC_SI' && me.role !== 'ADMIN')) {
    location.hash = 'admin';
    return;
  }
  app.innerHTML = `<section class="section">
    <div class="page-head">
      <h1>Quản lý Thuốc</h1>
      <button onclick="openDrugDialog()">+ Thêm thuốc mới</button>
    </div>
    <div class="search-container" style="margin-bottom: 20px;">
      <input type="text" placeholder="Tìm kiếm thuốc..." id="drugSearch" oninput="searchDrugs(this.value)" style="width:100%; padding:10px;">
    </div>
    <div id="drugsList" class="card"><div class="empty">Đang tải…</div></div>
  </section>`;
  try {
    const drugs = await api('/drugs');
    renderDrugsList(drugs);
  } catch (e) {
    toast(e.message);
  }
}

function renderDrugsList(drugs) {
  const html = drugs.length ? `<table style="width:100%"><thead><tr><th>Tên thuốc</th><th>Hàm lượng</th><th>Dạng</th><th>Đường dùng</th><th>Hoạt chất</th><th>Thao tác</th></tr></thead><tbody>${drugs.map(d => `<tr><td><b>${d.TenThuoc || '—'}</b>${d.CanKeDon ? ' <span class="tag severity Cao" style="font-size:10px; margin-left:4px;">Kê đơn</span>' : ''}</td><td>${d.HamLuong || '—'}</td><td>${d.DangBaoChe || '—'}</td><td>${d.DuongDung || '—'}</td><td><span class="muted">${d.HoatChat || 'Chưa cập nhật'}</span></td><td style="min-width:130px;"><button class="ghost" style="margin-right:8px;" onclick="editDrug(${d.id})">Sửa</button><button class="danger" onclick="deleteDrug(${d.id})">Xóa</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Không có thuốc nào</div>';
  $('#drugsList').innerHTML = html;
}

function searchDrugs(q) {
  api('/drugs?keyword=' + encodeURIComponent(q)).then(drugs => renderDrugsList(drugs)).catch(e => toast(e.message));
}

function openDrugDialog(id = null) {
  const dialog = document.getElementById('authDialog');
  document.getElementById('authContent').innerHTML = `
    <form onsubmit="event.preventDefault(); saveDrug(${id || 'null'});" style="width: 650px; max-width: 100%;">
      <h2>${id ? 'Chỉnh sửa' : 'Thêm'} Thuốc</h2>
      
      <div class="row">
        <div class="field" style="flex: 2;"><label>Tên thuốc *</label><input type="text" id="d_TenThuoc" required></div>
        <div class="field" style="flex: 1;"><label>Hàm lượng</label><input type="text" id="d_HamLuong" placeholder="VD: 500mg"></div>
      </div>
      
      <div class="row">
        <div class="field"><label>Tên quốc tế</label><input type="text" id="d_TenQuocTe"></div>
        <div class="field"><label>Số đăng ký</label><input type="text" id="d_SoDangKy"></div>
      </div>

      <div class="row">
        <div class="field"><label>Dạng bào chế</label><input type="text" id="d_DangBaoChe" placeholder="VD: Viên nén"></div>
        <div class="field"><label>Đường dùng</label><input type="text" id="d_DuongDung" placeholder="VD: Uống"></div>
      </div>

      <div class="row">
        <div class="field"><label>Loại thuốc</label><input type="text" id="d_LoaiThuoc" placeholder="VD: Kháng sinh, Giảm đau..."></div>
        <div class="field"><label>Nhà sản xuất</label><input type="text" id="d_NhaSanXuat"></div>
      </div>

      <div class="field" style="flex-direction: row; align-items: center; gap: 8px; margin-bottom: 15px;">
        <input type="checkbox" id="d_CanKeDon" style="width: auto; height: 16px; margin: 0;">
        <label for="d_CanKeDon" style="margin: 0; cursor: pointer; color: var(--danger);">Thuốc kê đơn (Cần có chỉ định của bác sĩ)</label>
      </div>

      <div class="field"><label>Mô tả / Chỉ định</label><textarea id="d_MoTa" rows="2"></textarea></div>
      <div class="field"><label>Hướng dẫn sử dụng</label><textarea id="d_HuongDan" rows="2"></textarea></div>
      <div class="field"><label>Tác dụng phụ</label><textarea id="d_TacDungPhu" rows="2"></textarea></div>

      <div class="form-actions" style="margin-top:15px; text-align:right;">
        <button type="button" class="ghost" style="margin-right:8px;" onclick="document.getElementById('authDialog').close()">Hủy</button>
        <button type="submit">Lưu</button>
      </div>
    </form>`;
  
  dialog.showModal();
  
  if (id) {
    api('/drugs/' + id).then(drug => {
      document.getElementById('d_TenThuoc').value = drug.TenThuoc || '';
      document.getElementById('d_TenQuocTe').value = drug.TenQuocTe || '';
      document.getElementById('d_SoDangKy').value = drug.SoDangKy || '';
      document.getElementById('d_LoaiThuoc').value = drug.LoaiThuoc || '';
      document.getElementById('d_DangBaoChe').value = drug.DangBaoChe || '';
      document.getElementById('d_DuongDung').value = drug.DuongDung || '';
      document.getElementById('d_HamLuong').value = drug.HamLuong || '';
      document.getElementById('d_NhaSanXuat').value = drug.NhaSanXuat || '';
      document.getElementById('d_MoTa').value = drug.MoTa || '';
      document.getElementById('d_HuongDan').value = drug.HuongDanSuDung || '';
      document.getElementById('d_TacDungPhu').value = drug.TacDungPhu || '';
      document.getElementById('d_CanKeDon').checked = !!drug.CanKeDon;
    }).catch(e => toast(e.message));
  }
}

async function saveDrug(id) {
  const body = {
    TenThuoc: document.getElementById('d_TenThuoc').value.trim(),
    TenQuocTe: document.getElementById('d_TenQuocTe').value.trim(),
    SoDangKy: document.getElementById('d_SoDangKy').value.trim(),
    LoaiThuoc: document.getElementById('d_LoaiThuoc').value.trim(),
    DangBaoChe: document.getElementById('d_DangBaoChe').value.trim(),
    DuongDung: document.getElementById('d_DuongDung').value.trim(),
    HamLuong: document.getElementById('d_HamLuong').value.trim(),
    NhaSanXuat: document.getElementById('d_NhaSanXuat').value.trim(),
    MoTa: document.getElementById('d_MoTa').value.trim(),
    HuongDanSuDung: document.getElementById('d_HuongDan').value.trim(),
    TacDungPhu: document.getElementById('d_TacDungPhu').value.trim(),
    CanKeDon: document.getElementById('d_CanKeDon').checked ? 1 : 0
  };
  
  try {
    if (id) {
      await api('/drugs/' + id, { method: 'PUT', body: JSON.stringify(body) });
      toast('Đã cập nhật thuốc');
    } else {
      await api('/drugs', { method: 'POST', body: JSON.stringify(body) });
      toast('Đã thêm thuốc mới');
    }
    document.getElementById('authDialog').close();
    manageDrugs();
  } catch (e) {
    toast(e.message);
  }
}

async function deleteDrug(id) {
  if (!confirm('Xóa thuốc này?')) return;
  try {
    await api('/drugs/' + id, { method: 'DELETE' });
    toast('Đã xóa thuốc');
    manageDrugs();
  } catch (e) {
    toast(e.message);
  }
}

async function editDrug(id) {
  openDrugDialog(id);
}

// --- Quản lý hoạt chất ---

async function manageIngredients() {
  if (!me || (me.role !== 'DUOC_SI' && me.role !== 'BAC_SI' && me.role !== 'ADMIN')) {
    location.hash = 'admin';
    return;
  }
  app.innerHTML = `<section class="section">
    <div class="page-head">
      <h1>Quản lý Hoạt Chất</h1>
      <button onclick="openIngredientDialog()">+ Thêm hoạt chất mới</button>
    </div>
    <div class="search-container" style="margin-bottom: 20px;">
      <input type="text" placeholder="Tìm kiếm hoạt chất..." id="ingredientSearch" oninput="searchIngredients(this.value)" style="width:100%; padding:10px;">
    </div>
    <div id="ingredientsList" class="card"><div class="empty">Đang tải…</div></div>
  </section>`;
  try {
    const ingredients = await api('/ingredients');
    renderIngredientsList(ingredients);
  } catch (e) {
    toast(e.message);
  }
}

function renderIngredientsList(ingredients) {
  const html = ingredients.length ? `<table style="width:100%"><thead><tr><th>Tên hoạt chất</th><th>Mô tả</th><th>Thao tác</th></tr></thead><tbody>${ingredients.map(ing => `<tr><td><b>${ing.TenHoatChat || ing.name}</b></td><td>${ing.MoTa || ing.description || '—'}</td><td><button class="ghost" style="margin-right:8px;" onclick="editIngredient(${ing.MaHoatChat || ing.id})">Sửa</button><button class="danger" onclick="deleteIngredient(${ing.MaHoatChat || ing.id})">Xóa</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Không có hoạt chất nào</div>';
  $('#ingredientsList').innerHTML = html;
}

function searchIngredients(q) {
  api('/ingredients?keyword=' + encodeURIComponent(q)).then(ings => renderIngredientsList(ings)).catch(e => toast(e.message));
}

function openIngredientDialog(id = null) {
  // Thay vì tự tạo mới, chúng ta mượn luôn hộp thoại authDialog đang rảnh rỗi trên HTML
  const dialog = document.getElementById('authDialog');
  document.getElementById('authContent').innerHTML = `
    <form onsubmit="event.preventDefault(); saveIngredient(${id || 'null'});">
      <h2>${id ? 'Chỉnh sửa' : 'Thêm'} Hoạt chất</h2>
      <div class="field"><label>Tên hoạt chất *</label><input type="text" id="ingName" required></div>
      <div class="field"><label>Mô tả</label><textarea id="ingDesc" rows="3"></textarea></div>
      <div class="form-actions" style="margin-top:15px; text-align:right;">
        <button type="button" class="ghost" style="margin-right:8px;" onclick="document.getElementById('authDialog').close()">Hủy</button>
        <button type="submit">Lưu</button>
      </div>
    </form>`;
  dialog.showModal();
  
  if (id) {
    api('/ingredients/' + id).then(ing => {
      document.getElementById('ingName').value = ing.TenHoatChat || ing.name || '';
      document.getElementById('ingDesc').value = ing.MoTa || ing.description || '';
    }).catch(e => toast(e.message));
  }
}

async function saveIngredient(id) {
  const body = {
    TenHoatChat: document.getElementById('ingName').value.trim(),
    name: document.getElementById('ingName').value.trim(),
    MoTa: document.getElementById('ingDesc').value.trim(),
    description: document.getElementById('ingDesc').value.trim()
  };
  try {
    if (id) {
      await api('/ingredients/' + id, { method: 'PUT', body: JSON.stringify(body) });
      toast('Đã cập nhật hoạt chất');
    } else {
      await api('/ingredients', { method: 'POST', body: JSON.stringify(body) });
      toast('Đã thêm hoạt chất mới');
    }
    document.getElementById('authDialog').close();
    manageIngredients();
  } catch (e) {
    toast(e.message);
  }
}

async function deleteIngredient(id) {
  if (!confirm('Xóa hoạt chất này?')) return;
  try {
    await api('/ingredients/' + id, { method: 'DELETE' });
    toast('Đã xóa hoạt chất');
    manageIngredients();
  } catch (e) {
    toast(e.message);
  }
}

async function editIngredient(id) {
  openIngredientDialog(id);
}

// --- Quản lý bệnh nền ---

async function manageDiseases() {
  if (!me || (me.role !== 'DUOC_SI' && me.role !== 'BAC_SI' && me.role !== 'ADMIN')) {
    location.hash = 'admin';
    return;
  }
  app.innerHTML = `<section class="section">
    <div class="page-head">
      <h1>Quản lý Bệnh Nền</h1>
      <button onclick="openDiseaseDialog()">+ Thêm bệnh nền mới</button>
    </div>
    <div class="search-container" style="margin-bottom: 20px;">
      <input type="text" placeholder="Tìm kiếm bệnh nền..." id="diseaseSearch" oninput="searchDiseases(this.value)" style="width:100%; padding:10px;">
    </div>
    <div id="diseasesList" class="card"><div class="empty">Đang tải…</div></div>
  </section>`;
  try {
    const diseases = await api('/diseases');
    renderDiseasesList(diseases);
  } catch (e) {
    toast(e.message);
  }
}

function renderDiseasesList(diseases) {
  const html = diseases.length ? `<table style="width:100%"><thead><tr><th>Tên bệnh</th><th>Tên thông dụng</th><th>Mã ICD</th><th>Mô tả</th><th>Thao tác</th></tr></thead><tbody>${diseases.map(d => `<tr><td><b>${d.TenBenh || d.name}</b></td><td>${d.TenThongDung || d.commonName || '—'}</td><td><span class="tag">${d.MaICD || d.icd || '—'}</span></td><td>${d.MoTa || d.description || '—'}</td><td><button class="ghost" style="margin-right:8px;" onclick="editDisease(${d.MaBenhNen || d.id})">Sửa</button><button class="danger" onclick="deleteDisease(${d.MaBenhNen || d.id})">Xóa</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Không có bệnh nền nào</div>';
  $('#diseasesList').innerHTML = html;
}

function searchDiseases(q) {
  api('/diseases?keyword=' + encodeURIComponent(q)).then(diseases => renderDiseasesList(diseases)).catch(e => toast(e.message));
}

function openDiseaseDialog(id = null) {
  // Dùng chung authDialog để tránh kẹt DOM
  const dialog = document.getElementById('authDialog');
  document.getElementById('authContent').innerHTML = `
    <form onsubmit="event.preventDefault(); saveDisease(${id || 'null'});">
      <h2>${id ? 'Chỉnh sửa' : 'Thêm'} Bệnh Nền</h2>
      <div class="field"><label>Tên bệnh *</label><input type="text" id="diseaseName" required></div>
      <div class="field"><label>Tên thông dụng</label><input type="text" id="diseaseCommonName" placeholder="VD: Cao huyết áp"></div>
      <div class="row">
        <div class="field"><label>Nhóm bệnh</label><input type="text" id="diseaseCategory" placeholder="VD: Tim mạch, Nội tiết..."></div>
        <div class="field"><label>Mã ICD</label><input type="text" id="diseaseIcd" placeholder="VD: I10, E11..."></div>
      </div>
      <div class="field"><label>Mô tả bệnh</label><textarea id="diseaseDescription" rows="3"></textarea></div>
      <div class="form-actions" style="margin-top:15px; text-align:right;">
        <button type="button" class="ghost" style="margin-right:8px;" onclick="document.getElementById('authDialog').close()">Hủy</button>
        <button type="submit">Lưu</button>
      </div>
    </form>`;
  dialog.showModal();
  
  if (id) {
    api('/diseases/' + id).then(disease => {
      document.getElementById('diseaseName').value = disease.TenBenh || disease.name || '';
      document.getElementById('diseaseCommonName').value = disease.TenThongDung || disease.commonName || '';
      document.getElementById('diseaseCategory').value = disease.NhomBenh || disease.category || '';
      document.getElementById('diseaseIcd').value = disease.MaICD || disease.icd || '';
      document.getElementById('diseaseDescription').value = disease.MoTa || disease.description || '';
    }).catch(e => toast(e.message));
  }
}

async function saveDisease(id) {
  const body = {
    name: document.getElementById('diseaseName').value.trim(),
    commonName: document.getElementById('diseaseCommonName').value.trim(),
    category: document.getElementById('diseaseCategory').value.trim(),
    icd: document.getElementById('diseaseIcd').value.trim(),
    description: document.getElementById('diseaseDescription').value.trim()
  };
  
  try {
    if (id) {
      await api('/diseases/' + id, { method: 'PUT', body: JSON.stringify(body) });
      toast('Đã cập nhật bệnh nền');
    } else {
      await api('/diseases', { method: 'POST', body: JSON.stringify(body) });
      toast('Đã thêm bệnh nền mới');
    }
    document.getElementById('authDialog').close();
    manageDiseases();
  } catch (e) {
    toast(e.message);
  }
}

async function deleteDisease(id) {
  if (!confirm('Xóa bệnh nền này?')) return;
  try {
    await api('/diseases/' + id, { method: 'DELETE' });
    toast('Đã xóa bệnh nền');
    manageDiseases();
  } catch (e) {
    toast(e.message);
  }
}

async function editDisease(id) {
  openDiseaseDialog(id);
}

// --- Quản lý dị ứng ---

async function manageAllergies() {
  if (!me || (me.role !== 'DUOC_SI' && me.role !== 'BAC_SI' && me.role !== 'ADMIN')) {
    location.hash = 'admin';
    return;
  }
  app.innerHTML = `<section class="section">
    <div class="page-head">
      <h1>Quản lý Dị Ứng</h1>
      <button onclick="openAllergyDialog()">+ Thêm dị ứng mới</button>
    </div>
    <div class="search-container" style="margin-bottom: 20px;">
      <input type="text" placeholder="Tìm kiếm dị ứng..." id="allergySearch" oninput="searchAllergies(this.value)" style="width:100%; padding:10px;">
    </div>
    <div id="allergiesList" class="card"><div class="empty">Đang tải…</div></div>
  </section>`;
  try {
    const allergies = await api('/allergies');
    renderAllergiesList(allergies);
  } catch (e) {
    toast(e.message);
  }
}

function renderAllergiesList(allergies) {
  const html = allergies.length ? `<table style="width:100%"><thead><tr><th>Loại dị ứng</th><th>Mô tả / Triệu chứng</th><th>Thao tác</th></tr></thead><tbody>${allergies.map(a => `<tr><td><b>${a.TenDiUng || a.name}</b></td><td>${a.MoTa || a.description || '—'}</td><td><button class="ghost" style="margin-right:8px;" onclick="editAllergy(${a.MaDiUng || a.id})">Sửa</button><button class="danger" onclick="deleteAllergy(${a.MaDiUng || a.id})">Xóa</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Không có dị ứng nào</div>';
  $('#allergiesList').innerHTML = html;
}

function searchAllergies(q) {
  api('/allergies?keyword=' + encodeURIComponent(q)).then(allergies => renderAllergiesList(allergies)).catch(e => toast(e.message));
}

function openAllergyDialog(id = null) {
  const dialog = document.getElementById('authDialog');
  document.getElementById('authContent').innerHTML = `
    <form onsubmit="event.preventDefault(); saveAllergy(${id || 'null'});">
      <h2>${id ? 'Chỉnh sửa' : 'Thêm'} Dị Ứng</h2>
      <div class="field"><label>Loại dị ứng *</label><input type="text" id="allergyName" required></div>
      <div class="field"><label>Mô tả / Triệu chứng</label><textarea id="allergySymptoms" rows="3"></textarea></div>
      <div class="form-actions" style="margin-top:15px; text-align:right;">
        <button type="button" class="ghost" style="margin-right:8px;" onclick="document.getElementById('authDialog').close()">Hủy</button>
        <button type="submit">Lưu</button>
      </div>
    </form>`;
  dialog.showModal();
  
  if (id) {
    api('/allergies/' + id).then(allergy => {
      document.getElementById('allergyName').value = allergy.TenDiUng || allergy.name || '';
      document.getElementById('allergySymptoms').value = allergy.MoTa || allergy.description || '';
    }).catch(e => toast(e.message));
  }
}

async function saveAllergy(id) {
  const body = {
    name: document.getElementById('allergyName').value.trim(),
    description: document.getElementById('allergySymptoms').value.trim()
  };
  
  try {
    if (id) {
      await api('/allergies/' + id, { method: 'PUT', body: JSON.stringify(body) });
      toast('Đã cập nhật dị ứng');
    } else {
      await api('/allergies', { method: 'POST', body: JSON.stringify(body) });
      toast('Đã thêm dị ứng mới');
    }
    document.getElementById('authDialog').close();
    manageAllergies();
  } catch (e) {
    toast(e.message);
  }
}

async function deleteAllergy(id) {
  if (!confirm('Xóa dị ứng này?')) return;
  try {
    await api('/allergies/' + id, { method: 'DELETE' });
    toast('Đã xóa dị ứng');
    manageAllergies();
  } catch (e) {
    toast(e.message);
  }
}

async function editAllergy(id) {
  openAllergyDialog(id);
}

// --- Quản lý tương tác thuốc ---

async function manageInteractions() {
  if (!me || (me.role !== 'DUOC_SI' && me.role !== 'BAC_SI' && me.role !== 'ADMIN')) {
    location.hash = 'admin';
    return;
  }
  app.innerHTML = `<section class="section">
    <div class="page-head">
      <h1>Quản lý Tương Tác Thuốc</h1>
      <button onclick="openInteractionDialog()">+ Thêm tương tác mới</button>
    </div>
    <div class="search-container" style="margin-bottom: 20px;">
      <input type="text" placeholder="Tìm kiếm theo tên hoạt chất..." id="interactionSearch" oninput="searchInteractions(this.value)" style="width:100%; padding:10px;">
    </div>
    <div id="interactionsList" class="card"><div class="empty">Đang tải…</div></div>
  </section>`;
  try {
    const interactions = await api('/drug-interactions');
    renderInteractionsList(interactions);
  } catch (e) {
    toast(e.message);
  }
}

function renderInteractionsList(interactions) {
  const html = interactions.length ? `<table style="width:100%"><thead><tr><th>Hoạt chất 1</th><th>Hoạt chất 2</th><th>Mức độ</th><th>Hậu quả</th><th>Thao tác</th></tr></thead><tbody>${interactions.map(i => `<tr><td>${i.HoatChat1 || i.ingredient1 || '—'}</td><td>${i.HoatChat2 || i.ingredient2 || '—'}</td><td><span class="tag severity ${i.MucDo || i.severity}">${labelSeverity(i.MucDo || i.severity)}</span></td><td>${i.HauQua || i.description || '—'}</td><td><button class="danger" onclick="deleteInteraction(${i.MaTuongTac || i.id})">Xóa</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Không có tương tác nào</div>';
  $('#interactionsList').innerHTML = html;
}

function searchInteractions(q) {
  api('/drug-interactions?keyword=' + encodeURIComponent(q)).then(interactions => renderInteractionsList(interactions)).catch(e => toast(e.message));
}

function openInteractionDialog(id = null) {
  const dialog = document.getElementById('interactionDialog');
  const form = document.getElementById('interactionForm');
  form.reset();
  
  api('/ingredients').then(ings => {
    document.getElementById('interactionIngredient1').innerHTML = ings.map(ing => `<option value="${ing.MaHoatChat || ing.id}">${ing.TenHoatChat || ing.name}</option>`).join('');
    document.getElementById('interactionIngredient2').innerHTML = ings.map(ing => `<option value="${ing.MaHoatChat || ing.id}">${ing.TenHoatChat || ing.name}</option>`).join('');
    document.getElementById('interactionDialog').dataset.id = id || '';
  }).catch(e => toast(e.message));
  
  dialog.showModal();
}

async function saveInteraction() {
  const body = {
    MaHoatChat1: parseInt(document.getElementById('interactionIngredient1').value),
    MaHoatChat2: parseInt(document.getElementById('interactionIngredient2').value),
    MucDo: document.getElementById('interactionSeverity').value,
    HauQua: document.getElementById('interactionDescription').value.trim(),
    KhuyenNghi: document.getElementById('interactionRecommendation').value.trim()
  };
  
  try {
    await api('/drug-interactions', { method: 'POST', body: JSON.stringify(body) });
    toast('Đã thêm tương tác thuốc mới');
    document.getElementById('interactionDialog').close();
    manageInteractions();
  } catch (e) {
    toast(e.message);
  }
}

async function deleteInteraction(id) {
  if (!confirm('Xóa tương tác này?')) return;
  try {
    await api('/drug-interactions/' + id, { method: 'DELETE' });
    toast('Đã xóa tương tác');
    manageInteractions();
  } catch (e) {
    toast(e.message);
  }
}

function route() {
  document.querySelectorAll('nav a').forEach(x => x.classList.toggle('active', x.hash === location.hash));
  const p = (location.hash || '#home').slice(1);
  ({ home, lookup, profile, history, notifications, admin }[p] || home)();
  scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
updateNav();
route();

// --- LOGIC QUẢN LÝ QUY TẮC CẢNH BÁO ---

let currentRuleId = null;

async function openRuleModal(id = null) {
  const dialog = document.getElementById('ruleDialog');
  const form = document.getElementById('ruleForm');
  form.reset();
  currentRuleId = id;

  try {
    const [ings, dis] = await Promise.all([api('/ingredients'), api('/diseases')]);
    document.getElementById('ruleIngredient').innerHTML = ings.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
    document.getElementById('ruleDisease').innerHTML = dis.map(x => `<option value="${x.id}">${x.name}</option>`).join('');

    if (id) {
      document.getElementById('ruleModalTitle').innerText = 'Chỉnh sửa Quy Tắc';
      const rule = await api('/warning-rules/' + id);

      document.getElementById('ruleIngredient').value = rule.ingredientId;
      document.getElementById('ruleDisease').value = rule.diseaseId;
      document.getElementById('ruleSeverity').value = rule.severity || 'Cao';
      document.getElementById('ruleContentText').value = rule.content || '';
      document.getElementById('ruleRecommendation').value = rule.recommendation || '';
      document.getElementById('ruleSource').value = rule.source || '';
    } else {
      document.getElementById('ruleModalTitle').innerText = 'Thêm Quy Tắc Mới';
    }

    dialog.showModal();
  } catch (e) {
    toast('Lỗi tải dữ liệu: ' + e.message);
  }
}

async function saveRule() {
  const body = {
    ingredientId: parseInt(document.getElementById('ruleIngredient').value),
    diseaseId: parseInt(document.getElementById('ruleDisease').value),
    severity: document.getElementById('ruleSeverity').value,
    content: document.getElementById('ruleContentText').value.trim(),
    recommendation: document.getElementById('ruleRecommendation').value.trim(),
    source: document.getElementById('ruleSource').value.trim()
  };

  try {
    if (currentRuleId) {
      await api('/warning-rules/' + currentRuleId, { method: 'PUT', body: JSON.stringify(body) });
      toast('Đã cập nhật quy tắc');
    } else {
      await api('/warning-rules', { method: 'POST', body: JSON.stringify(body) });
      toast('Đã thêm quy tắc mới');
    }
    document.getElementById('ruleDialog').close();
    professionalDashboard();
  } catch (e) {
    toast(e.message);
  }
}

async function deleteRule(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa quy tắc cảnh báo này không? Thao tác không thể hoàn tác.')) return;
  try {
    await api('/warning-rules/' + id, { method: 'DELETE' });
    toast('Đã xóa quy tắc');
    professionalDashboard();
  } catch (e) {
    toast(e.message);
  }
}

// --- AI CHATBOX INTERACTION LOGIC ---
let chatHistory = [];
let currentWarningContext = null;

function toggleChat() {
  const container = $('#chat-box-container');
  if (!container) return;
  const isOpen = !container.classList.contains('chat-closed');
  if (isOpen) {
    container.classList.add('chat-closed');
  } else {
    container.classList.remove('chat-closed');
    const messagesEl = $('#chat-messages');
    if (messagesEl && messagesEl.children.length === 0) {
      initChatWelcome();
    }
    scrollToBottom();
  }
}
window.toggleChat = toggleChat;

function initChatWelcome() {
  const messagesEl = $('#chat-messages');
  if (!messagesEl) return;
  messagesEl.innerHTML = '';
  
  if (!me) {
    messagesEl.innerHTML = `
      <div class="chat-msg assistant">Xin chào! Tôi là Trợ lý Y khoa AI của MedCheck.
      
Vui lòng đăng nhập để tôi có thể hỗ trợ tư vấn cá nhân hóa và giải thích các cảnh báo y tế dựa trên hồ sơ bệnh lý của riêng bạn.</div>
      <div class="chat-msg system-alert">
        Bạn chưa đăng nhập.
        <br>
        <button onclick="showLogin(); toggleChat();">Đăng nhập ngay</button>
      </div>
    `;
    return;
  }
  
  chatHistory = [];
  currentWarningContext = null;
  const name = me.fullName || 'bạn';
  const roleText = me.role === 'BENH_NHAN' ? 'bệnh nhân' : 'nhân viên y tế';
  
  let welcomeMsg = `Xin chào ${name}! Tôi là Trợ lý Y khoa AI của MedCheck.
  
Tôi đã kết nối với hồ sơ ${roleText} của bạn và sẵn sàng hỗ trợ giải thích các cảnh báo tương tác thuốc hoặc tư vấn sử dụng thuốc an toàn.

Bạn có thể hỏi tôi bất cứ câu hỏi nào hoặc chọn một gợi ý nhanh bên dưới:`;

  messagesEl.innerHTML = `
    <div class="chat-msg assistant">
      ${welcomeMsg}
      <div class="quick-prompts">
        <button class="quick-prompt-btn" onclick="sendQuickPrompt('Làm sao để biết một thuốc có tương tác xấu với bệnh nền của tôi?')">🔍 Cách kiểm tra tương tác thuốc?</button>
        <button class="quick-prompt-btn" onclick="sendQuickPrompt('Hãy hướng dẫn tôi cách đọc và hiểu mức độ cảnh báo?')">⚠️ Ý nghĩa các mức độ cảnh báo?</button>
        <button class="quick-prompt-btn" onclick="sendQuickPrompt('Tại sao việc tự ý dùng thuốc giảm đau lại nguy hiểm cho người bệnh thận hoặc dạ dày?')">💊 Lưu ý khi dùng thuốc giảm đau?</button>
      </div>
    </div>
  `;
}
window.initChatWelcome = initChatWelcome;

function sendQuickPrompt(text) {
  const inputEl = $('#chat-input-field');
  if (!inputEl) return;
  inputEl.value = text;
  $('#chat-input-form').dispatchEvent(new Event('submit'));
}
window.sendQuickPrompt = sendQuickPrompt;

async function sendChatMessage(e) {
  if (e) e.preventDefault();
  const inputEl = $('#chat-input-field');
  if (!inputEl) return;
  const message = inputEl.value.trim();
  if (!message) return;
  
  if (!me) {
    showLogin();
    toggleChat();
    return;
  }
  
  appendChatMessage('user', message);
  inputEl.value = '';
  
  const loadingEl = $('#chat-loading');
  if (loadingEl) loadingEl.style.display = 'flex';
  scrollToBottom();
  
  try {
    const response = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: message,
        history: chatHistory,
        warningContext: currentWarningContext
      })
    });
    
    if (loadingEl) loadingEl.style.display = 'none';
    
    appendChatMessage('assistant', response.answer);
    
    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'model', content: response.answer });
    
    currentWarningContext = null;
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    appendChatMessage('assistant', 'Xin lỗi, đã xảy ra lỗi trong quá trình xử lý câu hỏi: ' + err.message);
  }
  
  scrollToBottom();
}
window.sendChatMessage = sendChatMessage;

function chatExplainWarning(index) {
  const w = cache.lookup.warnings[index];
  if (!w) return;
  
  const container = $('#chat-box-container');
  if (container && container.classList.contains('chat-closed')) {
    toggleChat();
  }
  
  currentWarningContext = `${w.type}: ${w.subject} - Mức độ: ${labelSeverity(w.severity)} - Nội dung: ${w.content} - Khuyến nghị: ${w.recommendation}`;
  
  const promptText = `Giải thích cảnh báo y tế này cho tôi: Cảnh báo về ${w.subject} (${w.type}), cảnh báo ở mức "${labelSeverity(w.severity)}" với lý do: "${w.content}". Khuyến nghị: "${w.recommendation}".`;
  sendQuickPrompt(promptText);
}
window.chatExplainWarning = chatExplainWarning;

function appendChatMessage(role, content) {
  const messagesEl = $('#chat-messages');
  if (!messagesEl) return;
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg ' + role;
  msgEl.textContent = content;
  messagesEl.appendChild(msgEl);
}

function scrollToBottom() {
  const messagesEl = $('#chat-messages');
  if (messagesEl) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}
