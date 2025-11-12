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
    ${renderStatsSection()}
    ${renderAdvicesList()}
    ${renderChartsSection()}
    ${renderHealthLogsTable()}
    ${renderOpinionBox()}
    ${renderSettingsSection()}
  `;
  
  // グラフ描画
  setTimeout(() => {
    renderCharts();
  }, 100);
  
  // デフォルトで基本情報タブを表示
  setTimeout(() => {
    showSettingsTab('profile');
  }, 150);
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

// 統計・分析セクション（新機能）
function renderStatsSection() {
  // 週間統計を計算
  const last7Days = healthLogs.slice(0, 7);
  const weeklyCalories = last7Days.reduce((sum, log) => sum + (log.meal_calories || 0), 0);
  const weeklyExercise = last7Days.reduce((sum, log) => sum + (log.exercise_minutes || 0), 0);
  const avgCalories = last7Days.length > 0 ? Math.round(weeklyCalories / last7Days.length) : 0;
  const avgExercise = last7Days.length > 0 ? Math.round(weeklyExercise / last7Days.length) : 0;
  
  // 月間統計を計算
  const last30Days = healthLogs.slice(0, 30);
  const monthlyLogs = last30Days.length;
  const consistencyRate = Math.round((monthlyLogs / 30) * 100);
  
  // 健康スコアを計算（簡易版）
  const latestLog = healthLogs[0];
  let healthScore = 0;
  if (latestLog) {
    if (latestLog.weight) healthScore += 20;
    if (latestLog.meal_calories) healthScore += 20;
    if (latestLog.exercise_minutes && latestLog.exercise_minutes >= 30) healthScore += 30;
    if (latestLog.sleep_hours && latestLog.sleep_hours >= 7) healthScore += 30;
  }
  
  return `
    <section class="bg-gradient-to-b from-white to-gray-50 py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          
          <!-- 週間・月間統計 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <!-- 週間カロリー平均 -->
            <div class="bg-gradient-to-br from-pink-50 to-rose-50 p-3 rounded-xl shadow-sm">
              <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                <i class="fas fa-fire text-primary text-sm"></i>
                週間平均カロリー
              </h4>
              <div class="flex items-end gap-2">
                <div class="text-3xl font-bold text-gray-800">${avgCalories}</div>
                <div class="text-sm text-gray-600 mb-1">kcal/日</div>
              </div>
              <div class="mt-2 text-xs text-gray-600">
                今週合計: ${weeklyCalories}kcal
              </div>
            </div>
            
            <!-- 週間運動平均 -->
            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl shadow-sm">
              <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                <i class="fas fa-running text-blue-500 text-sm"></i>
                週間平均運動時間
              </h4>
              <div class="flex items-end gap-2">
                <div class="text-3xl font-bold text-gray-800">${avgExercise}</div>
                <div class="text-sm text-gray-600 mb-1">分/日</div>
              </div>
              <div class="mt-2 text-xs text-gray-600">
                今週合計: ${weeklyExercise}分
              </div>
            </div>
            
            <!-- 記録継続率 -->
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl shadow-sm">
              <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                <i class="fas fa-calendar-check text-green-500 text-sm"></i>
                記録継続率（30日間）
              </h4>
              <div class="flex items-end gap-2">
                <div class="text-3xl font-bold text-gray-800">${consistencyRate}</div>
                <div class="text-sm text-gray-600 mb-1">%</div>
              </div>
              <div class="mt-2">
                <div class="w-full bg-white rounded-full h-2">
                  <div class="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full" style="width: ${consistencyRate}%"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 健康スコアと目標達成 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <!-- 健康スコア -->
            <div class="bg-white p-3 rounded-xl shadow-sm">
              <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
                <i class="fas fa-star text-yellow-500 text-sm"></i>
                今日の健康スコア
              </h4>
              <div class="flex items-center gap-4">
                <div class="relative w-24 h-24">
                  <svg class="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" stroke-width="8"></circle>
                    <circle cx="48" cy="48" r="40" fill="none" stroke="url(#gradient)" stroke-width="8" 
                      stroke-dasharray="${2 * Math.PI * 40}" 
                      stroke-dashoffset="${2 * Math.PI * 40 * (1 - healthScore / 100)}"
                      stroke-linecap="round"></circle>
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:var(--color-primary);stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="text-2xl font-bold text-gray-800">${healthScore}</div>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="space-y-1.5">
                    <div class="flex items-center gap-2">
                      <i class="fas ${latestLog?.weight ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                      <span class="text-xs text-gray-600">体重記録 (20点)</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="fas ${latestLog?.meal_calories ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                      <span class="text-xs text-gray-600">食事記録 (20点)</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="fas ${(latestLog?.exercise_minutes && latestLog.exercise_minutes >= 30) ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                      <span class="text-xs text-gray-600">運動30分以上 (30点)</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="fas ${(latestLog?.sleep_hours && latestLog.sleep_hours >= 7) ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                      <span class="text-xs text-gray-600">睡眠7時間以上 (30点)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- おすすめアクション -->
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl shadow-sm">
              <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
                <i class="fas fa-lightbulb text-yellow-500 text-sm"></i>
                おすすめアクション
              </h4>
              <div class="space-y-2">
                ${!latestLog || !latestLog.weight ? `
                  <div class="bg-white p-2 rounded-lg flex items-start gap-2">
                    <i class="fas fa-weight text-primary text-sm mt-0.5"></i>
                    <div class="flex-1">
                      <div class="text-xs font-medium text-gray-800">体重を記録しましょう</div>
                      <a href="/#health-log-section" class="text-xs text-primary hover:underline">今すぐ記録 →</a>
                    </div>
                  </div>
                ` : ''}
                ${!latestLog || !latestLog.meal_calories ? `
                  <div class="bg-white p-2 rounded-lg flex items-start gap-2">
                    <i class="fas fa-utensils text-orange-500 text-sm mt-0.5"></i>
                    <div class="flex-1">
                      <div class="text-xs font-medium text-gray-800">今日の食事を記録しましょう</div>
                      <a href="/#health-log-section" class="text-xs text-primary hover:underline">今すぐ記録 →</a>
                    </div>
                  </div>
                ` : ''}
                ${!latestLog || !latestLog.exercise_minutes || latestLog.exercise_minutes < 30 ? `
                  <div class="bg-white p-2 rounded-lg flex items-start gap-2">
                    <i class="fas fa-running text-blue-500 text-sm mt-0.5"></i>
                    <div class="flex-1">
                      <div class="text-xs font-medium text-gray-800">30分の運動を目指しましょう</div>
                      <div class="text-xs text-gray-600">現在: ${latestLog?.exercise_minutes || 0}分</div>
                    </div>
                  </div>
                ` : ''}
                ${healthScore >= 80 ? `
                  <div class="bg-gradient-to-r from-green-100 to-emerald-100 p-2 rounded-lg flex items-start gap-2">
                    <i class="fas fa-trophy text-yellow-500 text-sm mt-0.5"></i>
                    <div class="flex-1">
                      <div class="text-xs font-bold text-green-800">素晴らしい！</div>
                      <div class="text-xs text-green-700">この調子で続けましょう！</div>
                    </div>
                  </div>
                ` : ''}
              </div>
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

// 質問・相談セクション
function renderOpinionBox() {
  const pendingOpinions = opinions.filter(op => op.status === 'pending');
  const answeredOpinions = opinions.filter(op => op.status === 'answered');
  
  return `
    <section id="qa-section" class="bg-gradient-to-br from-purple-50 to-pink-50 py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">
            <i class="fas fa-comments mr-2" style="color: var(--color-primary)"></i>
            質問・相談
          </h3>
          
          <!-- 質問フォーム（アイコン削除、幅広く） -->
          <div class="bg-white p-3 rounded-xl shadow-sm mb-3">
            <textarea 
              id="opinion-question" 
              rows="4" 
              class="w-full px-4 py-3 text-sm bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition border border-purple-100 shadow-sm"
              placeholder="トレーニングや食事、健康に関する質問・相談をお気軽にどうぞ..."
            ></textarea>
            <div class="flex justify-end mt-2">
              <button 
                onclick="submitOpinion()" 
                class="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition shadow-sm font-medium"
              >
                <i class="fas fa-paper-plane mr-1"></i>
                送信
              </button>
            </div>
          </div>
          
          <!-- 質問履歴 -->
          ${opinions.length > 0 ? `
            <div class="space-y-4">
              <!-- 未回答の質問 -->
              ${pendingOpinions.length > 0 ? `
                <div>
                  <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i class="fas fa-hourglass-half text-orange-500"></i>
                    回答待ち（${pendingOpinions.length}件）
                  </h4>
                  <div class="space-y-2">
                    ${pendingOpinions.map(opinion => `
                      <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-orange-400">
                        <div class="flex justify-between items-start mb-1">
                          <div class="flex items-center gap-1">
                            <i class="fas fa-clock text-orange-500 text-xs"></i>
                            <span class="text-xs text-gray-500">${formatDateTime(opinion.created_at)}</span>
                          </div>
                          <span class="badge badge-warning text-xs">回答待ち</span>
                        </div>
                        <div class="bg-gray-50 p-2 rounded mb-1">
                          <p class="text-xs text-gray-800"><strong>質問:</strong> ${opinion.question}</p>
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
                  <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-500"></i>
                    回答済み（${answeredOpinions.length}件）
                  </h4>
                  <div class="space-y-2">
                    ${answeredOpinions.map(opinion => `
                      <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-green-400">
                        <div class="flex justify-between items-start mb-1">
                          <div class="flex items-center gap-1">
                            <i class="fas fa-calendar text-green-500 text-xs"></i>
                            <span class="text-xs text-gray-500">質問: ${formatDateTime(opinion.created_at)}</span>
                          </div>
                          <span class="badge badge-success text-xs">回答済み</span>
                        </div>
                        
                        <div class="bg-gray-50 p-2 rounded mb-1.5">
                          <p class="text-xs text-gray-800"><strong>質問:</strong> ${opinion.question}</p>
                        </div>
                        
                        <div class="bg-green-50 p-2 rounded border-l-2 border-green-500">
                          <div class="flex items-center gap-1 mb-1">
                            <i class="fas fa-user-nurse text-green-600 text-xs"></i>
                            <span class="text-xs font-medium text-green-700">${opinion.answered_by} からの回答:</span>
                            <span class="text-xs text-gray-500">${formatDateTime(opinion.answered_at)}</span>
                          </div>
                          <p class="text-xs text-gray-800 whitespace-pre-wrap">${opinion.answer}</p>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="bg-white p-6 rounded-xl shadow-sm text-center">
              <div class="w-14 h-14 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                <i class="fas fa-comments text-2xl text-gray-300"></i>
              </div>
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
          <div class="mb-4">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-xl font-bold text-gray-800">
                <i class="fas fa-table mr-2" style="color: var(--color-primary)"></i>
                健康ログ履歴
              </h3>
              <div class="flex gap-2">
                <button onclick="exportHealthLogs()" class="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                  <i class="fas fa-download mr-1"></i>
                  CSVエクスポート
                </button>
                <button onclick="showAddLogModal()" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
                  <i class="fas fa-plus mr-1"></i>
                  ログを追加
                </button>
              </div>
            </div>
            
            <!-- フィルター機能 -->
            <div class="bg-white p-3 rounded-lg shadow-sm flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-600">期間:</label>
                <select id="log-filter-period" onchange="filterHealthLogs()" class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">全期間</option>
                  <option value="7">過去7日</option>
                  <option value="30" selected>過去30日</option>
                  <option value="90">過去90日</option>
                </select>
              </div>
              
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-600">運動:</label>
                <select id="log-filter-exercise" onchange="filterHealthLogs()" class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">すべて</option>
                  <option value="yes">あり</option>
                  <option value="no">なし</option>
                </select>
              </div>
              
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-600">体重記録:</label>
                <select id="log-filter-weight" onchange="filterHealthLogs()" class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">すべて</option>
                  <option value="yes">あり</option>
                  <option value="no">なし</option>
                </select>
              </div>
              
              <button onclick="resetFilters()" class="ml-auto text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">
                <i class="fas fa-undo mr-1"></i>
                リセット
              </button>
              
              <div class="w-full mt-2 text-xs text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                表示中: <span id="filtered-count" class="font-bold text-primary">${healthLogs.length}</span> 件 / 全 ${healthLogs.length} 件
              </div>
            </div>
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
            健康データ推移（最新30日）
          </h3>
          
          <div class="bg-gray-50 p-5 rounded-lg">
            <div style="height: 400px;">
              <canvas id="combined-chart"></canvas>
            </div>
            
            <!-- 凡例 -->
            <div class="flex flex-wrap justify-center gap-4 mt-4">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #3b82f6;"></div>
                <span class="text-sm">体重 (kg)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #ef4444;"></div>
                <span class="text-sm">体脂肪率 (%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #8b5cf6;"></div>
                <span class="text-sm">睡眠時間 (h)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #10b981;"></div>
                <span class="text-sm">カロリー (kcal ÷ 100)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// グラフ描画（重ねたグラフ）
function renderCharts() {
  const sortedLogs = [...healthLogs].reverse().slice(-30); // 最新30日分
  const labels = sortedLogs.map(log => dayjs(log.log_date).format('M/D'));
  
  // 統合グラフ
  if (document.getElementById('combined-chart')) {
    const weightData = sortedLogs.map(log => log.weight || null);
    const bodyfatData = sortedLogs.map(log => log.body_fat_percentage || null);
    const sleepData = sortedLogs.map(log => log.sleep_hours || null);
    const caloriesData = sortedLogs.map(log => log.meal_calories ? log.meal_calories / 100 : null); // 100で割ってスケール調整
    
    const ctx = document.getElementById('combined-chart').getContext('2d');
    charts.combined = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '体重 (kg)',
            data: weightData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          },
          {
            label: '体脂肪率 (%)',
            data: bodyfatData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          },
          {
            label: '睡眠時間 (h)',
            data: sleepData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          },
          {
            label: 'カロリー (kcal ÷ 100)',
            data: caloriesData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false // 下部に独自の凡例を表示
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  // カロリーだけ100倍して表示
                  if (context.dataset.label.includes('カロリー')) {
                    label += (context.parsed.y * 100).toFixed(0);
                  } else {
                    label += context.parsed.y.toFixed(1);
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: false,
            title: {
              display: true,
              text: '値'
            }
          },
          x: {
            display: true,
            title: {
              display: true,
              text: '日付'
            }
          }
        }
      }
    });
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

// 個人データ設定セクション
function renderSettingsSection() {
  return `
    <section class="bg-gradient-to-br from-blue-50 to-white py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <h3 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-cog mr-2" style="color: var(--color-primary)"></i>
            個人データ設定
          </h3>
          
          <!-- タブナビゲーション -->
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="flex border-b border-gray-200">
              <button onclick="showSettingsTab('profile')" id="settings-tab-profile" 
                class="settings-tab flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 transition border-b-2 border-transparent">
                <i class="fas fa-user-circle mr-1"></i>
                基本情報
              </button>
              <button onclick="showSettingsTab('body')" id="settings-tab-body" 
                class="settings-tab flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 transition border-b-2 border-transparent">
                <i class="fas fa-heartbeat mr-1"></i>
                身体情報
              </button>
              ${currentUser?.auth_provider === 'email' ? `
                <button onclick="showSettingsTab('password')" id="settings-tab-password" 
                  class="settings-tab flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 transition border-b-2 border-transparent">
                  <i class="fas fa-lock mr-1"></i>
                  パスワード変更
                </button>
              ` : ''}
            </div>
            
            <div id="settings-content" class="p-4">
              <!-- コンテンツはJavaScriptで動的に表示 -->
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// 設定タブ切り替え
function showSettingsTab(tab) {
  // タブボタンのアクティブ状態を更新
  document.querySelectorAll('.settings-tab').forEach(btn => {
    btn.classList.remove('border-primary', 'text-primary');
    btn.classList.add('border-transparent', 'text-gray-600');
  });
  
  const activeTab = document.getElementById(`settings-tab-${tab}`);
  if (activeTab) {
    activeTab.classList.remove('border-transparent', 'text-gray-600');
    activeTab.classList.add('border-primary', 'text-primary');
  }
  
  // コンテンツを切り替え
  const content = document.getElementById('settings-content');
  if (tab === 'profile') {
    content.innerHTML = renderProfileSettings();
    // イベントリスナーを手動で登録
    setTimeout(() => {
      const form = document.getElementById('profile-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await updateProfile();
        });
      }
    }, 0);
  } else if (tab === 'body') {
    content.innerHTML = renderBodySettings();
    // イベントリスナーを手動で登録
    setTimeout(() => {
      const form = document.getElementById('body-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await updateProfile();
        });
      }
    }, 0);
  } else if (tab === 'password') {
    content.innerHTML = renderPasswordSettings();
    // イベントリスナーを手動で登録
    setTimeout(() => {
      const form = document.getElementById('password-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await updatePassword();
        });
      }
    }, 0);
  }
}

// 基本情報設定フォーム
function renderProfileSettings() {
  return `
    <form id="profile-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-user mr-1"></i> お名前 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="profile-name" value="${currentUser?.name || ''}" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-envelope mr-1"></i> メールアドレス <span class="text-red-500">*</span>
          </label>
          <input type="email" id="profile-email" value="${currentUser?.email || ''}" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-phone mr-1"></i> 電話番号
          </label>
          <input type="tel" id="profile-phone" value="${currentUser?.phone || ''}"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="090-1234-5678">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-birthday-cake mr-1"></i> 生年月日
          </label>
          <input type="date" id="profile-birthday" value="${currentUser?.birth_date || ''}"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-venus-mars mr-1"></i> 性別
          </label>
          <select id="profile-gender" 
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
            <option value="">選択してください</option>
            <option value="female" ${currentUser?.gender === 'female' ? 'selected' : ''}>女性</option>
            <option value="male" ${currentUser?.gender === 'male' ? 'selected' : ''}>男性</option>
            <option value="other" ${currentUser?.gender === 'other' ? 'selected' : ''}>その他</option>
          </select>
        </div>
      </div>
      
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onclick="loadAllData(); renderPage();" 
          class="px-6 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <i class="fas fa-times mr-2"></i>
          キャンセル
        </button>
        <button type="submit" 
          class="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
          <i class="fas fa-save mr-2"></i>
          保存する
        </button>
      </div>
    </form>
  `;
}

// 身体情報設定フォーム
function renderBodySettings() {
  return `
    <form id="body-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-ruler-vertical mr-1"></i> 身長 (cm)
          </label>
          <input type="number" id="body-height" value="${currentUser?.height || ''}" step="0.1" min="0" max="300"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="160.0">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-weight mr-1"></i> 体重 (kg)
          </label>
          <input type="number" id="body-weight" value="${currentUser?.weight || ''}" step="0.1" min="0" max="500"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="55.0">
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-bullseye mr-1"></i> 目標・備考
        </label>
        <textarea id="body-goal" rows="4"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="ダイエット、筋力アップ、健康維持など、あなたの目標を記入してください...">${currentUser?.goal || ''}</textarea>
      </div>
      
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onclick="loadAllData(); renderPage();" 
          class="px-6 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <i class="fas fa-times mr-2"></i>
          キャンセル
        </button>
        <button type="submit" 
          class="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
          <i class="fas fa-save mr-2"></i>
          保存する
        </button>
      </div>
    </form>
  `;
}

// パスワード変更フォーム
function renderPasswordSettings() {
  return `
    <form id="password-form" class="space-y-4 max-w-md">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div class="flex items-start gap-2">
          <i class="fas fa-info-circle text-yellow-600 mt-1"></i>
          <div class="text-sm text-yellow-800">
            <p class="font-medium mb-1">パスワード変更について</p>
            <p>セキュリティ保護のため、現在のパスワードが必要です。新しいパスワードは8文字以上を推奨します。</p>
          </div>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-lock mr-1"></i> 現在のパスワード <span class="text-red-500">*</span>
        </label>
        <input type="password" id="password-current" required
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="現在のパスワードを入力">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-key mr-1"></i> 新しいパスワード <span class="text-red-500">*</span>
        </label>
        <input type="password" id="password-new" required minlength="6"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="新しいパスワードを入力（6文字以上）">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-check-circle mr-1"></i> 新しいパスワード（確認） <span class="text-red-500">*</span>
        </label>
        <input type="password" id="password-confirm" required minlength="6"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="もう一度入力してください">
      </div>
      
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onclick="document.getElementById('password-form').reset();" 
          class="px-6 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <i class="fas fa-times mr-2"></i>
          キャンセル
        </button>
        <button type="submit" 
          class="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
          <i class="fas fa-shield-alt mr-2"></i>
          パスワードを変更
        </button>
      </div>
    </form>
  `;
}

// プロフィール更新処理
async function updateProfile() {
  try {
    // 基本情報
    const name = document.getElementById('profile-name')?.value;
    const email = document.getElementById('profile-email')?.value;
    const phone = document.getElementById('profile-phone')?.value;
    const birthday = document.getElementById('profile-birthday')?.value;
    const gender = document.getElementById('profile-gender')?.value;
    
    // 身体情報
    const height = document.getElementById('body-height')?.value;
    const weight = document.getElementById('body-weight')?.value;
    const goal = document.getElementById('body-goal')?.value;
    
    const response = await apiCall('/api/auth/profile', {
      method: 'PUT',
      data: {
        name: name || currentUser.name,
        email: email || currentUser.email,
        phone: phone || currentUser.phone || null,
        birthday: birthday || currentUser.birth_date || null,
        gender: gender || currentUser.gender || null,
        height: height ? parseFloat(height) : currentUser.height || null,
        weight: weight ? parseFloat(weight) : currentUser.weight || null,
        goal: goal || currentUser.goal || null,
      }
    });
    
    if (response.success) {
      currentUser = response.data;
      setUserData(currentUser);
      showToast('プロフィールを更新しました', 'success');
      await loadAllData();
      renderPage();
      // デフォルトタブを表示
      setTimeout(() => showSettingsTab('profile'), 100);
    }
  } catch (error) {
    showToast('更新に失敗しました', 'error');
  }
}

// パスワード変更処理
async function updatePassword() {
  try {
    const currentPassword = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password-new').value;
    const confirmPassword = document.getElementById('password-confirm').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('すべての項目を入力してください', 'warning');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast('新しいパスワードが一致しません', 'warning');
      return;
    }
    
    if (newPassword.length < 6) {
      showToast('パスワードは6文字以上にしてください', 'warning');
      return;
    }
    
    const response = await apiCall('/api/auth/password', {
      method: 'PUT',
      data: {
        currentPassword,
        newPassword,
      }
    });
    
    if (response.success) {
      showToast('パスワードを変更しました', 'success');
      document.getElementById('password-form').reset();
    }
  } catch (error) {
    showToast('パスワード変更に失敗しました', 'error');
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

// フィルター機能（新機能）
let filteredLogs = healthLogs;

function filterHealthLogs() {
  const period = document.getElementById('log-filter-period').value;
  const exercise = document.getElementById('log-filter-exercise').value;
  const weight = document.getElementById('log-filter-weight').value;
  
  filteredLogs = healthLogs.filter(log => {
    // 期間フィルター
    if (period !== 'all') {
      const logDate = dayjs(log.log_date);
      const cutoffDate = dayjs().subtract(parseInt(period), 'day');
      if (logDate.isBefore(cutoffDate)) return false;
    }
    
    // 運動フィルター
    if (exercise === 'yes' && (!log.exercise_minutes || log.exercise_minutes === 0)) return false;
    if (exercise === 'no' && log.exercise_minutes && log.exercise_minutes > 0) return false;
    
    // 体重フィルター
    if (weight === 'yes' && !log.weight) return false;
    if (weight === 'no' && log.weight) return false;
    
    return true;
  });
  
  // 表示を更新
  updateLogTable();
  updateFilterCount();
}

function resetFilters() {
  document.getElementById('log-filter-period').value = '30';
  document.getElementById('log-filter-exercise').value = 'all';
  document.getElementById('log-filter-weight').value = 'all';
  filterHealthLogs();
}

function updateFilterCount() {
  const countSpan = document.getElementById('filtered-count');
  if (countSpan) {
    countSpan.textContent = filteredLogs.length;
  }
}

function updateLogTable() {
  // テーブルのtbodyを更新
  const tbody = document.querySelector('.table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = filteredLogs.map(log => `
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
        <button onclick="editLog(${log.id})" class="text-blue-500 hover:underline text-xs mr-2">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteLog(${log.id})" class="text-red-500 hover:underline text-xs">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// CSVエクスポート機能（新機能）
function exportHealthLogs() {
  if (healthLogs.length === 0) {
    showToast('エクスポートするデータがありません', 'warning');
    return;
  }
  
  // CSVヘッダー
  const headers = ['日付', '体重(kg)', '体脂肪率(%)', '体温(℃)', '睡眠(時間)', 'カロリー(kcal)', '運動(分)', '体調評価', 'メモ'];
  
  // CSVデータ行
  const rows = filteredLogs.map(log => [
    log.log_date,
    log.weight || '',
    log.body_fat_percentage || '',
    log.body_temperature || '',
    log.sleep_hours || '',
    log.meal_calories || '',
    log.exercise_minutes || '',
    log.condition_rating || '',
    (log.condition_note || '').replace(/,/g, '、')  // カンマをエスケープ
  ]);
  
  // CSV文字列生成
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // BOM付きUTF-8でダウンロード
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `health_logs_${dayjs().format('YYYYMMDD')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('CSVファイルをダウンロードしました', 'success');
}
