// マイページ - ファディー彦根

// 状態管理
let currentUser = null;
let healthLogs = [];
let advices = [];
let opinions = [];
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
    const [logsRes, advicesRes, opinionsRes] = await Promise.all([
      apiCall('/api/health-logs'),
      apiCall('/api/advices'),
      apiCall(`/api/opinions/user/${currentUser.id}`),
    ]);
    
    if (logsRes.success) healthLogs = logsRes.data;
    if (advicesRes.success) advices = advicesRes.data;
    if (opinionsRes.success) opinions = opinionsRes.data;
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
    ${renderOpinionBox()}
    ${renderHealthLogsTable()}
    ${renderChartsSection()}
  `;
  
  // グラフ描画
  setTimeout(() => {
    renderCharts();
  }, 100);
}

// 共通ヘッダー
function renderHeader() {
  return `
    <header class="bg-white shadow-md sticky top-0 z-50">
      <div class="container mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <a href="/" class="flex items-center gap-2">
            <i class="fas fa-dumbbell text-lg" style="color: var(--color-primary)"></i>
            <h1 class="text-lg font-bold" style="color: var(--color-primary)">ファディー彦根</h1>
          </a>
          
          <nav class="flex items-center gap-2">
            <a href="/" class="px-4 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition flex items-center gap-2">
              <i class="fas fa-home"></i>
              <span>ホーム</span>
            </a>
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

// ユーザープロフィール（コンパクト版）
function renderUserProfile() {
  const latestLog = healthLogs[0];
  const previousLog = healthLogs[1];
  
  const weightChange = latestLog && previousLog ? (latestLog.weight - previousLog.weight).toFixed(1) : null;
  const unreadAdvices = advices.filter(a => !a.is_read).length;
  
  return `
    <section class="gradient-bg text-white py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-weight text-lg"></i>
                <span class="text-xs opacity-75">体重</span>
              </div>
              <div class="text-2xl font-bold">${latestLog?.weight || '--'} kg</div>
              ${weightChange ? `
                <div class="text-xs ${parseFloat(weightChange) < 0 ? 'text-green-300' : 'text-red-300'}">
                  ${parseFloat(weightChange) < 0 ? '↓' : '↑'} ${Math.abs(parseFloat(weightChange))} kg
                </div>
              ` : ''}
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-percentage text-lg"></i>
                <span class="text-xs opacity-75">体脂肪率</span>
              </div>
              <div class="text-2xl font-bold">${latestLog?.body_fat_percentage || '--'} %</div>
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-clipboard-list text-lg"></i>
                <span class="text-xs opacity-75">記録日数</span>
              </div>
              <div class="text-2xl font-bold">${healthLogs.length} 日</div>
            </div>
            
            <div class="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
              <div class="flex items-center justify-between mb-1">
                <i class="fas fa-bell text-lg"></i>
                <span class="text-xs opacity-75">未読</span>
              </div>
              <div class="text-2xl font-bold">${unreadAdvices}</div>
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
    <section class="bg-white py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-comment-medical mr-2" style="color: var(--color-primary)"></i>
            スタッフからのアドバイス
          </h3>
          
          <div class="space-y-3">
            ${advices.map(advice => `
              <div class="card-hover bg-gray-50 p-4 rounded-lg border-l-4 ${advice.is_read ? 'opacity-60' : ''}" 
                style="border-color: var(--color-${getAdviceColor(advice.advice_type)})">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="badge badge-${getAdviceColor(advice.advice_type)} text-xs">${getAdviceTypeLabel(advice.advice_type)}</span>
                      ${!advice.is_read ? '<span class="badge badge-error text-xs">未読</span>' : ''}
                    </div>
                    <h4 class="text-base font-bold">${advice.title}</h4>
                  </div>
                  <span class="text-xs text-gray-500">${formatRelativeTime(advice.created_at)}</span>
                </div>
                <p class="text-sm text-gray-700 mb-2">${advice.content}</p>
                <div class="flex justify-between items-center">
                  <div class="text-xs text-gray-600">
                    <i class="fas fa-user-nurse mr-1"></i>
                    ${advice.staff_name}
                  </div>
                  ${!advice.is_read ? `
                    <button onclick="markAdviceAsRead(${advice.id})" class="text-primary hover:underline text-xs">
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

// オピニオンボックス（質疑応答）
function renderOpinionBox() {
  const pendingOpinions = opinions.filter(op => op.status === 'pending');
  const answeredOpinions = opinions.filter(op => op.status === 'answered');
  
  return `
    <section class="bg-gradient-to-br from-purple-50 to-white py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-comments mr-2" style="color: var(--color-primary)"></i>
            オピニオンボックス（質問・相談）
          </h3>
          
          <!-- 質問フォーム -->
          <div class="bg-white p-5 rounded-lg shadow-md mb-6">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-question text-primary"></i>
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  スタッフに質問・相談する
                </label>
                <textarea 
                  id="opinion-question" 
                  rows="3" 
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="トレーニングや食事、健康に関する質問・相談をお気軽にどうぞ..."
                ></textarea>
                <div class="flex justify-end mt-2">
                  <button 
                    onclick="submitOpinion()" 
                    class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
                  >
                    <i class="fas fa-paper-plane mr-1"></i>
                    送信
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 質問履歴 -->
          ${opinions.length > 0 ? `
            <div class="space-y-4">
              <!-- 未回答の質問 -->
              ${pendingOpinions.length > 0 ? `
                <div>
                  <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <i class="fas fa-hourglass-half text-orange-500"></i>
                    回答待ち（${pendingOpinions.length}件）
                  </h4>
                  <div class="space-y-3">
                    ${pendingOpinions.map(opinion => `
                      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
                        <div class="flex justify-between items-start mb-2">
                          <div class="flex items-center gap-2">
                            <i class="fas fa-clock text-orange-500 text-xs"></i>
                            <span class="text-xs text-gray-500">${formatDateTime(opinion.created_at)}</span>
                          </div>
                          <span class="badge badge-warning text-xs">回答待ち</span>
                        </div>
                        <div class="bg-gray-50 p-3 rounded mb-2">
                          <p class="text-sm text-gray-800"><strong>質問:</strong> ${opinion.question}</p>
                        </div>
                        <p class="text-xs text-gray-500 italic">スタッフが確認中です。しばらくお待ちください。</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              <!-- 回答済みの質問 -->
              ${answeredOpinions.length > 0 ? `
                <div>
                  <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-500"></i>
                    回答済み（${answeredOpinions.length}件）
                  </h4>
                  <div class="space-y-3">
                    ${answeredOpinions.map(opinion => `
                      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                        <div class="flex justify-between items-start mb-3">
                          <div class="flex items-center gap-2">
                            <i class="fas fa-calendar text-green-500 text-xs"></i>
                            <span class="text-xs text-gray-500">質問: ${formatDateTime(opinion.created_at)}</span>
                          </div>
                          <span class="badge badge-success text-xs">回答済み</span>
                        </div>
                        
                        <div class="bg-gray-50 p-3 rounded mb-3">
                          <p class="text-sm text-gray-800"><strong>質問:</strong> ${opinion.question}</p>
                        </div>
                        
                        <div class="bg-green-50 p-3 rounded border-l-2 border-green-500">
                          <div class="flex items-center gap-2 mb-2">
                            <i class="fas fa-user-nurse text-green-600 text-xs"></i>
                            <span class="text-xs font-medium text-green-700">${opinion.answered_by} からの回答:</span>
                            <span class="text-xs text-gray-500">${formatDateTime(opinion.answered_at)}</span>
                          </div>
                          <p class="text-sm text-gray-800 whitespace-pre-wrap">${opinion.answer}</p>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="bg-white p-6 rounded-lg shadow-sm text-center">
              <i class="fas fa-comments text-4xl text-gray-300 mb-2"></i>
              <p class="text-sm text-gray-500">まだ質問がありません。お気軽にご相談ください！</p>
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

// 健康ログテーブル (横スクロール)
function renderHealthLogsTable() {
  if (healthLogs.length === 0) {
    return `
      <section class="bg-gray-50 py-8">
        <div class="container mx-auto px-4">
          <div class="max-w-7xl mx-auto text-center">
            <i class="fas fa-clipboard-list text-5xl text-gray-300 mb-3"></i>
            <p class="text-gray-500 text-base">まだ健康ログがありません</p>
            <a href="/" class="inline-block mt-3 px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
              ログを記録する
            </a>
          </div>
        </div>
      </section>
    `;
  }
  
  return `
    <section class="bg-gray-50 py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800">
              <i class="fas fa-table mr-2" style="color: var(--color-primary)"></i>
              健康ログ履歴
            </h3>
            <button onclick="showAddLogModal()" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
              <i class="fas fa-plus mr-1"></i>
              ログを追加
            </button>
          </div>
          
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="scroll-container overflow-x-auto">
              <table class="table min-w-full text-sm">
                <thead>
                  <tr>
                    <th class="sticky left-0 bg-primary z-10 text-xs">日付</th>
                    <th class="text-xs">体重</th>
                    <th class="text-xs">体脂肪率</th>
                    <th class="text-xs">体温</th>
                    <th class="text-xs">睡眠</th>
                    <th class="text-xs">カロリー</th>
                    <th class="text-xs">運動</th>
                    <th class="text-xs">運動記録</th>
                    <th class="sticky right-0 bg-primary z-10 text-xs">操作</th>
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
                          <button onclick="showEditLogModal(${log.id})" class="text-blue-500 hover:text-blue-700 text-xs">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="deleteLog(${log.id})" class="text-red-500 hover:text-red-700 text-xs">
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
    <section class="bg-white py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-chart-line mr-2" style="color: var(--color-primary)"></i>
            推移グラフ
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-bold mb-3">体重推移</h4>
              <div style="height: 220px;">
                <canvas id="weight-chart"></canvas>
              </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-bold mb-3">体脂肪率推移</h4>
              <div style="height: 220px;">
                <canvas id="bodyfat-chart"></canvas>
              </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-bold mb-3">睡眠時間推移</h4>
              <div style="height: 220px;">
                <canvas id="sleep-chart"></canvas>
              </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-bold mb-3">カロリー摂取量推移</h4>
              <div style="height: 220px;">
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
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">健康ログを追加</h3>
      <form id="add-log-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">日付 *</label>
          <input type="date" name="log_date" required value="${dayjs().format('YYYY-MM-DD')}"
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium mb-1">体重 (kg)</label>
            <input type="number" step="0.1" name="weight" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体脂肪率 (%)</label>
            <input type="number" step="0.1" name="body_fat_percentage" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体温 (℃)</label>
            <input type="number" step="0.1" name="body_temperature" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">睡眠時間 (時間)</label>
            <input type="number" step="0.5" name="sleep_hours" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">運動時間 (分)</label>
            <input type="number" name="exercise_minutes" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">運動記録</label>
          <textarea name="condition_note" rows="2" 
            placeholder="例：ベンチプレス60kg × 10回 × 3セット"
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
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">健康ログを編集</h3>
      <form id="edit-log-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium mb-1">体重 (kg)</label>
            <input type="number" step="0.1" name="weight" value="${log.weight || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体脂肪率 (%)</label>
            <input type="number" step="0.1" name="body_fat_percentage" value="${log.body_fat_percentage || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体温 (℃)</label>
            <input type="number" step="0.1" name="body_temperature" value="${log.body_temperature || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">睡眠時間 (時間)</label>
            <input type="number" step="0.5" name="sleep_hours" value="${log.sleep_hours || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">運動時間 (分)</label>
            <input type="number" name="exercise_minutes" value="${log.exercise_minutes || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">運動記録</label>
          <textarea name="condition_note" rows="2" 
            placeholder="例：ベンチプレス60kg × 10回 × 3セット"
            class="w-full px-3 py-2 text-sm border rounded-lg">${log.condition_note || ''}</textarea>
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

// オピニオン送信
async function submitOpinion() {
  const questionElement = document.getElementById('opinion-question');
  const question = questionElement.value.trim();
  
  if (!question) {
    showToast('質問を入力してください', 'warning');
    return;
  }
  
  try {
    const response = await apiCall('/api/opinions', {
      method: 'POST',
      data: { question }
    });
    
    if (response.success) {
      showToast('質問を送信しました', 'success');
      questionElement.value = '';
      await loadAllData();
      renderPage();
    }
  } catch (error) {
    showToast('送信に失敗しました', 'error');
  }
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
