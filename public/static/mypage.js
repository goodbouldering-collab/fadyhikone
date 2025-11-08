// マイページ - ファディー彦根

// 状態管理
let currentUser = null;
let healthLogs = [];
let advices = [];
let charts = {};

// ページ初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndLoad();
});

// 認証チェックとデータロード
async function checkAuthAndLoad() {
  const token = getToken();
  if (!token) {
    showToast('ログインが必要です', 'warning');
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    return;
  }
  
  try {
    const response = await apiCall('/api/auth/verify');
    if (response.success) {
      currentUser = response.data;
      setUserData(currentUser);
      await loadAllData();
      renderPage();
    }
  } catch (error) {
    showToast('認証エラーが発生しました', 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  }
}

// すべてのデータをロード
async function loadAllData() {
  try {
    const [logsRes, advicesRes] = await Promise.all([
      apiCall('/api/health-logs'),
      apiCall('/api/advices'),
    ]);
    
    if (logsRes.success) healthLogs = logsRes.data;
    if (advicesRes.success) advices = advicesRes.data;
  } catch (error) {
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ページレンダリング
function renderPage() {
  const root = document.getElementById('root');
  root.innerHTML = `
    ${renderHeader()}
    ${renderUserProfile()}
    ${renderAdvicesList()}
    ${renderHealthLogsTable()}
    ${renderChartsSection()}
  `;
  
  // グラフ描画
  setTimeout(() => {
    renderCharts();
  }, 100);
}

// ヘッダー
function renderHeader() {
  return `
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <i class="fas fa-dumbbell text-3xl" style="color: var(--color-primary)"></i>
            <h1 class="text-2xl font-bold" style="color: var(--color-primary)">ファディー彦根</h1>
          </div>
          
          <nav class="flex items-center gap-6">
            <a href="/" class="text-gray-700 hover:text-primary transition">トップ</a>
            ${currentUser.role === 'admin' ? '<a href="/admin" class="px-4 py-2 bg-accent text-white hover:bg-opacity-90 rounded-lg transition">管理画面</a>' : ''}
            <button onclick="logout()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
              ログアウト
            </button>
          </nav>
        </div>
      </div>
    </header>
  `;
}

// ユーザープロフィール
function renderUserProfile() {
  const latestLog = healthLogs[0];
  const previousLog = healthLogs[1];
  
  const weightChange = latestLog && previousLog ? (latestLog.weight - previousLog.weight).toFixed(1) : null;
  const unreadAdvices = advices.filter(a => !a.is_read).length;
  
  return `
    <section class="gradient-bg text-white py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <div class="flex items-center gap-6 mb-8">
            <img src="${currentUser.avatar_url || 'https://via.placeholder.com/100'}" 
              class="w-20 h-20 rounded-full border-4 border-white shadow-lg">
            <div>
              <h2 class="text-3xl font-bold mb-1">${currentUser.name}</h2>
              <p class="text-lg opacity-90">${currentUser.email}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <i class="fas fa-weight text-2xl"></i>
                <span class="text-sm opacity-75">最新</span>
              </div>
              <div class="text-3xl font-bold mb-1">${latestLog?.weight || '--'} kg</div>
              ${weightChange ? `
                <div class="text-sm ${parseFloat(weightChange) < 0 ? 'text-green-300' : 'text-red-300'}">
                  ${parseFloat(weightChange) < 0 ? '↓' : '↑'} ${Math.abs(parseFloat(weightChange))} kg
                </div>
              ` : ''}
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <i class="fas fa-percentage text-2xl"></i>
                <span class="text-sm opacity-75">体脂肪率</span>
              </div>
              <div class="text-3xl font-bold">${latestLog?.body_fat_percentage || '--'} %</div>
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <i class="fas fa-clipboard-list text-2xl"></i>
                <span class="text-sm opacity-75">記録日数</span>
              </div>
              <div class="text-3xl font-bold">${healthLogs.length} 日</div>
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-6 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <i class="fas fa-bell text-2xl"></i>
                <span class="text-sm opacity-75">未読</span>
              </div>
              <div class="text-3xl font-bold">${unreadAdvices}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// アドバイス一覧
function renderAdvicesList() {
  if (advices.length === 0) {
    return '';
  }
  
  return `
    <section class="bg-white py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <h3 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-comment-medical mr-2" style="color: var(--color-primary)"></i>
            スタッフからのアドバイス
          </h3>
          
          <div class="space-y-4">
            ${advices.map(advice => `
              <div class="card-hover bg-gray-50 p-6 rounded-lg border-l-4 ${advice.is_read ? 'opacity-60' : ''}" 
                style="border-color: var(--color-${getAdviceColor(advice.advice_type)})">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="badge badge-${getAdviceColor(advice.advice_type)}">${getAdviceTypeLabel(advice.advice_type)}</span>
                      ${!advice.is_read ? '<span class="badge badge-error text-xs">未読</span>' : ''}
                    </div>
                    <h4 class="text-lg font-bold">${advice.title}</h4>
                  </div>
                  <span class="text-sm text-gray-500">${formatRelativeTime(advice.created_at)}</span>
                </div>
                <p class="text-gray-700 mb-3">${advice.content}</p>
                <div class="flex justify-between items-center">
                  <div class="text-sm text-gray-600">
                    <i class="fas fa-user-nurse mr-1"></i>
                    ${advice.staff_name}
                  </div>
                  ${!advice.is_read ? `
                    <button onclick="markAdviceAsRead(${advice.id})" class="text-primary hover:underline text-sm">
                      既読にする
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

// 健康ログテーブル (横スクロール)
function renderHealthLogsTable() {
  if (healthLogs.length === 0) {
    return `
      <section class="bg-gray-50 py-12">
        <div class="container mx-auto px-4">
          <div class="max-w-6xl mx-auto text-center">
            <i class="fas fa-clipboard-list text-6xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 text-lg">まだ健康ログがありません</p>
            <a href="/" class="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
              ログを記録する
            </a>
          </div>
        </div>
      </section>
    `;
  }
  
  return `
    <section class="bg-gray-50 py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-table mr-2" style="color: var(--color-primary)"></i>
              健康ログ履歴
            </h3>
            <button onclick="showAddLogModal()" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
              <i class="fas fa-plus mr-2"></i>
              ログを追加
            </button>
          </div>
          
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="scroll-container overflow-x-auto">
              <table class="table min-w-full">
                <thead>
                  <tr>
                    <th class="sticky left-0 bg-primary z-10">日付</th>
                    <th>体重</th>
                    <th>体脂肪率</th>
                    <th>体温</th>
                    <th>睡眠</th>
                    <th>カロリー</th>
                    <th>運動</th>
                    <th>メモ</th>
                    <th class="sticky right-0 bg-primary z-10">操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${healthLogs.map(log => `
                    <tr>
                      <td class="sticky left-0 bg-white z-10 font-medium">${formatDate(log.log_date)}</td>
                      <td>${log.weight ? log.weight + ' kg' : '--'}</td>
                      <td>${log.body_fat_percentage ? log.body_fat_percentage + ' %' : '--'}</td>
                      <td>${log.body_temperature ? log.body_temperature + ' ℃' : '--'}</td>
                      <td>${log.sleep_hours ? log.sleep_hours + ' 時間' : '--'}</td>
                      <td>${log.meal_calories ? log.meal_calories + ' kcal' : '--'}</td>
                      <td>${log.exercise_minutes ? log.exercise_minutes + ' 分' : '--'}</td>
                      <td class="max-w-xs truncate">${log.condition_note || '--'}</td>
                      <td class="sticky right-0 bg-white z-10">
                        <div class="flex gap-2">
                          <button onclick="showEditLogModal(${log.id})" class="text-blue-500 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="deleteLog(${log.id})" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// グラフセクション
function renderChartsSection() {
  return `
    <section class="bg-white py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <h3 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-chart-line mr-2" style="color: var(--color-primary)"></i>
            推移グラフ
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-gray-50 p-6 rounded-lg">
              <h4 class="font-bold mb-4">体重推移</h4>
              <div style="height: 250px;">
                <canvas id="weight-chart"></canvas>
              </div>
            </div>
            
            <div class="bg-gray-50 p-6 rounded-lg">
              <h4 class="font-bold mb-4">体脂肪率推移</h4>
              <div style="height: 250px;">
                <canvas id="bodyfat-chart"></canvas>
              </div>
            </div>
            
            <div class="bg-gray-50 p-6 rounded-lg">
              <h4 class="font-bold mb-4">睡眠時間推移</h4>
              <div style="height: 250px;">
                <canvas id="sleep-chart"></canvas>
              </div>
            </div>
            
            <div class="bg-gray-50 p-6 rounded-lg">
              <h4 class="font-bold mb-4">カロリー摂取量推移</h4>
              <div style="height: 250px;">
                <canvas id="calories-chart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// グラフ描画
function renderCharts() {
  const sortedLogs = [...healthLogs].reverse().slice(-30); // 最新30日分
  const labels = sortedLogs.map(log => dayjs(log.log_date).format('M/D'));
  
  // 体重グラフ
  if (document.getElementById('weight-chart')) {
    const weightData = sortedLogs.map(log => log.weight || null);
    charts.weight = createLineChart('weight-chart', labels, weightData, '体重 (kg)');
  }
  
  // 体脂肪率グラフ
  if (document.getElementById('bodyfat-chart')) {
    const bodyfatData = sortedLogs.map(log => log.body_fat_percentage || null);
    charts.bodyfat = createLineChart('bodyfat-chart', labels, bodyfatData, '体脂肪率 (%)');
  }
  
  // 睡眠時間グラフ
  if (document.getElementById('sleep-chart')) {
    const sleepData = sortedLogs.map(log => log.sleep_hours || null);
    charts.sleep = createLineChart('sleep-chart', labels, sleepData, '睡眠時間 (時間)');
  }
  
  // カロリーグラフ
  if (document.getElementById('calories-chart')) {
    const caloriesData = sortedLogs.map(log => log.meal_calories || null);
    charts.calories = createLineChart('calories-chart', labels, caloriesData, 'カロリー (kcal)');
  }
}

// アドバイスを既読にする
async function markAdviceAsRead(adviceId) {
  try {
    const response = await apiCall(`/api/advices/${adviceId}/read`, { method: 'PUT' });
    if (response.success) {
      showToast('既読にしました', 'success');
      await loadAllData();
      renderPage();
    }
  } catch (error) {
    showToast('エラーが発生しました', 'error');
  }
}

// ログ追加モーダル
function showAddLogModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-6 max-w-2xl">
      <h3 class="text-xl font-bold mb-4">健康ログを追加</h3>
      <form id="add-log-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">日付 *</label>
          <input type="date" name="log_date" required value="${dayjs().format('YYYY-MM-DD')}"
            class="w-full px-4 py-2 border rounded-lg">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">体重 (kg)</label>
            <input type="number" step="0.1" name="weight" 
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">体脂肪率 (%)</label>
            <input type="number" step="0.1" name="body_fat_percentage" 
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">体温 (℃)</label>
            <input type="number" step="0.1" name="body_temperature" 
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">睡眠時間 (時間)</label>
            <input type="number" step="0.5" name="sleep_hours" 
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">運動時間 (分)</label>
            <input type="number" name="exercise_minutes" 
              class="w-full px-4 py-2 border rounded-lg">
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">メモ</label>
          <textarea name="condition_note" rows="3" 
            class="w-full px-4 py-2 border rounded-lg"></textarea>
        </div>
        
        <div class="flex gap-3 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg">
            追加
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('add-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      log_date: formData.get('log_date'),
      weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
      body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
      body_temperature: formData.get('body_temperature') ? parseFloat(formData.get('body_temperature')) : null,
      sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
      exercise_minutes: formData.get('exercise_minutes') ? parseInt(formData.get('exercise_minutes')) : null,
      condition_note: formData.get('condition_note') || null,
    };
    
    try {
      const response = await apiCall('/api/health-logs', { method: 'POST', data });
      if (response.success) {
        showToast('ログを追加しました', 'success');
        modal.remove();
        await loadAllData();
        renderPage();
      }
    } catch (error) {
      showToast('追加に失敗しました', 'error');
    }
  });
}

// ログ編集モーダル
function showEditLogModal(logId) {
  const log = healthLogs.find(l => l.id === logId);
  if (!log) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-6 max-w-2xl">
      <h3 class="text-xl font-bold mb-4">健康ログを編集</h3>
      <form id="edit-log-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">体重 (kg)</label>
            <input type="number" step="0.1" name="weight" value="${log.weight || ''}"
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">体脂肪率 (%)</label>
            <input type="number" step="0.1" name="body_fat_percentage" value="${log.body_fat_percentage || ''}"
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">体温 (℃)</label>
            <input type="number" step="0.1" name="body_temperature" value="${log.body_temperature || ''}"
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">睡眠時間 (時間)</label>
            <input type="number" step="0.5" name="sleep_hours" value="${log.sleep_hours || ''}"
              class="w-full px-4 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">運動時間 (分)</label>
            <input type="number" name="exercise_minutes" value="${log.exercise_minutes || ''}"
              class="w-full px-4 py-2 border rounded-lg">
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">メモ</label>
          <textarea name="condition_note" rows="3" 
            class="w-full px-4 py-2 border rounded-lg">${log.condition_note || ''}</textarea>
        </div>
        
        <div class="flex gap-3 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg">
            更新
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('edit-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
      body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
      body_temperature: formData.get('body_temperature') ? parseFloat(formData.get('body_temperature')) : null,
      sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
      exercise_minutes: formData.get('exercise_minutes') ? parseInt(formData.get('exercise_minutes')) : null,
      condition_note: formData.get('condition_note') || null,
    };
    
    try {
      const response = await apiCall(`/api/health-logs/${logId}`, { method: 'PUT', data });
      if (response.success) {
        showToast('ログを更新しました', 'success');
        modal.remove();
        await loadAllData();
        renderPage();
      }
    } catch (error) {
      showToast('更新に失敗しました', 'error');
    }
  });
}

// ログ削除
async function deleteLog(logId) {
  showModal(
    '確認',
    'このログを削除してもよろしいですか？',
    async () => {
      try {
        const response = await apiCall(`/api/health-logs/${logId}`, { method: 'DELETE' });
        if (response.success) {
          showToast('ログを削除しました', 'success');
          await loadAllData();
          renderPage();
        }
      } catch (error) {
        showToast('削除に失敗しました', 'error');
      }
    }
  );
}

// ヘルパー関数
function getAdviceTypeLabel(type) {
  const labels = { diet: '食事', exercise: '運動', general: '全般' };
  return labels[type] || type;
}

function getAdviceColor(type) {
  const colors = { diet: 'success', exercise: 'warning', general: 'primary' };
  return colors[type] || 'primary';
}
