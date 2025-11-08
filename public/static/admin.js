// 管理画面 - ファディー彦根

// 状態管理
let currentUser = null;
let users = [];
let selectedUser = null;
let userLogs = [];
let inquiries = [];
let stats = {};

// ページ初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAuth();
});

// 管理者認証チェック
async function checkAdminAuth() {
  const token = getToken();
  if (!token) {
    showToast('ログインが必要です', 'warning');
    setTimeout(() => window.location.href = '/', 1500);
    return;
  }
  
  try {
    const response = await apiCall('/api/auth/verify');
    if (response.success && response.data.role === 'admin') {
      currentUser = response.data;
      await loadAdminData();
      renderPage();
    } else {
      showToast('管理者権限が必要です', 'error');
      setTimeout(() => window.location.href = '/', 1500);
    }
  } catch (error) {
    showToast('認証エラーが発生しました', 'error');
    setTimeout(() => window.location.href = '/', 1500);
  }
}

// 管理者データロード
async function loadAdminData() {
  try {
    const [usersRes, inquiriesRes, statsRes] = await Promise.all([
      apiCall('/api/admin/users'),
      apiCall('/api/admin/inquiries'),
      apiCall('/api/admin/stats'),
    ]);
    
    if (usersRes.success) users = usersRes.data;
    if (inquiriesRes.success) inquiries = inquiriesRes.data;
    if (statsRes.success) stats = statsRes.data;
  } catch (error) {
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ページレンダリング
function renderPage() {
  const root = document.getElementById('root');
  root.innerHTML = `
    ${renderHeader()}
    ${renderStats()}
    ${renderTabs()}
    <div id="tab-content"></div>
  `;
  
  // デフォルトタブ表示
  showTab('users');
}

// ヘッダー
function renderHeader() {
  return `
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <i class="fas fa-user-shield text-3xl" style="color: var(--color-primary)"></i>
            <div>
              <h1 class="text-2xl font-bold" style="color: var(--color-primary)">管理画面</h1>
              <p class="text-sm text-gray-600">ファディー彦根</p>
            </div>
          </div>
          
          <nav class="flex items-center gap-6">
            <a href="/" class="text-gray-700 hover:text-primary transition">トップ</a>
            <a href="/mypage" class="text-gray-700 hover:text-primary transition">マイページ</a>
            <button onclick="logout()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
              ログアウト
            </button>
          </nav>
        </div>
      </div>
    </header>
  `;
}

// 統計情報
function renderStats() {
  return `
    <section class="gradient-bg text-white py-8">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <i class="fas fa-users text-2xl"></i>
              <span class="text-sm opacity-75">総顧客数</span>
            </div>
            <div class="text-3xl font-bold">${stats.totalUsers || 0}</div>
          </div>
          
          <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <i class="fas fa-clipboard-list text-2xl"></i>
              <span class="text-sm opacity-75">総ログ数</span>
            </div>
            <div class="text-3xl font-bold">${stats.totalLogs || 0}</div>
          </div>
          
          <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <i class="fas fa-envelope text-2xl"></i>
              <span class="text-sm opacity-75">未対応</span>
            </div>
            <div class="text-3xl font-bold">${stats.pendingInquiries || 0}</div>
          </div>
          
          <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <i class="fas fa-calendar-day text-2xl"></i>
              <span class="text-sm opacity-75">今日のログ</span>
            </div>
            <div class="text-3xl font-bold">${stats.todayLogs || 0}</div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// タブ
function renderTabs() {
  return `
    <div class="bg-white border-b">
      <div class="container mx-auto px-4">
        <div class="flex gap-2">
          <button onclick="showTab('users')" id="tab-users" 
            class="tab-btn px-6 py-4 font-medium border-b-2 border-transparent hover:border-primary transition">
            <i class="fas fa-users mr-2"></i>顧客管理
          </button>
          <button onclick="showTab('inquiries')" id="tab-inquiries" 
            class="tab-btn px-6 py-4 font-medium border-b-2 border-transparent hover:border-primary transition">
            <i class="fas fa-envelope mr-2"></i>問い合わせ
          </button>
        </div>
      </div>
    </div>
  `;
}

// タブ切り替え
function showTab(tab) {
  // タブボタンの状態更新
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('border-primary', 'text-primary');
  });
  document.getElementById(`tab-${tab}`).classList.add('border-primary', 'text-primary');
  
  // コンテンツ表示
  const content = document.getElementById('tab-content');
  if (tab === 'users') {
    content.innerHTML = renderUsersTab();
  } else if (tab === 'inquiries') {
    content.innerHTML = renderInquiriesTab();
  }
}

// 顧客管理タブ
function renderUsersTab() {
  return `
    <section class="bg-gray-50 py-8">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">顧客一覧</h2>
          <div class="flex gap-3">
            <input type="text" id="user-search" placeholder="名前またはメールで検索..." 
              class="px-4 py-2 border rounded-lg w-64" onkeyup="searchUsers()">
            <button onclick="loadAdminData(); renderPage();" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>顧客情報</th>
                  <th>登録日</th>
                  <th>ログ数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(user => `
                  <tr>
                    <td>
                      <div class="flex items-center gap-3">
                        <img src="${user.avatar_url || 'https://via.placeholder.com/40'}" 
                          class="w-10 h-10 rounded-full">
                        <div>
                          <div class="font-medium">${user.name}</div>
                          <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                      <span class="badge badge-primary" id="log-count-${user.id}">--</span>
                    </td>
                    <td>
                      <div class="flex gap-2">
                        <button onclick="viewUserDetails(${user.id})" class="text-blue-500 hover:text-blue-700">
                          <i class="fas fa-eye"></i> 詳細
                        </button>
                        <button onclick="showAddAdviceModal(${user.id})" class="text-green-500 hover:text-green-700">
                          <i class="fas fa-comment-medical"></i> アドバイス
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        ${selectedUser ? renderUserDetails() : ''}
      </div>
    </section>
  `;
}

// 顧客詳細表示
function renderUserDetails() {
  if (!selectedUser || userLogs.length === 0) return '';
  
  return `
    <div class="mt-8 bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">
          ${selectedUser.name} さんの健康ログ
        </h3>
        <button onclick="closeUserDetails()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        ${userLogs.map((log, index) => `
          <div class="border rounded-lg">
            <button onclick="toggleAccordion(this)" 
              class="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition">
              <div class="flex items-center gap-4">
                <span class="font-medium">${formatDate(log.log_date)}</span>
                <div class="flex gap-3 text-sm text-gray-600">
                  ${log.weight ? `<span><i class="fas fa-weight"></i> ${log.weight}kg</span>` : ''}
                  ${log.body_fat_percentage ? `<span><i class="fas fa-percentage"></i> ${log.body_fat_percentage}%</span>` : ''}
                  ${log.meal_calories ? `<span><i class="fas fa-utensils"></i> ${log.meal_calories}kcal</span>` : ''}
                </div>
              </div>
              <i class="fas fa-chevron-down accordion-icon transition-transform"></i>
            </button>
            
            <div class="accordion-content px-4 pb-4">
              <form id="edit-log-${log.id}" class="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label class="block text-sm font-medium mb-1">体重 (kg)</label>
                  <input type="number" step="0.1" name="weight" value="${log.weight || ''}"
                    class="w-full px-3 py-2 border rounded">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">体脂肪率 (%)</label>
                  <input type="number" step="0.1" name="body_fat_percentage" value="${log.body_fat_percentage || ''}"
                    class="w-full px-3 py-2 border rounded">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">体温 (℃)</label>
                  <input type="number" step="0.1" name="body_temperature" value="${log.body_temperature || ''}"
                    class="w-full px-3 py-2 border rounded">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">睡眠時間 (時間)</label>
                  <input type="number" step="0.5" name="sleep_hours" value="${log.sleep_hours || ''}"
                    class="w-full px-3 py-2 border rounded">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">運動時間 (分)</label>
                  <input type="number" name="exercise_minutes" value="${log.exercise_minutes || ''}"
                    class="w-full px-3 py-2 border rounded">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">カロリー (kcal)</label>
                  <input type="number" name="meal_calories" value="${log.meal_calories || ''}"
                    class="w-full px-3 py-2 border rounded">
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium mb-1">メモ</label>
                  <textarea name="condition_note" rows="2" 
                    class="w-full px-3 py-2 border rounded">${log.condition_note || ''}</textarea>
                </div>
                <div class="col-span-2 flex justify-end">
                  <button type="button" onclick="updateUserLog(${log.id})" 
                    class="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90">
                    <i class="fas fa-save mr-1"></i>更新
                  </button>
                </div>
              </form>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 問い合わせタブ
function renderInquiriesTab() {
  return `
    <section class="bg-gray-50 py-8">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">問い合わせ一覧</h2>
          <select onchange="filterInquiries(this.value)" class="px-4 py-2 border rounded-lg">
            <option value="">すべて</option>
            <option value="pending">未対応</option>
            <option value="replied">返信済み</option>
            <option value="closed">完了</option>
          </select>
        </div>
        
        <div class="space-y-4">
          ${inquiries.map(inquiry => `
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-lg font-bold">${inquiry.subject}</h3>
                    <span class="badge badge-${inquiry.status === 'pending' ? 'error' : inquiry.status === 'replied' ? 'warning' : 'success'}">
                      ${inquiry.status === 'pending' ? '未対応' : inquiry.status === 'replied' ? '返信済み' : '完了'}
                    </span>
                  </div>
                  <div class="text-sm text-gray-600">
                    <i class="fas fa-user mr-1"></i>${inquiry.name}
                    <i class="fas fa-envelope ml-3 mr-1"></i>${inquiry.email}
                    ${inquiry.phone ? `<i class="fas fa-phone ml-3 mr-1"></i>${inquiry.phone}` : ''}
                  </div>
                </div>
                <span class="text-sm text-gray-500">${formatDateTime(inquiry.created_at)}</span>
              </div>
              
              <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <p class="text-gray-700">${inquiry.message}</p>
              </div>
              
              ${inquiry.admin_reply ? `
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                  <div class="text-sm text-gray-600 mb-1">返信内容:</div>
                  <p class="text-gray-700">${inquiry.admin_reply}</p>
                </div>
              ` : ''}
              
              <div class="flex justify-end">
                <button onclick="showReplyModal(${inquiry.id})" 
                  class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90">
                  <i class="fas fa-reply mr-2"></i>
                  ${inquiry.admin_reply ? '返信を編集' : '返信する'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// 顧客検索
function searchUsers() {
  const searchTerm = document.getElementById('user-search').value.toLowerCase();
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm) || 
    user.email.toLowerCase().includes(searchTerm)
  );
  
  // 再レンダリング
  users = filteredUsers;
  showTab('users');
}

// 顧客詳細表示
async function viewUserDetails(userId) {
  selectedUser = users.find(u => u.id === userId);
  if (!selectedUser) return;
  
  try {
    const response = await apiCall(`/api/admin/users/${userId}/logs`);
    if (response.success) {
      userLogs = response.data;
      showTab('users');
    }
  } catch (error) {
    showToast('ログの取得に失敗しました', 'error');
  }
}

// 顧客詳細を閉じる
function closeUserDetails() {
  selectedUser = null;
  userLogs = [];
  showTab('users');
}

// 顧客ログ更新
async function updateUserLog(logId) {
  const form = document.getElementById(`edit-log-${logId}`);
  const formData = new FormData(form);
  
  const data = {
    weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
    body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
    body_temperature: formData.get('body_temperature') ? parseFloat(formData.get('body_temperature')) : null,
    sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
    exercise_minutes: formData.get('exercise_minutes') ? parseInt(formData.get('exercise_minutes')) : null,
    meal_calories: formData.get('meal_calories') ? parseInt(formData.get('meal_calories')) : null,
    condition_note: formData.get('condition_note') || null,
  };
  
  try {
    const response = await apiCall(`/api/admin/logs/${logId}`, { method: 'PUT', data });
    if (response.success) {
      showToast('ログを更新しました', 'success');
      await viewUserDetails(selectedUser.id);
    }
  } catch (error) {
    showToast('更新に失敗しました', 'error');
  }
}

// アドバイス追加モーダル
function showAddAdviceModal(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-6 max-w-2xl">
      <h3 class="text-xl font-bold mb-4">${user.name} さんへアドバイスを送信</h3>
      <form id="advice-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">スタッフ名 *</label>
          <input type="text" name="staff_name" required value="${currentUser.name}"
            class="w-full px-4 py-2 border rounded-lg">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">種類 *</label>
          <select name="advice_type" required class="w-full px-4 py-2 border rounded-lg">
            <option value="diet">食事</option>
            <option value="exercise">運動</option>
            <option value="general">全般</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">タイトル *</label>
          <input type="text" name="title" required 
            class="w-full px-4 py-2 border rounded-lg">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">アドバイス内容 *</label>
          <textarea name="content" rows="5" required 
            class="w-full px-4 py-2 border rounded-lg"></textarea>
        </div>
        
        <div class="flex gap-3 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg">
            送信
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('advice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      user_id: userId,
      staff_name: formData.get('staff_name'),
      advice_type: formData.get('advice_type'),
      title: formData.get('title'),
      content: formData.get('content'),
    };
    
    try {
      const response = await apiCall('/api/admin/advices', { method: 'POST', data });
      if (response.success) {
        showToast('アドバイスを送信しました', 'success');
        modal.remove();
      }
    } catch (error) {
      showToast('送信に失敗しました', 'error');
    }
  });
}

// 問い合わせ返信モーダル
function showReplyModal(inquiryId) {
  const inquiry = inquiries.find(i => i.id === inquiryId);
  if (!inquiry) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-6 max-w-2xl">
      <h3 class="text-xl font-bold mb-4">問い合わせに返信</h3>
      
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <div class="text-sm text-gray-600 mb-2">
          <strong>${inquiry.name}</strong> (${inquiry.email})
        </div>
        <div class="text-sm text-gray-600 mb-2"><strong>件名:</strong> ${inquiry.subject}</div>
        <p class="text-gray-700">${inquiry.message}</p>
      </div>
      
      <form id="reply-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">返信内容 *</label>
          <textarea name="admin_reply" rows="6" required 
            class="w-full px-4 py-2 border rounded-lg">${inquiry.admin_reply || ''}</textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">ステータス *</label>
          <select name="status" required class="w-full px-4 py-2 border rounded-lg">
            <option value="pending" ${inquiry.status === 'pending' ? 'selected' : ''}>未対応</option>
            <option value="replied" ${inquiry.status === 'replied' ? 'selected' : ''}>返信済み</option>
            <option value="closed" ${inquiry.status === 'closed' ? 'selected' : ''}>完了</option>
          </select>
        </div>
        
        <div class="flex gap-3 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg">
            返信を保存
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('reply-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      admin_reply: formData.get('admin_reply'),
      status: formData.get('status'),
    };
    
    try {
      const response = await apiCall(`/api/admin/inquiries/${inquiryId}`, { method: 'PUT', data });
      if (response.success) {
        showToast('返信を保存しました', 'success');
        modal.remove();
        await loadAdminData();
        showTab('inquiries');
      }
    } catch (error) {
      showToast('保存に失敗しました', 'error');
    }
  });
}

// 問い合わせフィルター
async function filterInquiries(status) {
  try {
    const url = status ? `/api/admin/inquiries?status=${status}` : '/api/admin/inquiries';
    const response = await apiCall(url);
    if (response.success) {
      inquiries = response.data;
      showTab('inquiries');
    }
  } catch (error) {
    showToast('データの取得に失敗しました', 'error');
  }
}
