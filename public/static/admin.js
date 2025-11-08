// ファディー彦根 - 管理画面

// ========== グローバル変数 ==========
let currentUser = null;
let authToken = null;
let users = [];
let inquiries = [];
let selectedUser = null;

// ========== ユーティリティ関数 ==========
function showLoading() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner spinner-lg"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

async function apiRequest(url, options = {}) {
  showLoading();
  try {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await axios({ url, method: options.method || 'GET', headers, data: options.body, ...options });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  } finally {
    hideLoading();
  }
}

// ========== データ読み込み ==========
async function checkAuth() {
  try {
    const result = await apiRequest('/api/auth/me');
    if (result.success && result.data.role === 'admin') {
      currentUser = result.data;
      renderPage();
      await loadAllData();
    } else {
      alert('管理者権限が必要です');
      window.location.href = '/';
    }
  } catch (error) {
    alert('認証に失敗しました');
    window.location.href = '/';
  }
}

async function loadAllData() {
  await Promise.all([loadUsers(), loadInquiries()]);
}

async function loadUsers() {
  try {
    const result = await apiRequest('/api/admin/users');
    if (result.success) {
      users = result.data;
      renderUsers();
    }
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

async function loadInquiries() {
  try {
    const result = await apiRequest('/api/admin/inquiries');
    if (result.success) {
      inquiries = result.data;
      renderInquiries();
    }
  } catch (error) {
    console.error('Failed to load inquiries:', error);
  }
}

async function loadUserLogs(userId) {
  try {
    const result = await apiRequest(`/api/admin/users/${userId}/logs`);
    if (result.success) {
      return result.data;
    }
  } catch (error) {
    console.error('Failed to load user logs:', error);
    return [];
  }
}

// ========== レンダリング関数 ==========
function renderPage() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <header class="bg-white shadow-md">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <a href="/" class="flex items-center gap-3">
              <i class="fas fa-dumbbell text-3xl text-primary"></i>
              <h1 class="text-2xl font-bold text-gray-800">ファディー彦根 - 管理画面</h1>
            </a>
          </div>
          <nav class="flex items-center gap-4">
            <a href="/mypage" class="btn btn-outline">
              <i class="fas fa-user"></i> マイページ
            </a>
            <a href="/" class="btn btn-primary">
              <i class="fas fa-home"></i> ホーム
            </a>
          </nav>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h2 class="text-3xl font-bold text-gray-800 mb-2">管理者ダッシュボード</h2>
        <p class="text-gray-600">全ユーザーのデータと問い合わせを管理できます</p>
      </div>

      <!-- 統計カード -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="card bg-gradient-to-r from-pink-400 to-pink-500 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">総ユーザー数</p>
              <h3 class="text-4xl font-bold">${users.length}</h3>
            </div>
            <i class="fas fa-users text-5xl opacity-50"></i>
          </div>
        </div>
        <div class="card bg-gradient-to-r from-blue-400 to-blue-500 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">未対応の問い合わせ</p>
              <h3 class="text-4xl font-bold">${inquiries.filter(i => i.status === 'pending').length}</h3>
            </div>
            <i class="fas fa-envelope text-5xl opacity-50"></i>
          </div>
        </div>
        <div class="card bg-gradient-to-r from-green-400 to-green-500 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">対応中</p>
              <h3 class="text-4xl font-bold">${inquiries.filter(i => i.status === 'in_progress').length}</h3>
            </div>
            <i class="fas fa-tasks text-5xl opacity-50"></i>
          </div>
        </div>
      </div>

      <!-- タブ -->
      <div class="mb-4 border-b border-gray-200">
        <nav class="flex gap-4">
          <button onclick="showTab('users')" id="tab-users" class="tab-button active">
            <i class="fas fa-users mr-2"></i> ユーザー管理
          </button>
          <button onclick="showTab('inquiries')" id="tab-inquiries" class="tab-button">
            <i class="fas fa-inbox mr-2"></i> 問い合わせ管理
          </button>
        </nav>
      </div>

      <!-- ユーザー管理タブ -->
      <div id="users-tab" class="tab-content">
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800">ユーザー一覧</h3>
            <input type="text" id="user-search" placeholder="ユーザー検索..." class="form-input w-64" onkeyup="searchUsers()" />
          </div>
          <div id="users-container"></div>
        </div>
      </div>

      <!-- 問い合わせ管理タブ -->
      <div id="inquiries-tab" class="tab-content hidden">
        <div class="card">
          <h3 class="text-xl font-bold text-gray-800 mb-4">問い合わせ一覧</h3>
          <div id="inquiries-container"></div>
        </div>
      </div>
    </main>
  `;
}

function renderUsers() {
  const container = document.getElementById('users-container');
  if (!container) return;

  container.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名前</th>
            <th>メール</th>
            <th>認証方法</th>
            <th>権限</th>
            <th>登録日</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr id="user-row-${user.id}">
              <td>${user.id}</td>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td><span class="badge badge-primary">${user.provider.toUpperCase()}</span></td>
              <td><span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-success'}">${user.role}</span></td>
              <td class="whitespace-nowrap">${dayjs(user.created_at).format('YYYY/MM/DD')}</td>
              <td>
                <button onclick="toggleUserLogs(${user.id})" class="btn btn-sm btn-outline">
                  <i class="fas fa-eye"></i> ログ
                </button>
                <button onclick="showAdviceModal(${user.id})" class="btn btn-sm btn-primary">
                  <i class="fas fa-comment"></i> アドバイス
                </button>
              </td>
            </tr>
            <tr id="user-logs-${user.id}" class="hidden">
              <td colspan="7" class="bg-gray-50">
                <div class="p-4">
                  <h4 class="font-semibold mb-3">健康ログ履歴</h4>
                  <div id="logs-content-${user.id}">読み込み中...</div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderInquiries() {
  const container = document.getElementById('inquiries-container');
  if (!container) return;

  container.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名前</th>
            <th>メール</th>
            <th>件名</th>
            <th>ステータス</th>
            <th>日時</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${inquiries.map(inquiry => `
            <tr>
              <td>${inquiry.id}</td>
              <td>${inquiry.name}</td>
              <td>${inquiry.email}</td>
              <td>${inquiry.subject}</td>
              <td>
                <select onchange="updateInquiryStatus(${inquiry.id}, this.value)" class="form-select text-sm">
                  <option value="pending" ${inquiry.status === 'pending' ? 'selected' : ''}>未対応</option>
                  <option value="in_progress" ${inquiry.status === 'in_progress' ? 'selected' : ''}>対応中</option>
                  <option value="resolved" ${inquiry.status === 'resolved' ? 'selected' : ''}>解決済み</option>
                </select>
              </td>
              <td class="whitespace-nowrap">${dayjs(inquiry.created_at).format('YYYY/MM/DD HH:mm')}</td>
              <td>
                <button onclick="showInquiryDetail(${inquiry.id})" class="btn btn-sm btn-outline">
                  <i class="fas fa-eye"></i> 詳細
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ========== タブ切り替え ==========
function showTab(tabName) {
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.remove('hidden');
}

// ========== ユーザーログ表示 ==========
async function toggleUserLogs(userId) {
  const row = document.getElementById(`user-logs-${userId}`);
  const container = document.getElementById(`logs-content-${userId}`);
  
  if (row.classList.contains('hidden')) {
    row.classList.remove('hidden');
    
    if (container.innerHTML === '読み込み中...') {
      const logs = await loadUserLogs(userId);
      
      if (logs.length === 0) {
        container.innerHTML = '<p class="text-gray-500">ログはありません</p>';
      } else {
        container.innerHTML = `
          <div class="table-scroll">
            <table class="table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>体重</th>
                  <th>体脂肪率</th>
                  <th>食事</th>
                  <th>運動</th>
                  <th>気分</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(log => `
                  <tr>
                    <td>${dayjs(log.log_date).format('YYYY/MM/DD')}</td>
                    <td>${log.weight ? log.weight + 'kg' : '-'}</td>
                    <td>${log.body_fat_percentage ? log.body_fat_percentage + '%' : '-'}</td>
                    <td>${log.meal_description || '-'}</td>
                    <td>${log.exercise_type || '-'}</td>
                    <td>${log.mood || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  } else {
    row.classList.add('hidden');
  }
}

// ========== アドバイスモーダル ==========
function showAdviceModal(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="p-6">
        <h3 class="text-2xl font-bold mb-4">${user.name} さんへのアドバイス</h3>
        <form onsubmit="submitAdvice(event, ${userId})">
          <div class="form-group">
            <label class="form-label">スタッフ名</label>
            <input type="text" name="staffName" required class="form-input" value="${currentUser.name}" />
          </div>
          <div class="form-group">
            <label class="form-label">アドバイス種別</label>
            <select name="adviceType" required class="form-select">
              <option value="diet">食事</option>
              <option value="exercise">運動</option>
              <option value="lifestyle">生活習慣</option>
              <option value="general">総合</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">アドバイス内容</label>
            <textarea name="adviceText" required class="form-textarea" rows="5"></textarea>
          </div>
          <div class="flex gap-3">
            <button type="submit" class="btn btn-primary flex-1">
              <i class="fas fa-paper-plane mr-2"></i> 送信
            </button>
            <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn btn-secondary">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function submitAdvice(event, userId) {
  event.preventDefault();
  const form = event.target;
  const data = {
    userId,
    staffName: form.staffName.value,
    adviceType: form.adviceType.value,
    adviceText: form.adviceText.value,
  };

  try {
    const result = await apiRequest('/api/admin/advices', {
      method: 'POST',
      body: data,
    });

    if (result.success) {
      alert('アドバイスを送信しました');
      form.closest('.modal-overlay').remove();
    }
  } catch (error) {
    alert('送信に失敗しました: ' + error.message);
  }
}

// ========== 問い合わせ管理 ==========
async function updateInquiryStatus(inquiryId, status) {
  try {
    const result = await apiRequest(`/api/admin/inquiries/${inquiryId}/status`, {
      method: 'PUT',
      body: { status },
    });

    if (result.success) {
      await loadInquiries();
    }
  } catch (error) {
    alert('ステータスの更新に失敗しました');
  }
}

function showInquiryDetail(inquiryId) {
  const inquiry = inquiries.find(i => i.id === inquiryId);
  if (!inquiry) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="p-6">
        <h3 class="text-2xl font-bold mb-4">問い合わせ詳細</h3>
        <dl class="space-y-3">
          <div>
            <dt class="font-semibold text-gray-700">名前</dt>
            <dd>${inquiry.name}</dd>
          </div>
          <div>
            <dt class="font-semibold text-gray-700">メールアドレス</dt>
            <dd>${inquiry.email}</dd>
          </div>
          ${inquiry.phone ? `
            <div>
              <dt class="font-semibold text-gray-700">電話番号</dt>
              <dd>${inquiry.phone}</dd>
            </div>
          ` : ''}
          <div>
            <dt class="font-semibold text-gray-700">件名</dt>
            <dd>${inquiry.subject}</dd>
          </div>
          <div>
            <dt class="font-semibold text-gray-700">お問い合わせ内容</dt>
            <dd class="whitespace-pre-wrap bg-gray-50 p-3 rounded">${inquiry.message}</dd>
          </div>
          <div>
            <dt class="font-semibold text-gray-700">日時</dt>
            <dd>${dayjs(inquiry.created_at).format('YYYY/MM/DD HH:mm')}</dd>
          </div>
        </dl>
        <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary w-full mt-4">
          閉じる
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ========== 検索機能 ==========
function searchUsers() {
  const query = document.getElementById('user-search').value.toLowerCase();
  const rows = document.querySelectorAll('#users-container tbody tr[id^="user-row-"]');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
    
    const userId = row.id.replace('user-row-', '');
    const logRow = document.getElementById(`user-logs-${userId}`);
    if (logRow) logRow.style.display = 'none';
  });
}

// ========== 初期化 ==========
async function init() {
  authToken = localStorage.getItem('authToken');
  if (!authToken) {
    alert('ログインしてください');
    window.location.href = '/';
    return;
  }

  await checkAuth();
}

document.addEventListener('DOMContentLoaded', init);
