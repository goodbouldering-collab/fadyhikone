// 管理画面 - ファディー彦根

// 状態管理
let currentUser = null;
let users = [];
let selectedUser = null;
let userLogs = [];
let userComments = [];
let inquiries = [];
let opinions = [];
let unprocessedOpinionCount = 0;
let stats = {};
let announcements = [];
let settings = [];

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
    const [usersRes, inquiriesRes, statsRes, opinionsRes, opinionCountRes] = await Promise.all([
      apiCall('/api/admin/users'),
      apiCall('/api/admin/inquiries'),
      apiCall('/api/admin/stats'),
      apiCall('/api/opinions/admin'),
      apiCall('/api/opinions/admin/unprocessed-count'),
    ]);
    
    if (usersRes.success) users = usersRes.data;
    if (inquiriesRes.success) inquiries = inquiriesRes.data;
    if (statsRes.success) stats = statsRes.data;
    if (opinionsRes.success) opinions = opinionsRes.data;
    if (opinionCountRes.success) unprocessedOpinionCount = opinionCountRes.count;
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
    <header class="bg-white shadow-md sticky top-0 z-50">
      <div class="container mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a href="/" class="flex items-center gap-2">
              <i class="fas fa-dumbbell text-lg" style="color: var(--color-primary)"></i>
              <h1 class="text-lg font-bold" style="color: var(--color-primary)">ファディー彦根</h1>
            </a>
            
            ${unprocessedOpinionCount > 0 ? `
              <div class="flex items-center gap-2 px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-lg animate-pulse">
                <i class="fas fa-bell text-orange-600"></i>
                <span class="text-xs font-bold text-orange-700">未回答の質問: ${unprocessedOpinionCount}件</span>
              </div>
            ` : ''}
          </div>
          
          <nav class="flex items-center gap-2">
            <a href="/mypage" class="px-4 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition flex items-center gap-2">
              <i class="fas fa-chart-line"></i>
              <span>マイページ</span>
            </a>
            ${currentUser?.role === 'admin' ? `
              <a href="/admin" class="px-4 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition flex items-center gap-2">
                <i class="fas fa-user-shield"></i>
                <span>管理画面</span>
              </a>
            ` : ''}
          </nav>
        </div>
      </div>
    </header>
  `;
}

// 統計情報
function renderStats() {
  return `
    <section class="gradient-bg text-white py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-users text-lg"></i>
                <span class="text-xs opacity-75">総顧客数</span>
              </div>
              <div class="text-2xl font-bold">${stats.totalUsers || 0}</div>
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-clipboard-list text-lg"></i>
                <span class="text-xs opacity-75">総ログ数</span>
              </div>
              <div class="text-2xl font-bold">${stats.totalLogs || 0}</div>
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-envelope text-lg"></i>
                <span class="text-xs opacity-75">未対応</span>
              </div>
              <div class="text-2xl font-bold">${stats.pendingInquiries || 0}</div>
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-calendar-day text-lg"></i>
                <span class="text-xs opacity-75">今日のログ</span>
              </div>
              <div class="text-2xl font-bold">${stats.todayLogs || 0}</div>
            </div>
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
        <div class="max-w-7xl mx-auto">
          <div class="flex gap-2">
            <button onclick="showTab('users')" id="tab-users" 
              class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent hover:border-primary transition">
              <i class="fas fa-users mr-1"></i>会員管理
            </button>
            <button onclick="showTab('opinions')" id="tab-opinions" 
              class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent hover:border-primary transition relative">
              <i class="fas fa-comments mr-1"></i>質問管理
              ${unprocessedOpinionCount > 0 ? `
                <span class="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  ${unprocessedOpinionCount}
                </span>
              ` : ''}
            </button>
            <button onclick="showTab('inquiries')" id="tab-inquiries" 
              class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent hover:border-primary transition">
              <i class="fas fa-envelope mr-1"></i>問い合わせ
            </button>
            <button onclick="showTab('settings')" id="tab-settings" 
              class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent hover:border-primary transition">
              <i class="fas fa-cog mr-1"></i>管理設定
            </button>
          </div>
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
  } else if (tab === 'opinions') {
    content.innerHTML = renderOpinionsTab();
  } else if (tab === 'inquiries') {
    content.innerHTML = renderInquiriesTab();
  } else if (tab === 'settings') {
    loadSettingsData().then(() => {
      content.innerHTML = renderSettingsTab();
    });
  }
}

// 顧客管理タブ
function renderUsersTab() {
  return `
    <section class="bg-gray-50 py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">顧客一覧</h2>
            <div class="flex gap-2">
              <input type="text" id="user-search" placeholder="名前またはメールで検索..." 
                class="px-3 py-2 text-sm border rounded-lg w-60" onkeyup="searchUsers()">
              <button onclick="loadAdminData(); renderPage();" class="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="table-container overflow-x-auto">
              <table class="table min-w-full text-sm">
                <thead>
                  <tr>
                    <th class="text-xs">顧客情報</th>
                    <th class="text-xs">登録日</th>
                    <th class="text-xs">ログ数</th>
                    <th class="text-xs">操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(user => `
                    <tr>
                      <td>
                        <div class="flex items-center gap-2">
                          <img src="${user.avatar_url || 'https://via.placeholder.com/40'}" 
                            class="w-8 h-8 rounded-full">
                          <div>
                            <div class="font-medium text-sm">${user.name}</div>
                            <div class="text-xs text-gray-500">${user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td class="text-sm">${formatDate(user.created_at)}</td>
                      <td>
                        <span class="badge badge-primary text-xs" id="log-count-${user.id}">--</span>
                      </td>
                      <td>
                        <div class="flex gap-2">
                          <button onclick="viewUserDetails(${user.id})" class="text-blue-500 hover:text-blue-700 text-xs">
                            <i class="fas fa-eye"></i> 詳細
                          </button>
                          <button onclick="showAddAdviceModal(${user.id})" class="text-green-500 hover:text-green-700 text-xs">
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
      </div>
    </section>
  `;
}

// 顧客詳細表示
function renderUserDetails() {
  if (!selectedUser) return '';
  
  return `
    <div class="mt-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">
          ${selectedUser.name} さんの詳細情報
        </h3>
        <button onclick="closeUserDetails()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>
      
      <!-- スタッフコメントセクション -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-base font-bold text-gray-800">
            <i class="fas fa-comments text-primary mr-2"></i>スタッフコメント
          </h4>
          <button onclick="showAddCommentModal(${selectedUser.id})" 
            class="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600">
            <i class="fas fa-plus mr-1"></i>コメント追加
          </button>
        </div>
        
        ${userComments.length > 0 ? `
          <div class="space-y-2">
            ${userComments.map(comment => `
              <div class="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <div class="flex justify-between items-start mb-1">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-user-nurse text-blue-600 text-xs"></i>
                    <span class="text-xs font-medium text-gray-700">${comment.staff_name}</span>
                    <span class="text-xs text-gray-500">${formatDateTime(comment.created_at)}</span>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="showEditCommentModal(${comment.id}, '${comment.comment.replace(/'/g, "\\'")}')" 
                      class="text-blue-500 hover:text-blue-700 text-xs">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteComment(${comment.id})" 
                      class="text-red-500 hover:text-red-700 text-xs">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">${comment.comment}</p>
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-sm text-gray-500 text-center py-4">まだコメントがありません</p>'}
      </div>
      
      <!-- 健康ログセクション -->
      <div>
        <h4 class="text-base font-bold text-gray-800 mb-3">
          <i class="fas fa-clipboard-list text-primary mr-2"></i>健康ログ履歴
        </h4>
        ${userLogs.length > 0 ? `
          <div class="space-y-3">
            ${userLogs.map((log, index) => `
              <div class="border rounded-lg">
                <button onclick="toggleAccordion(this)" 
                  class="w-full px-3 py-2 flex justify-between items-center hover:bg-gray-50 transition">
                  <div class="flex items-center gap-3">
                    <span class="font-medium text-sm">${formatDate(log.log_date)}</span>
                    <div class="flex gap-2 text-xs text-gray-600">
                      ${log.weight ? `<span><i class="fas fa-weight"></i> ${log.weight}kg</span>` : ''}
                      ${log.body_fat_percentage ? `<span><i class="fas fa-percentage"></i> ${log.body_fat_percentage}%</span>` : ''}
                      ${log.meal_calories ? `<span><i class="fas fa-utensils"></i> ${log.meal_calories}kcal</span>` : ''}
                    </div>
                  </div>
                  <i class="fas fa-chevron-down accordion-icon transition-transform text-xs"></i>
                </button>
                
                <div class="accordion-content px-3 pb-3">
                  <form id="edit-log-${log.id}" class="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label class="block text-xs font-medium mb-1">体重 (kg)</label>
                      <input type="number" step="0.1" name="weight" value="${log.weight || ''}"
                        class="w-full px-2 py-1.5 text-sm border rounded">
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">体脂肪率 (%)</label>
                      <input type="number" step="0.1" name="body_fat_percentage" value="${log.body_fat_percentage || ''}"
                        class="w-full px-2 py-1.5 text-sm border rounded">
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">体温 (℃)</label>
                      <input type="number" step="0.1" name="body_temperature" value="${log.body_temperature || ''}"
                        class="w-full px-2 py-1.5 text-sm border rounded">
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">睡眠時間 (時間)</label>
                      <input type="number" step="0.5" name="sleep_hours" value="${log.sleep_hours || ''}"
                        class="w-full px-2 py-1.5 text-sm border rounded">
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">運動時間 (分)</label>
                      <input type="number" name="exercise_minutes" value="${log.exercise_minutes || ''}"
                        class="w-full px-2 py-1.5 text-sm border rounded">
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">カロリー (kcal)</label>
                      <input type="number" name="meal_calories" value="${log.meal_calories || ''}"
                        class="w-full px-2 py-1.5 text-sm border rounded">
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">体調評価</label>
                      <select name="condition_rating" class="w-full px-2 py-1.5 text-sm border rounded">
                        <option value="1" ${(log.condition_rating || 3) === 1 ? 'selected' : ''}>😫 とても悪い</option>
                        <option value="2" ${(log.condition_rating || 3) === 2 ? 'selected' : ''}>😟 悪い</option>
                        <option value="3" ${(log.condition_rating || 3) === 3 ? 'selected' : ''}>😐 普通</option>
                        <option value="4" ${(log.condition_rating || 3) === 4 ? 'selected' : ''}>😊 良い</option>
                        <option value="5" ${(log.condition_rating || 3) === 5 ? 'selected' : ''}>😄 とても良い</option>
                      </select>
                    </div>
                    <div class="col-span-2">
                      <label class="block text-xs font-medium mb-1">運動記録</label>
                      <textarea name="condition_note" rows="2" 
                        placeholder="例：ベンチプレス60kg × 10回 × 3セット"
                        class="w-full px-2 py-1.5 text-sm border rounded">${log.condition_note || ''}</textarea>
                    </div>
                    <div class="col-span-2 flex justify-end">
                      <button type="button" onclick="updateUserLog(${log.id})" 
                        class="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-opacity-90">
                        <i class="fas fa-save mr-1"></i>更新
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-sm text-gray-500 text-center py-4">ログがありません</p>'}
      </div>
    </div>
  `;
}

// 質問管理タブ
function renderOpinionsTab() {
  const pendingOpinions = opinions.filter(op => op.status === 'pending');
  const answeredOpinions = opinions.filter(op => op.status === 'answered');
  
  return `
    <section class="bg-gray-50 py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">質問管理（オピニオンボックス）</h2>
            <button onclick="loadAdminData(); renderPage();" class="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
          
          <!-- 未回答の質問 -->
          ${pendingOpinions.length > 0 ? `
            <div class="mb-6">
              <h3 class="text-base font-bold text-orange-700 mb-3 flex items-center gap-2">
                <i class="fas fa-hourglass-half"></i>
                未回答の質問（${pendingOpinions.length}件）
              </h3>
              <div class="space-y-3">
                ${pendingOpinions.map(opinion => `
                  <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-orange-500">
                    <div class="flex justify-between items-start mb-3">
                      <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                          <img src="${opinion.avatar_url || 'https://via.placeholder.com/40'}" 
                            class="w-10 h-10 rounded-full">
                          <div>
                            <div class="font-bold text-sm">${opinion.user_name}</div>
                            <div class="text-xs text-gray-500">${opinion.user_email}</div>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="badge badge-warning text-xs">未回答</span>
                        <span class="text-xs text-gray-500">${formatDateTime(opinion.created_at)}</span>
                      </div>
                    </div>
                    
                    <div class="bg-gray-50 p-3 rounded mb-3">
                      <p class="text-sm font-medium text-gray-700 mb-1">質問内容:</p>
                      <p class="text-sm text-gray-800 whitespace-pre-wrap">${opinion.question}</p>
                    </div>
                    
                    <button 
                      onclick="showAnswerOpinionModal(${opinion.id})" 
                      class="w-full px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
                    >
                      <i class="fas fa-reply mr-1"></i>
                      回答する
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="bg-white p-6 rounded-lg shadow-md text-center mb-6">
              <i class="fas fa-check-circle text-4xl text-green-500 mb-2"></i>
              <p class="text-sm text-gray-700 font-medium">すべての質問に回答済みです！</p>
            </div>
          `}
          
          <!-- 回答済みの質問 -->
          ${answeredOpinions.length > 0 ? `
            <div>
              <h3 class="text-base font-bold text-green-700 mb-3 flex items-center gap-2">
                <i class="fas fa-check-circle"></i>
                回答済み（${answeredOpinions.length}件）
              </h3>
              <div class="space-y-3">
                ${answeredOpinions.map(opinion => `
                  <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-500">
                    <div class="flex justify-between items-start mb-3">
                      <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                          <img src="${opinion.avatar_url || 'https://via.placeholder.com/40'}" 
                            class="w-10 h-10 rounded-full">
                          <div>
                            <div class="font-bold text-sm">${opinion.user_name}</div>
                            <div class="text-xs text-gray-500">${opinion.user_email}</div>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="badge badge-success text-xs">回答済み</span>
                        <span class="text-xs text-gray-500">${formatDateTime(opinion.created_at)}</span>
                      </div>
                    </div>
                    
                    <div class="bg-gray-50 p-3 rounded mb-3">
                      <p class="text-sm font-medium text-gray-700 mb-1">質問内容:</p>
                      <p class="text-sm text-gray-800 whitespace-pre-wrap">${opinion.question}</p>
                    </div>
                    
                    <div class="bg-green-50 p-3 rounded border-l-2 border-green-500 mb-3">
                      <div class="flex items-center gap-2 mb-2">
                        <i class="fas fa-user-nurse text-green-600 text-xs"></i>
                        <span class="text-xs font-medium text-green-700">${opinion.answered_by} からの回答:</span>
                        <span class="text-xs text-gray-500">${formatDateTime(opinion.answered_at)}</span>
                      </div>
                      <p class="text-sm text-gray-800 whitespace-pre-wrap">${opinion.answer}</p>
                    </div>
                    
                    <button 
                      onclick="deleteOpinion(${opinion.id})" 
                      class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <i class="fas fa-trash mr-1"></i>
                      削除
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </section>
  `;
}

// 問い合わせタブ
function renderInquiriesTab() {
  return `
    <section class="bg-gray-50 py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">問い合わせ一覧</h2>
            <select onchange="filterInquiries(this.value)" class="px-3 py-2 text-sm border rounded-lg">
              <option value="">すべて</option>
              <option value="pending">未対応</option>
              <option value="replied">返信済み</option>
              <option value="closed">完了</option>
            </select>
          </div>
          
          <div class="space-y-3">
            ${inquiries.map(inquiry => `
              <div class="bg-white rounded-lg shadow-md p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="text-base font-bold">${inquiry.subject}</h3>
                      <span class="badge badge-${inquiry.status === 'pending' ? 'error' : inquiry.status === 'replied' ? 'warning' : 'success'} text-xs">
                        ${inquiry.status === 'pending' ? '未対応' : inquiry.status === 'replied' ? '返信済み' : '完了'}
                      </span>
                    </div>
                    <div class="text-xs text-gray-600">
                      <i class="fas fa-user mr-1"></i>${inquiry.name}
                      <i class="fas fa-envelope ml-2 mr-1"></i>${inquiry.email}
                      ${inquiry.phone ? `<i class="fas fa-phone ml-2 mr-1"></i>${inquiry.phone}` : ''}
                    </div>
                  </div>
                  <span class="text-xs text-gray-500">${formatDateTime(inquiry.created_at)}</span>
                </div>
                
                <div class="bg-gray-50 p-3 rounded-lg mb-3">
                  <p class="text-sm text-gray-700">${inquiry.message}</p>
                </div>
                
                ${inquiry.admin_reply ? `
                  <div class="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                    <div class="text-xs text-gray-600 mb-1">返信内容:</div>
                    <p class="text-sm text-gray-700">${inquiry.admin_reply}</p>
                  </div>
                ` : ''}
                
                <div class="flex justify-end">
                  <button onclick="showReplyModal(${inquiry.id})" 
                    class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90">
                    <i class="fas fa-reply mr-1"></i>
                    ${inquiry.admin_reply ? '返信を編集' : '返信する'}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
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
    const [logsRes, commentsRes] = await Promise.all([
      apiCall(`/api/admin/users/${userId}/logs`),
      apiCall(`/api/comments/admin/user/${userId}`)
    ]);
    
    if (logsRes.success) userLogs = logsRes.data;
    if (commentsRes.success) userComments = commentsRes.data;
    
    showTab('users');
  } catch (error) {
    showToast('データの取得に失敗しました', 'error');
  }
}

// 顧客詳細を閉じる
function closeUserDetails() {
  selectedUser = null;
  userLogs = [];
  userComments = [];
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
    condition_rating: formData.get('condition_rating') ? parseInt(formData.get('condition_rating')) : 3,
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
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">${user.name} さんへアドバイスを送信</h3>
      <form id="advice-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">スタッフ名 *</label>
          <input type="text" name="staff_name" required value="${currentUser.name}"
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">種類 *</label>
          <select name="advice_type" required class="w-full px-3 py-2 text-sm border rounded-lg">
            <option value="diet">食事</option>
            <option value="exercise">運動</option>
            <option value="general">全般</option>
          </select>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">タイトル *</label>
          <input type="text" name="title" required 
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">アドバイス内容 *</label>
          <textarea name="content" rows="4" required 
            class="w-full px-3 py-2 text-sm border rounded-lg"></textarea>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
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
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">問い合わせに返信</h3>
      
      <div class="bg-gray-50 p-3 rounded-lg mb-3">
        <div class="text-xs text-gray-600 mb-1">
          <strong>${inquiry.name}</strong> (${inquiry.email})
        </div>
        <div class="text-xs text-gray-600 mb-1"><strong>件名:</strong> ${inquiry.subject}</div>
        <p class="text-sm text-gray-700">${inquiry.message}</p>
      </div>
      
      <form id="reply-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">返信内容 *</label>
          <textarea name="admin_reply" rows="5" required 
            class="w-full px-3 py-2 text-sm border rounded-lg">${inquiry.admin_reply || ''}</textarea>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">ステータス *</label>
          <select name="status" required class="w-full px-3 py-2 text-sm border rounded-lg">
            <option value="pending" ${inquiry.status === 'pending' ? 'selected' : ''}>未対応</option>
            <option value="replied" ${inquiry.status === 'replied' ? 'selected' : ''}>返信済み</option>
            <option value="closed" ${inquiry.status === 'closed' ? 'selected' : ''}>完了</option>
          </select>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
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

// ========== スタッフコメント関連 ==========

// コメント追加モーダル
function showAddCommentModal(userId) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">スタッフコメント追加</h3>
      <form id="comment-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">スタッフ名 *</label>
          <input type="text" name="staff_name" required value="${currentUser.name}"
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">コメント *</label>
          <textarea name="comment" rows="4" required 
            class="w-full px-3 py-2 text-sm border rounded-lg"></textarea>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            追加
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      user_id: userId,
      staff_name: formData.get('staff_name'),
      comment: formData.get('comment'),
    };
    
    try {
      const response = await apiCall('/api/comments/admin', { method: 'POST', data });
      if (response.success) {
        showToast('コメントを追加しました', 'success');
        modal.remove();
        await viewUserDetails(userId);
      }
    } catch (error) {
      showToast('追加に失敗しました', 'error');
    }
  });
}

// コメント編集モーダル
function showEditCommentModal(commentId, currentComment) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">コメント編集</h3>
      <form id="edit-comment-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">コメント *</label>
          <textarea name="comment" rows="4" required 
            class="w-full px-3 py-2 text-sm border rounded-lg">${currentComment}</textarea>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            更新
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('edit-comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = { comment: formData.get('comment') };
    
    try {
      const response = await apiCall(`/api/comments/admin/${commentId}`, { method: 'PUT', data });
      if (response.success) {
        showToast('コメントを更新しました', 'success');
        modal.remove();
        await viewUserDetails(selectedUser.id);
      }
    } catch (error) {
      showToast('更新に失敗しました', 'error');
    }
  });
}

// コメント削除
async function deleteComment(commentId) {
  showModal(
    '確認',
    'このコメントを削除してもよろしいですか？',
    async () => {
      try {
        const response = await apiCall(`/api/comments/admin/${commentId}`, { method: 'DELETE' });
        if (response.success) {
          showToast('コメントを削除しました', 'success');
          await viewUserDetails(selectedUser.id);
        }
      } catch (error) {
        showToast('削除に失敗しました', 'error');
      }
    }
  );
}

// ========== 管理設定タブ関連 ==========

// 設定データロード
async function loadSettingsData() {
  try {
    const [announcementsRes, settingsRes] = await Promise.all([
      apiCall('/api/announcements/admin/all'),
      apiCall('/api/settings/admin')
    ]);
    
    if (announcementsRes.success) announcements = announcementsRes.data;
    if (settingsRes.success) settings = settingsRes.data;
  } catch (error) {
    showToast('設定データの読み込みに失敗しました', 'error');
  }
}

// 管理設定タブ
function renderSettingsTab() {
  return `
    <section class="bg-gray-50 py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <!-- お知らせ管理 -->
          <div class="bg-white rounded-lg shadow-md p-4 mb-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">
                <i class="fas fa-bullhorn text-primary mr-2"></i>お知らせ管理
              </h2>
              <button onclick="showAddAnnouncementModal()" 
                class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90">
                <i class="fas fa-plus mr-1"></i>お知らせ追加
              </button>
            </div>
            
            <div class="space-y-3">
              ${announcements.map(announcement => `
                <div class="border rounded-lg p-3">
                  <div class="flex gap-3">
                    ${announcement.image_url ? `
                      <img src="${announcement.image_url}" alt="${announcement.title}" 
                        class="w-24 h-24 object-cover rounded">
                    ` : ''}
                    <div class="flex-1">
                      <div class="flex justify-between items-start mb-2">
                        <div>
                          <h3 class="text-base font-bold">${announcement.title}</h3>
                          <p class="text-xs text-gray-500">${formatDateTime(announcement.published_at)}</p>
                        </div>
                        <div class="flex gap-2">
                          <span class="badge ${announcement.is_published ? 'badge-success' : 'badge-error'} text-xs">
                            ${announcement.is_published ? '公開中' : '非公開'}
                          </span>
                          <button onclick="showEditAnnouncementModal(${announcement.id})" 
                            class="text-blue-500 hover:text-blue-700 text-xs">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="deleteAnnouncement(${announcement.id})" 
                            class="text-red-500 hover:text-red-700 text-xs">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      <p class="text-sm text-gray-700 line-clamp-2">${announcement.content}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- API設定 -->
          <div class="bg-white rounded-lg shadow-md p-4">
            <h2 class="text-xl font-bold mb-4">
              <i class="fas fa-cog text-primary mr-2"></i>システム設定
            </h2>
            
            <div class="space-y-3">
              ${settings.map(setting => `
                <div class="border rounded-lg p-3">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                      <h3 class="text-sm font-bold">${setting.setting_key}</h3>
                      <p class="text-xs text-gray-500">${setting.description || ''}</p>
                    </div>
                    <button onclick="showEditSettingModal('${setting.setting_key}', '${setting.setting_value.replace(/'/g, "\\'")}', '${setting.description || ''}')" 
                      class="text-blue-500 hover:text-blue-700 text-xs">
                      <i class="fas fa-edit"></i>
                    </button>
                  </div>
                  <div class="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">
                    ${setting.setting_value || '(未設定)'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// お知らせ追加モーダル
function showAddAnnouncementModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">お知らせ追加</h3>
      <form id="announcement-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">タイトル *</label>
          <input type="text" name="title" required 
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">内容 *</label>
          <textarea name="content" rows="4" required 
            class="w-full px-3 py-2 text-sm border rounded-lg"></textarea>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">画像URL</label>
          <input type="url" name="image_url" 
            class="w-full px-3 py-2 text-sm border rounded-lg"
            placeholder="https://...">
        </div>
        
        <div class="flex items-center gap-2">
          <input type="checkbox" id="is_published" name="is_published" checked 
            class="w-4 h-4">
          <label for="is_published" class="text-sm">すぐに公開する</label>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            追加
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('announcement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      title: formData.get('title'),
      content: formData.get('content'),
      image_url: formData.get('image_url') || null,
      is_published: formData.get('is_published') ? true : false,
    };
    
    try {
      const response = await apiCall('/api/announcements/admin', { method: 'POST', data });
      if (response.success) {
        showToast('お知らせを追加しました', 'success');
        modal.remove();
        await loadSettingsData();
        showTab('settings');
      }
    } catch (error) {
      showToast('追加に失敗しました', 'error');
    }
  });
}

// お知らせ編集モーダル
function showEditAnnouncementModal(id) {
  const announcement = announcements.find(a => a.id === id);
  if (!announcement) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">お知らせ編集</h3>
      <form id="edit-announcement-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">タイトル *</label>
          <input type="text" name="title" required value="${announcement.title}"
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">内容 *</label>
          <textarea name="content" rows="4" required 
            class="w-full px-3 py-2 text-sm border rounded-lg">${announcement.content}</textarea>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">画像URL</label>
          <input type="url" name="image_url" value="${announcement.image_url || ''}"
            class="w-full px-3 py-2 text-sm border rounded-lg"
            placeholder="https://...">
        </div>
        
        <div class="flex items-center gap-2">
          <input type="checkbox" id="is_published_edit" name="is_published" 
            ${announcement.is_published ? 'checked' : ''}
            class="w-4 h-4">
          <label for="is_published_edit" class="text-sm">公開する</label>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            更新
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('edit-announcement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      title: formData.get('title'),
      content: formData.get('content'),
      image_url: formData.get('image_url') || null,
      is_published: formData.get('is_published') ? true : false,
    };
    
    try {
      const response = await apiCall(`/api/announcements/admin/${id}`, { method: 'PUT', data });
      if (response.success) {
        showToast('お知らせを更新しました', 'success');
        modal.remove();
        await loadSettingsData();
        showTab('settings');
      }
    } catch (error) {
      showToast('更新に失敗しました', 'error');
    }
  });
}

// お知らせ削除
async function deleteAnnouncement(id) {
  showModal(
    '確認',
    'このお知らせを削除してもよろしいですか？',
    async () => {
      try {
        const response = await apiCall(`/api/announcements/admin/${id}`, { method: 'DELETE' });
        if (response.success) {
          showToast('お知らせを削除しました', 'success');
          await loadSettingsData();
          showTab('settings');
        }
      } catch (error) {
        showToast('削除に失敗しました', 'error');
      }
    }
  );
}

// 設定編集モーダル
function showEditSettingModal(key, value, description) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">設定編集: ${key}</h3>
      <form id="edit-setting-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">設定値 *</label>
          <input type="text" name="value" required value="${value}"
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">説明</label>
          <input type="text" name="description" value="${description}"
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            更新
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('edit-setting-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      value: formData.get('value'),
      description: formData.get('description'),
    };
    
    try {
      const response = await apiCall(`/api/settings/admin/${key}`, { method: 'PUT', data });
      if (response.success) {
        showToast('設定を更新しました', 'success');
        modal.remove();
        await loadSettingsData();
        showTab('settings');
      }
    } catch (error) {
      showToast('更新に失敗しました', 'error');
    }
  });
}

// オピニオン回答モーダル
function showAnswerOpinionModal(opinionId) {
  const opinion = opinions.find(op => op.id === opinionId);
  if (!opinion) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">質問に回答する</h3>
      
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <div class="flex items-center gap-3 mb-3">
          <img src="${opinion.avatar_url || 'https://via.placeholder.com/40'}" 
            class="w-10 h-10 rounded-full">
          <div>
            <div class="font-bold text-sm">${opinion.user_name}</div>
            <div class="text-xs text-gray-500">${opinion.user_email}</div>
          </div>
        </div>
        <div class="bg-white p-3 rounded">
          <p class="text-sm font-medium text-gray-700 mb-1">質問内容:</p>
          <p class="text-sm text-gray-800 whitespace-pre-wrap">${opinion.question}</p>
        </div>
      </div>
      
      <form id="answer-opinion-form" class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-2">回答内容</label>
          <textarea name="answer" rows="6" required
            placeholder="丁寧で分かりやすい回答を心がけましょう..."
            class="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">回答者名</label>
          <input type="text" name="answered_by" value="${currentUser.name}" required
            class="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-4 py-2 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            <i class="fas fa-paper-plane mr-1"></i>
            回答を送信
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('answer-opinion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      answer: formData.get('answer'),
      answered_by: formData.get('answered_by'),
    };
    
    try {
      const response = await apiCall(`/api/opinions/${opinionId}/answer`, { method: 'PUT', data });
      if (response.success) {
        showToast('回答を送信しました', 'success');
        modal.remove();
        await loadAdminData();
        renderPage();
        showTab('opinions');
      }
    } catch (error) {
      showToast('送信に失敗しました', 'error');
    }
  });
}

// オピニオン削除
async function deleteOpinion(opinionId) {
  showModal(
    '確認',
    'この質問と回答を削除してもよろしいですか？',
    async () => {
      try {
        const response = await apiCall(`/api/opinions/${opinionId}`, { method: 'DELETE' });
        if (response.success) {
          showToast('削除しました', 'success');
          await loadAdminData();
          renderPage();
          showTab('opinions');
        }
      } catch (error) {
        showToast('削除に失敗しました', 'error');
      }
    }
  );
}
